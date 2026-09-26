import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import {
  aggregatePayroll,
  calculatePayroll,
  assertTransition,
  validatePeriod,
  zeroAmounts,
} from '../src/lib/payroll';

export async function requireCompany(ctx: QueryCtx | MutationCtx, companyId: Id<'companies'>) {
  const company = await ctx.db.get(companyId);
  if (!company) throw new Error('Company not found.');
  return company;
}
export function runTotals(t: ReturnType<typeof zeroAmounts>) {
  return {
    totalBasePay: t.basePay,
    totalBonuses: t.bonusTotal,
    totalReimbursements: t.reimbursementTotal,
    totalDeductions: t.deductionTotal,
    totalGrossPay: t.grossPay,
    totalNetPay: t.netPay,
  };
}
export async function periodInputs(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<'companies'>,
  month: number,
  year: number,
  runId?: Id<'payrollRuns'>,
) {
  validatePeriod(month, year);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const employees = (
    await ctx.db
      .query('employees')
      .withIndex('by_company', (q) => q.eq('companyId', companyId))
      .collect()
  ).filter((e) => e.status === 'active' && e.joiningDate <= lastDay);
  const adjustments = (
    await ctx.db
      .query('adjustments')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('effectiveYear', year).eq('effectiveMonth', month),
      )
      .collect()
  ).filter((a) => a.status === 'approved' && (!a.payrollRunId || a.payrollRunId === runId));
  const ids = new Set(employees.map((e) => e._id));
  for (const a of adjustments)
    if (!ids.has(a.employeeId))
      throw new Error('An approved adjustment targets an employee ineligible for this period.');
  const items = employees.map((e) => ({
    employee: e,
    ...calculatePayroll(
      e.baseMonthlySalary,
      adjustments.filter((a) => a.employeeId === e._id),
    ),
  }));
  return { items, totals: aggregatePayroll(items) };
}
export async function recordActivity(
  ctx: MutationCtx,
  companyId: Id<'companies'>,
  entityType: string,
  action: string,
  message: string,
  entityId?: string,
) {
  await ctx.db.insert('activityEvents', {
    companyId,
    entityType,
    action,
    message,
    ...(entityId ? { entityId } : {}),
    createdAt: Date.now(),
  });
}
export async function createDraft(
  ctx: MutationCtx,
  companyId: Id<'companies'>,
  month: number,
  year: number,
) {
  await requireCompany(ctx, companyId);
  validatePeriod(month, year);
  const existing = await ctx.db
    .query('payrollRuns')
    .withIndex('by_company_period', (q) =>
      q.eq('companyId', companyId).eq('year', year).eq('month', month),
    )
    .unique();
  if (existing)
    throw new Error('A payroll run already exists for this month. Open the existing run.');
  const id = await ctx.db.insert('payrollRuns', {
    companyId,
    month,
    year,
    status: 'draft',
    ...runTotals(zeroAmounts()),
    employeeCount: 0,
    createdAt: Date.now(),
  });
  await recordActivity(
    ctx,
    companyId,
    'payroll',
    'created',
    `Created payroll draft for ${month}/${year}.`,
    id,
  );
  return id;
}
export async function generateRun(ctx: MutationCtx, run: Doc<'payrollRuns'>) {
  assertTransition(run.status, 'calculating');
  await ctx.db.patch(run._id, { status: 'calculating' });
  const { items, totals } = await periodInputs(ctx, run.companyId, run.month, run.year, run._id);
  if (!items.length) throw new Error('No active employees are eligible for this payroll month.');
  for (const { employee, ...amounts } of items)
    await ctx.db.insert('payrollItems', {
      companyId: run.companyId,
      payrollRunId: run._id,
      employeeId: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode,
      department: employee.department,
      jobTitle: employee.jobTitle,
      ...amounts,
      status: 'calculated',
    });
  assertTransition('calculating', 'ready_for_review');
  await ctx.db.patch(run._id, {
    ...runTotals(totals),
    employeeCount: items.length,
    status: 'ready_for_review',
    calculatedAt: Date.now(),
  });
  await recordActivity(
    ctx,
    run.companyId,
    'payroll',
    'calculated',
    `Calculated payroll for ${items.length} people · ${run.month}/${run.year}.`,
    run._id,
  );
  return run._id;
}
