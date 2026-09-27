import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { adjustmentType } from './schema';
import { validatePeriod } from '../src/lib/payroll';
import { recordActivity, requireCompany, periodInputs } from './payrollService';
import { createPendingAdjustment, editableRun } from './adjustmentService';
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
  handler: async (ctx, args) => (await createPendingAdjustment(ctx, args)).id,
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
