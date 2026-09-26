import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { createDraft, generateRun, recordActivity, requireCompany } from './payrollService';
import { assertTransition } from '../src/lib/payroll';
export const list = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, { companyId }) => {
    await requireCompany(ctx, companyId);
    return ctx.db
      .query('payrollRuns')
      .withIndex('by_company_period', (q) => q.eq('companyId', companyId))
      .order('desc')
      .collect();
  },
});
export const detail = query({
  args: { companyId: v.id('companies'), runId: v.id('payrollRuns') },
  handler: async (ctx, { companyId, runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.companyId !== companyId)
      throw new Error('Payroll run not found in this company.');
    const items = await ctx.db
      .query('payrollItems')
      .withIndex('by_run', (q) => q.eq('payrollRunId', runId))
      .collect();
    return { run, items: items.sort((a, b) => a.employeeName.localeCompare(b.employeeName)) };
  },
});
export const create = mutation({
  args: { companyId: v.id('companies'), month: v.number(), year: v.number() },
  handler: async (ctx, args) => createDraft(ctx, args.companyId, args.month, args.year),
});
export const generate = mutation({
  args: { companyId: v.id('companies'), runId: v.id('payrollRuns') },
  handler: async (ctx, { companyId, runId }) => {
    await requireCompany(ctx, companyId);
    const run = await ctx.db.get(runId);
    if (!run || run.companyId !== companyId)
      throw new Error('Payroll run not found in this company.');
    return generateRun(ctx, run);
  },
});

export const approve = mutation({
  args: { companyId: v.id('companies'), runId: v.id('payrollRuns') },
  handler: async (ctx, { companyId, runId }) => {
    await requireCompany(ctx, companyId);
    const run = await ctx.db.get(runId);
    if (!run || run.companyId !== companyId)
      throw new Error('Payroll run not found in this company.');
    assertTransition(run.status, 'approved');
    await ctx.db.patch(runId, { status: 'approved', approvedAt: Date.now() });
    await recordActivity(
      ctx,
      companyId,
      'payroll',
      'approved',
      `Approved payroll for ${run.month}/${run.year} · ${run.employeeCount} people.`,
      runId,
    );
    return runId;
  },
});

export const finalize = mutation({
  args: { companyId: v.id('companies'), runId: v.id('payrollRuns') },
  handler: async (ctx, { companyId, runId }) => {
    await requireCompany(ctx, companyId);
    const run = await ctx.db.get(runId);
    if (!run || run.companyId !== companyId)
      throw new Error('Payroll run not found in this company.');
    assertTransition(run.status, 'processed');
    await ctx.db.patch(runId, { status: 'processed', processedAt: Date.now() });
    await recordActivity(
      ctx,
      companyId,
      'payroll',
      'finalized',
      `Finalized payroll record for ${run.month}/${run.year}. No payment was sent.`,
      runId,
    );
    return runId;
  },
});
