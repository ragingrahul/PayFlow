import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { AdjustmentType } from '../src/lib/payroll';
import { money, validatePeriod } from '../src/lib/payroll';
import { employeeEligibleForPeriod, recordActivity, requireCompany } from './payrollService';

export async function editableRun(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<'companies'>,
  month: number,
  year: number,
) {
  const run = await ctx.db
    .query('payrollRuns')
    .withIndex('by_company_period', (q) =>
      q.eq('companyId', companyId).eq('year', year).eq('month', month),
    )
    .unique();
  if (run && run.status !== 'draft')
    throw new Error('This payroll has already been calculated. Choose a draft or future period.');
  return run;
}

export async function createPendingAdjustment(
  ctx: MutationCtx,
  args: {
    companyId: Id<'companies'>;
    employeeId: Id<'employees'>;
    month: number;
    year: number;
    type: AdjustmentType;
    amount: number;
    title: string;
    origin?: 'direct' | 'copilot';
  },
) {
  await requireCompany(ctx, args.companyId);
  validatePeriod(args.month, args.year);
  money(args.amount);
  if (args.amount === 0) throw new Error('Adjustment must be greater than zero.');
  const title = args.title.trim();
  if (!title || title.length > 120)
    throw new Error('Provide a title between 1 and 120 characters.');
  const employee = await ctx.db.get(args.employeeId);
  if (!employee || employee.companyId !== args.companyId)
    throw new Error('Choose an employee in this company.');
  if (!employeeEligibleForPeriod(employee, args.month, args.year))
    throw new Error('Employee is not eligible in this period.');
  await editableRun(ctx, args.companyId, args.month, args.year);
  const id = await ctx.db.insert('adjustments', {
    companyId: args.companyId,
    employeeId: args.employeeId,
    type: args.type,
    amount: args.amount,
    title,
    effectiveMonth: args.month,
    effectiveYear: args.year,
    status: 'pending',
    createdAt: Date.now(),
  });
  await recordActivity(
    ctx,
    args.companyId,
    'adjustment',
    'created',
    `${args.origin === 'copilot' ? 'Confirmed Copilot proposal and submitted' : 'Submitted'} ${args.type} for ${employee.firstName} ${employee.lastName}: ${title}.`,
    id,
  );
  return { id, employee };
}
