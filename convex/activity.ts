import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireCompany } from './payrollService';

export const list = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, { companyId }) => {
    await requireCompany(ctx, companyId);
    return ctx.db
      .query('activityEvents')
      .withIndex('by_company', (q) => q.eq('companyId', companyId))
      .order('desc')
      .take(100);
  },
});
