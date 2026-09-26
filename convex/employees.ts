import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { money, validatePeriod } from '../src/lib/payroll';
import { employeeRevisions, periodNumber, salaryAt } from './compensationService';
import { periodInputs, requireCompany } from './payrollService';

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
