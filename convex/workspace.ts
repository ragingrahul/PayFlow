import { query } from './_generated/server';
export const current = query({
  args: {},
  handler: async (ctx) =>
    ctx.db
      .query('companies')
      .withIndex('by_slug', (q) => q.eq('slug', 'acme-studio'))
      .unique(),
});
