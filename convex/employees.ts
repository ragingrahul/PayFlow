import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireCompany } from './payrollService';
export const list = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, { companyId }) => {
    await requireCompany(ctx, companyId);
    return (
      await ctx.db
        .query('employees')
        .withIndex('by_company', (q) => q.eq('companyId', companyId))
        .collect()
    ).sort((a, b) => a.firstName.localeCompare(b.firstName));
  },
});
export const detail = query({
  args: { companyId: v.id('companies'), employeeId: v.string() },
  handler: async (ctx, { companyId, employeeId }) => {
    await requireCompany(ctx, companyId);
    const id = ctx.db.normalizeId('employees', employeeId);
    if (!id) return null;
    const employee = await ctx.db.get(id);
    if (!employee || employee.companyId !== companyId) return null;
    const adjustments = await ctx.db
      .query('adjustments')
      .withIndex('by_employee', (q) => q.eq('employeeId', id))
      .collect();
    const items = await ctx.db
      .query('payrollItems')
      .withIndex('by_employee', (q) => q.eq('employeeId', id))
      .collect();
    const history = await Promise.all(
      items.map(async (item) => ({ item, run: await ctx.db.get(item.payrollRunId) })),
    );
    return {
      employee,
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
