import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
const modules = import.meta.glob('../convex/**/*.ts');
async function setup() {
  const t = convexTest(schema, modules);
  const { companyId } = await t.mutation(internal.seed.demo, {});
  const people = await t.query(api.employees.list, { companyId });
  return { t, companyId, people };
}
describe('Convex payroll operations', () => {
  it('seeds 24 people and preserves demo history idempotently', async () => {
    const { t, companyId, people } = await setup();
    expect(people).toHaveLength(24);
    expect(await t.mutation(internal.seed.demo, {})).toEqual({ companyId, seeded: false });
    const runs = await t.query(api.payroll.list, { companyId });
    expect(runs).toHaveLength(2);
    expect(runs.find((r) => r.month === 8)?.employeeCount).toBe(23);
    expect(runs.find((r) => r.month === 8)?.status).toBe('processed');
  });
  it('creates September, generates exact totals, persists snapshots, and updates dashboard/activity', async () => {
    const { t, companyId, people } = await setup();
    const runId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    let result = await t.query(api.payroll.detail, { companyId, runId });
    expect(result.run.status).toBe('draft');
    expect(result.items).toHaveLength(0);
    await t.mutation(api.payroll.generate, { companyId, runId });
    result = await t.query(api.payroll.detail, { companyId, runId });
    const salaryTotal = people.reduce((sum, p) => sum + p.baseMonthlySalary, 0);
    expect(result.run).toMatchObject({
      status: 'ready_for_review',
      employeeCount: 24,
      totalBasePay: salaryTotal,
      totalBonuses: 7000000,
      totalReimbursements: 1295050,
      totalDeductions: 450000,
      totalNetPay: salaryTotal + 7845050,
    });
    expect(result.items).toHaveLength(24);
    expect(result.items.reduce((sum, i) => sum + i.netPay, 0)).toBe(result.run.totalNetPay);
    const dashboard = await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 });
    expect(dashboard.netPay).toBe(result.run.totalNetPay);
    expect(dashboard.activity.some((a) => a.action === 'calculated')).toBe(true);
    const priya = people.find((p) => p.firstName === 'Priya')!;
    const detail = await t.query(api.employees.detail, { companyId, employeeId: priya._id });
    expect(detail?.history.find((h) => h.run?.month === 8)?.item.basePay).toBe(11000000);
    expect(detail?.history.find((h) => h.run?.month === 9)?.item.basePay).toBe(11500000);
    await t.run(async (ctx) => {
      await ctx.db.patch(priya._id, { baseMonthlySalary: 999 });
    });
    expect((await t.query(api.payroll.detail, { companyId, runId })).run.totalNetPay).toBe(
      result.run.totalNetPay,
    );
  });
  it('rejects duplicate runs, invalid months, and repeated generation', async () => {
    const { t, companyId } = await setup();
    await expect(
      t.mutation(api.payroll.create, { companyId, month: 13, year: 2026 }),
    ).rejects.toThrow('Month');
    await expect(
      t.mutation(api.payroll.create, { companyId, month: 8, year: 2026 }),
    ).rejects.toThrow('already exists');
    const runs = await t.query(api.payroll.list, { companyId });
    await expect(
      t.mutation(api.payroll.generate, { companyId, runId: runs.find((r) => r.month === 8)!._id }),
    ).rejects.toThrow('transition');
  });
  it('only one concurrent creation wins', async () => {
    const { t, companyId } = await setup();
    const results = await Promise.allSettled([
      t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 }),
      t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await t.query(api.payroll.list, { companyId })).filter((r) => r.month === 9),
    ).toHaveLength(1);
  });
  it('validates approved adjustments and rolls back negative projections', async () => {
    const { t, companyId, people } = await setup();
    const args = {
      companyId,
      employeeId: people[0]._id,
      month: 9,
      year: 2026,
      type: 'bonus' as const,
      amount: 2000050,
      title: 'Performance bonus',
    };
    const before = await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 });
    await t.mutation(api.adjustments.create, args);
    const after = await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 });
    expect(after.netPay - before.netPay).toBe(2000050);
    await expect(t.mutation(api.adjustments.create, { ...args, amount: -1 })).rejects.toThrow();
    await expect(
      t.mutation(api.adjustments.create, { ...args, type: 'deduction', amount: 999999999 }),
    ).rejects.toThrow('Net pay');
    expect((await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 })).netPay).toBe(
      after.netPay,
    );
  });
  it('rejects late adjustments against a calculated snapshot', async () => {
    const { t, companyId, people } = await setup();
    await expect(
      t.mutation(api.adjustments.create, {
        companyId,
        employeeId: people[0]._id,
        month: 8,
        year: 2026,
        type: 'bonus',
        amount: 100,
        title: 'Late bonus',
      }),
    ).rejects.toThrow('already been calculated');
  });
  it('does not cross company boundaries', async () => {
    const { t, companyId, people } = await setup();
    const other = await t.run((ctx) =>
      ctx.db.insert('companies', {
        name: 'Other',
        slug: 'other',
        currency: 'INR',
        country: 'IN',
        createdAt: Date.now(),
      }),
    );
    expect(
      await t.query(api.employees.detail, { companyId: other, employeeId: people[0]._id }),
    ).toBeNull();
    await expect(
      t.mutation(api.adjustments.create, {
        companyId: other,
        employeeId: people[0]._id,
        month: 9,
        year: 2026,
        type: 'bonus',
        amount: 100,
        title: 'Cross company',
      }),
    ).rejects.toThrow('active employee');
    const runs = await t.query(api.payroll.list, { companyId });
    await expect(
      t.mutation(api.payroll.generate, { companyId: other, runId: runs[0]._id }),
    ).rejects.toThrow('not found');
  });
  it('rejects missing companies and malformed employee IDs', async () => {
    const { t, companyId } = await setup();
    expect(await t.query(api.employees.detail, { companyId, employeeId: 'broken' })).toBeNull();
    const id = await t.run(async (ctx) => {
      const id = await ctx.db.insert('companies', {
        name: 'Deleted',
        slug: 'deleted',
        currency: 'INR',
        country: 'IN',
        createdAt: 0,
      });
      await ctx.db.delete(id);
      return id;
    });
    await expect(
      t.mutation(api.payroll.create, { companyId: id, month: 9, year: 2026 }),
    ).rejects.toThrow('Company not found');
  });
  it('failed generation leaves a clean draft', async () => {
    const { t, companyId, people } = await setup();
    const runId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    await t.run((ctx) => ctx.db.patch(people[0]._id, { baseMonthlySalary: -1 }));
    await expect(t.mutation(api.payroll.generate, { companyId, runId })).rejects.toThrow(
      'Base salary',
    );
    const result = await t.query(api.payroll.detail, { companyId, runId });
    expect(result.run.status).toBe('draft');
    expect(result.items).toHaveLength(0);
    expect(result.run.totalNetPay).toBe(0);
  });
  it('excludes inactive and future employees, and detects invalid adjustment targets', async () => {
    const { t, companyId, people } = await setup();
    const employee = people.find((p) => p.firstName === 'Tara')!;
    await t.run((ctx) => ctx.db.patch(employee._id, { status: 'inactive' }));
    const runId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    await t.mutation(api.payroll.generate, { companyId, runId });
    expect((await t.query(api.payroll.detail, { companyId, runId })).items).toHaveLength(23);
    const aug = people.find((p) => p.firstName === 'Anika')!;
    await expect(
      t.mutation(api.adjustments.create, {
        companyId,
        employeeId: aug._id,
        month: 7,
        year: 2026,
        type: 'bonus',
        amount: 100,
        title: 'Too early',
      }),
    ).rejects.toThrow('has not joined');
  });
  it('refuses empty payroll and deleted employee adjustment targets', async () => {
    const { t, companyId, people } = await setup();
    const emptyId = await t.mutation(api.payroll.create, { companyId, month: 1, year: 2000 });
    await expect(t.mutation(api.payroll.generate, { companyId, runId: emptyId })).rejects.toThrow(
      'No active',
    );
    const a = people.find((p) => p.firstName === 'Ananya')!;
    await t.run((ctx) => ctx.db.delete(a._id));
    const runId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    await expect(t.mutation(api.payroll.generate, { companyId, runId })).rejects.toThrow(
      'ineligible',
    );
    await expect(
      t.mutation(api.adjustments.create, {
        companyId,
        employeeId: a._id as Id<'employees'>,
        month: 9,
        year: 2026,
        type: 'bonus',
        amount: 1,
        title: 'Missing',
      }),
    ).rejects.toThrow('active employee');
  });
});
