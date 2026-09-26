import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { adjustmentType } from './schema';
import { money, validatePeriod } from '../src/lib/payroll';
import { recordActivity, requireCompany, periodInputs } from './payrollService';

async function editableRun(
  ctx: Parameters<typeof requireCompany>[0],
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
export const list = query({
  args: { companyId: v.id('companies'), month: v.number(), year: v.number() },
  handler: async (ctx, { companyId, month, year }) => {
    await requireCompany(ctx, companyId);
    validatePeriod(month, year);
    const entries = await ctx.db
      .query('adjustments')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('effectiveYear', year).eq('effectiveMonth', month),
      )
      .collect();
    return Promise.all(
      entries.map(async (a) => {
        const e = await ctx.db.get(a.employeeId);
        return { ...a, employeeName: e ? `${e.firstName} ${e.lastName}` : 'Unknown employee' };
      }),
    );
  },
});
// Direct HR entry only. A future AI entry point must require a validated approval record.
export const create = mutation({
  args: {
    companyId: v.id('companies'),
    employeeId: v.id('employees'),
    month: v.number(),
    year: v.number(),
    type: adjustmentType,
    amount: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    validatePeriod(args.month, args.year);
    money(args.amount);
    if (args.amount === 0) throw new Error('Adjustment must be greater than zero.');
    const title = args.title.trim();
    if (!title || title.length > 120)
      throw new Error('Provide a title between 1 and 120 characters.');
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.companyId !== args.companyId || employee.status !== 'active')
      throw new Error('Choose an active employee in this company.');
    const lastDay = new Date(Date.UTC(args.year, args.month, 0)).toISOString().slice(0, 10);
    if (employee.joiningDate > lastDay) throw new Error('Employee has not joined in this period.');
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
      `Submitted ${args.type} for ${employee.firstName} ${employee.lastName}: ${title}.`,
      id,
    );
    return id;
  },
});

const reviewArgs = {
  companyId: v.id('companies'),
  adjustmentId: v.id('adjustments'),
  note: v.optional(v.string()),
};

export const approve = mutation({
  args: reviewArgs,
  handler: async (ctx, { companyId, adjustmentId, note }) => {
    await requireCompany(ctx, companyId);
    const adjustment = await ctx.db.get(adjustmentId);
    if (!adjustment || adjustment.companyId !== companyId) throw new Error('Adjustment not found.');
    if (adjustment.status !== 'pending')
      throw new Error('Only pending adjustments can be approved.');
    const run = await editableRun(
      ctx,
      companyId,
      adjustment.effectiveMonth,
      adjustment.effectiveYear,
    );
    const reviewNote = note?.trim();
    if (reviewNote && reviewNote.length > 240) throw new Error('Review note is too long.');
    await ctx.db.patch(adjustmentId, {
      status: 'approved',
      reviewedAt: Date.now(),
      ...(reviewNote ? { reviewNote } : {}),
    });
    await periodInputs(
      ctx,
      companyId,
      adjustment.effectiveMonth,
      adjustment.effectiveYear,
      run?._id,
    );
    const employee = await ctx.db.get(adjustment.employeeId);
    await recordActivity(
      ctx,
      companyId,
      'adjustment',
      'approved',
      `Approved ${adjustment.type} for ${employee ? `${employee.firstName} ${employee.lastName}` : 'an employee'}: ${adjustment.title}.`,
      adjustmentId,
    );
    return adjustmentId;
  },
});

export const reject = mutation({
  args: reviewArgs,
  handler: async (ctx, { companyId, adjustmentId, note }) => {
    await requireCompany(ctx, companyId);
    const adjustment = await ctx.db.get(adjustmentId);
    if (!adjustment || adjustment.companyId !== companyId) throw new Error('Adjustment not found.');
    if (adjustment.status !== 'pending')
      throw new Error('Only pending adjustments can be rejected.');
    const reviewNote = note?.trim();
    if (reviewNote && reviewNote.length > 240) throw new Error('Review note is too long.');
    await ctx.db.patch(adjustmentId, {
      status: 'rejected',
      reviewedAt: Date.now(),
      ...(reviewNote ? { reviewNote } : {}),
    });
    await recordActivity(
      ctx,
      companyId,
      'adjustment',
      'rejected',
      `Rejected ${adjustment.type}: ${adjustment.title}.`,
      adjustmentId,
    );
    return adjustmentId;
  },
});
