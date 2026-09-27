import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { money, validatePeriod } from '../src/lib/payroll';
import { employeeRevisions, periodNumber, salaryAt } from './compensationService';
import {
  employeeEligibleForPeriod,
  periodInputs,
  recordActivity,
  requireCompany,
} from './payrollService';

const employmentType = v.union(
  v.literal('full_time'),
  v.literal('part_time'),
  v.literal('contractor'),
);

function text(value: string, label: string, minimum: number, maximum: number) {
  const result = value.trim();
  if (result.length < minimum || result.length > maximum)
    throw new Error(`${label} must be between ${minimum} and ${maximum} characters.`);
  return result;
}

function employeeCode(value: string) {
  const result = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,24}$/.test(result))
    throw new Error('Employee code must use 2–24 letters, numbers, or hyphens.');
  return result;
}

function emailAddress(value: string) {
  const result = value.trim().toLowerCase();
  if (result.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw new Error('Enter a valid employee email address.');
  return result;
}

function isoDate(value: string, label: string) {
  const result = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${label} must be a valid date.`);
  const parsed = new Date(`${result}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result)
    throw new Error(`${label} must be a valid date.`);
  return result;
}

async function ensureIdentityUnique(
  ctx: MutationCtx,
  companyId: Id<'companies'>,
  code: string,
  email: string,
  excludeId?: Id<'employees'>,
) {
  const byCode = await ctx.db
    .query('employees')
    .withIndex('by_company_code', (q) => q.eq('companyId', companyId).eq('employeeCode', code))
    .unique();
  if (byCode && byCode._id !== excludeId) throw new Error('Employee code already exists.');
  const employees = await ctx.db
    .query('employees')
    .withIndex('by_company', (q) => q.eq('companyId', companyId))
    .collect();
  if (employees.some((employee) => employee._id !== excludeId && employee.email === email))
    throw new Error('Employee email already exists.');
}

async function protectCalculatedEligibility(
  ctx: MutationCtx,
  companyId: Id<'companies'>,
  before: Pick<Doc<'employees'>, 'joiningDate' | 'leavingDate' | 'status'> | null,
  after: Pick<Doc<'employees'>, 'joiningDate' | 'leavingDate' | 'status'>,
) {
  const runs = await ctx.db
    .query('payrollRuns')
    .withIndex('by_company_period', (q) => q.eq('companyId', companyId))
    .collect();
  const changesSnapshot = runs.some(
    (run) =>
      run.status !== 'draft' &&
      (before ? employeeEligibleForPeriod(before, run.month, run.year) : false) !==
        employeeEligibleForPeriod(after, run.month, run.year),
  );
  if (changesSnapshot)
    throw new Error(
      'This lifecycle change would alter a calculated payroll. Choose a later effective date.',
    );
}

function requestedPeriod(month?: number, year?: number) {
  const now = new Date();
  const selected = { month: month ?? now.getUTCMonth() + 1, year: year ?? now.getUTCFullYear() };
  validatePeriod(selected.month, selected.year);
  return selected;
}

export const list = query({
  args: {
    companyId: v.id('companies'),
    month: v.optional(v.number()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { companyId, month, year }) => {
    await requireCompany(ctx, companyId);
    const period = requestedPeriod(month, year);
    const employees = await ctx.db
      .query('employees')
      .withIndex('by_company', (q) => q.eq('companyId', companyId))
      .collect();
    return Promise.all(
      employees
        .sort((a, b) => a.firstName.localeCompare(b.firstName))
        .map(async (employee) => ({
          ...employee,
          currentMonthlySalary: salaryAt(
            employee,
            await employeeRevisions(ctx, employee._id),
            period.month,
            period.year,
          ),
        })),
    );
  },
});

export const detail = query({
  args: {
    companyId: v.id('companies'),
    employeeId: v.string(),
    month: v.optional(v.number()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { companyId, employeeId, month, year }) => {
    await requireCompany(ctx, companyId);
    const period = requestedPeriod(month, year);
    const id = ctx.db.normalizeId('employees', employeeId);
    if (!id) return null;
    const employee = await ctx.db.get(id);
    if (!employee || employee.companyId !== companyId) return null;
    const adjustments = await ctx.db
      .query('adjustments')
      .withIndex('by_employee', (q) => q.eq('employeeId', id))
      .collect();
    const revisions = await employeeRevisions(ctx, id);
    const items = await ctx.db
      .query('payrollItems')
      .withIndex('by_employee', (q) => q.eq('employeeId', id))
      .collect();
    const history = await Promise.all(
      items.map(async (item) => ({ item, run: await ctx.db.get(item.payrollRunId) })),
    );
    return {
      employee: {
        ...employee,
        currentMonthlySalary: salaryAt(employee, revisions, period.month, period.year),
      },
      compensationRevisions: revisions.sort(
        (a, b) =>
          periodNumber(b.effectiveMonth, b.effectiveYear) -
          periodNumber(a.effectiveMonth, a.effectiveYear),
      ),
      adjustments: adjustments.sort((a, b) => b.createdAt - a.createdAt),
      history: history.sort(
        (a, b) =>
          (b.run?.year ?? 0) * 12 +
          (b.run?.month ?? 0) -
          ((a.run?.year ?? 0) * 12 + (a.run?.month ?? 0)),
      ),
    };
  },
});

export const create = mutation({
  args: {
    companyId: v.id('companies'),
    employeeCode: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    department: v.string(),
    jobTitle: v.string(),
    employmentType,
    joiningDate: v.string(),
    monthlySalary: v.number(),
  },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    const code = employeeCode(args.employeeCode);
    const email = emailAddress(args.email);
    const firstName = text(args.firstName, 'First name', 1, 60);
    const lastName = text(args.lastName, 'Last name', 1, 60);
    const department = text(args.department, 'Department', 2, 80);
    const jobTitle = text(args.jobTitle, 'Job title', 2, 100);
    const joiningDate = isoDate(args.joiningDate, 'Joining date');
    money(args.monthlySalary, 'Monthly compensation');
    if (!args.monthlySalary) throw new Error('Monthly compensation must be greater than zero.');
    await ensureIdentityUnique(ctx, args.companyId, code, email);
    const lifecycle = { joiningDate, status: 'active' as const };
    await protectCalculatedEligibility(ctx, args.companyId, null, lifecycle);
    const now = Date.now();
    const id = await ctx.db.insert('employees', {
      companyId: args.companyId,
      employeeCode: code,
      firstName,
      lastName,
      email,
      department,
      jobTitle,
      employmentType: args.employmentType,
      joiningDate,
      status: 'active',
      baseMonthlySalary: args.monthlySalary,
      currency: 'INR',
      createdAt: now,
    });
    const [effectiveYear, effectiveMonth] = joiningDate.split('-').map(Number);
    await ctx.db.insert('compensationRevisions', {
      companyId: args.companyId,
      employeeId: id,
      monthlySalary: args.monthlySalary,
      effectiveMonth,
      effectiveYear,
      reason: 'Starting compensation',
      createdAt: now,
    });
    await recordActivity(
      ctx,
      args.companyId,
      'employee',
      'created',
      `Added ${firstName} ${lastName} (${code}) to ${department}.`,
      id,
    );
    return id;
  },
});

export const updateProfile = mutation({
  args: {
    companyId: v.id('companies'),
    employeeId: v.id('employees'),
    employeeCode: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    department: v.string(),
    jobTitle: v.string(),
    employmentType,
    joiningDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.companyId !== args.companyId)
      throw new Error('Employee not found in this company.');
    const code = employeeCode(args.employeeCode);
    const email = emailAddress(args.email);
    const joiningDate = isoDate(args.joiningDate, 'Joining date');
    const nextLifecycle = {
      joiningDate,
      leavingDate: employee.leavingDate,
      status: employee.status,
    };
    await protectCalculatedEligibility(ctx, args.companyId, employee, nextLifecycle);
    await ensureIdentityUnique(ctx, args.companyId, code, email, args.employeeId);
    const firstName = text(args.firstName, 'First name', 1, 60);
    const lastName = text(args.lastName, 'Last name', 1, 60);
    await ctx.db.patch(args.employeeId, {
      employeeCode: code,
      firstName,
      lastName,
      email,
      department: text(args.department, 'Department', 2, 80),
      jobTitle: text(args.jobTitle, 'Job title', 2, 100),
      employmentType: args.employmentType,
      joiningDate,
    });
    await recordActivity(
      ctx,
      args.companyId,
      'employee',
      'profile_updated',
      `Updated ${firstName} ${lastName}’s employee profile.`,
      args.employeeId,
    );
    return args.employeeId;
  },
});

export const deactivate = mutation({
  args: {
    companyId: v.id('companies'),
    employeeId: v.id('employees'),
    leavingDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.companyId !== args.companyId)
      throw new Error('Employee not found in this company.');
    if (employee.status === 'inactive') throw new Error('Employee is already inactive.');
    const leavingDate = isoDate(args.leavingDate, 'Leaving date');
    if (leavingDate < employee.joiningDate)
      throw new Error('Leaving date cannot be before the joining date.');
    const nextLifecycle = {
      joiningDate: employee.joiningDate,
      leavingDate,
      status: 'inactive' as const,
    };
    await protectCalculatedEligibility(ctx, args.companyId, employee, nextLifecycle);
    await ctx.db.patch(args.employeeId, { status: 'inactive', leavingDate });
    await recordActivity(
      ctx,
      args.companyId,
      'employee',
      'deactivated',
      `Scheduled ${employee.firstName} ${employee.lastName}’s employment end for ${leavingDate}.`,
      args.employeeId,
    );
    return args.employeeId;
  },
});

export const reactivate = mutation({
  args: { companyId: v.id('companies'), employeeId: v.id('employees') },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.companyId !== args.companyId)
      throw new Error('Employee not found in this company.');
    if (employee.status === 'active' && !employee.leavingDate)
      throw new Error('Employee is already active.');
    const nextLifecycle = { joiningDate: employee.joiningDate, status: 'active' as const };
    await protectCalculatedEligibility(ctx, args.companyId, employee, nextLifecycle);
    await ctx.db.patch(args.employeeId, { status: 'active', leavingDate: undefined });
    await recordActivity(
      ctx,
      args.companyId,
      'employee',
      'reactivated',
      `Reactivated ${employee.firstName} ${employee.lastName}.`,
      args.employeeId,
    );
    return args.employeeId;
  },
});

export const reviseCompensation = mutation({
  args: {
    companyId: v.id('companies'),
    employeeId: v.id('employees'),
    monthlySalary: v.number(),
    effectiveMonth: v.number(),
    effectiveYear: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    validatePeriod(args.effectiveMonth, args.effectiveYear);
    money(args.monthlySalary, 'Monthly salary');
    if (args.monthlySalary === 0) throw new Error('Monthly salary must be greater than zero.');
    const reason = args.reason.trim();
    if (reason.length < 3 || reason.length > 160)
      throw new Error('Provide a reason between 3 and 160 characters.');
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.companyId !== args.companyId)
      throw new Error('Employee not found in this company.');
    const target = periodNumber(args.effectiveMonth, args.effectiveYear);
    const [joiningYear, joiningMonth] = employee.joiningDate.split('-').map(Number);
    if (target < periodNumber(joiningMonth, joiningYear))
      throw new Error('Salary cannot take effect before the employee joined.');
    if (!employeeEligibleForPeriod(employee, args.effectiveMonth, args.effectiveYear))
      throw new Error('Employee is not eligible in the effective payroll period.');
    const runs = await ctx.db
      .query('payrollRuns')
      .withIndex('by_company_period', (q) => q.eq('companyId', args.companyId))
      .collect();
    if (runs.some((run) => periodNumber(run.month, run.year) >= target && run.status !== 'draft'))
      throw new Error(
        'This change would alter a calculated payroll. Choose a later effective month.',
      );
    const revisions = await employeeRevisions(ctx, args.employeeId);
    if (
      revisions.some(
        (revision) =>
          revision.effectiveMonth === args.effectiveMonth &&
          revision.effectiveYear === args.effectiveYear,
      )
    )
      throw new Error('A salary revision already exists for this effective month.');
    const previousSalary = salaryAt(employee, revisions, args.effectiveMonth, args.effectiveYear);
    const id = await ctx.db.insert('compensationRevisions', {
      companyId: args.companyId,
      employeeId: args.employeeId,
      monthlySalary: args.monthlySalary,
      effectiveMonth: args.effectiveMonth,
      effectiveYear: args.effectiveYear,
      reason,
      createdAt: Date.now(),
    });
    const targetRun = runs.find(
      (run) => run.month === args.effectiveMonth && run.year === args.effectiveYear,
    );
    await periodInputs(
      ctx,
      args.companyId,
      args.effectiveMonth,
      args.effectiveYear,
      targetRun?._id,
    );
    const now = new Date();
    const currentPeriod = periodNumber(now.getUTCMonth() + 1, now.getUTCFullYear());
    if (target <= currentPeriod) {
      const inserted = await ctx.db.get(id);
      await ctx.db.patch(args.employeeId, {
        baseMonthlySalary: salaryAt(
          employee,
          inserted ? [...revisions, inserted] : revisions,
          now.getUTCMonth() + 1,
          now.getUTCFullYear(),
        ),
      });
    }
    await ctx.db.insert('activityEvents', {
      companyId: args.companyId,
      entityType: 'employee',
      entityId: args.employeeId,
      action: 'salary_revised',
      message: `Scheduled ${employee.firstName} ${employee.lastName}’s monthly salary change for ${args.effectiveMonth}/${args.effectiveYear}.`,
      metadata: {
        previousAmount: previousSalary,
        newAmount: args.monthlySalary,
        month: args.effectiveMonth,
        year: args.effectiveYear,
      },
      createdAt: Date.now(),
    });
    return id;
  },
});
