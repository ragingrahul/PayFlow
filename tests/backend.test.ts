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
    expect(await t.mutation(internal.migrations.milestone2, {})).toEqual({
      companies: 1,
      inserted: 0,
      updated: 0,
    });
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
  it('keeps new adjustments pending, approves safely, and rejects invalid projections', async () => {
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
    const adjustmentId = await t.mutation(api.adjustments.create, args);
    const pending = await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 });
    expect(pending.netPay).toBe(before.netPay);
    expect(pending.adjustments.find((item) => item._id === adjustmentId)?.status).toBe('pending');
    await t.mutation(api.adjustments.approve, { companyId, adjustmentId, note: 'Checked' });
    const after = await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 });
    expect(after.netPay - before.netPay).toBe(2000050);
    await expect(t.mutation(api.adjustments.approve, { companyId, adjustmentId })).rejects.toThrow(
      'Only pending',
    );
    await expect(t.mutation(api.adjustments.create, { ...args, amount: -1 })).rejects.toThrow();
    const unsafeId = await t.mutation(api.adjustments.create, {
      ...args,
      type: 'deduction',
      amount: 999999999,
      title: 'Unsafe deduction',
    });
    await expect(
      t.mutation(api.adjustments.approve, { companyId, adjustmentId: unsafeId }),
    ).rejects.toThrow('Net pay');
    const entries = await t.query(api.adjustments.list, { companyId, month: 9, year: 2026 });
    expect(entries.find((item) => item._id === unsafeId)?.status).toBe('pending');
    expect((await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 })).netPay).toBe(
      after.netPay,
    );
  });
  it('rejects a pending adjustment without changing payroll', async () => {
    const { t, companyId, people } = await setup();
    const before = await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 });
    const adjustmentId = await t.mutation(api.adjustments.create, {
      companyId,
      employeeId: people[0]._id,
      month: 9,
      year: 2026,
      type: 'bonus',
      amount: 50000,
      title: 'Not approved',
    });
    await t.mutation(api.adjustments.reject, {
      companyId,
      adjustmentId,
      note: 'Insufficient evidence',
    });
    const after = await t.query(api.dashboard.summary, { companyId, month: 9, year: 2026 });
    expect(after.netPay).toBe(before.netPay);
    expect(after.adjustments.find((item) => item._id === adjustmentId)?.status).toBe('rejected');
    const staleId = await t.mutation(api.adjustments.create, {
      companyId,
      employeeId: people[0]._id,
      month: 9,
      year: 2026,
      type: 'bonus',
      amount: 50000,
      title: 'Stale pending entry',
    });
    const runId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    await t.mutation(api.payroll.generate, { companyId, runId });
    await expect(
      t.mutation(api.adjustments.approve, { companyId, adjustmentId: staleId }),
    ).rejects.toThrow('already been calculated');
    await expect(
      t.mutation(api.adjustments.reject, { companyId, adjustmentId: staleId }),
    ).resolves.toBe(staleId);
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
    ).rejects.toThrow('employee in this company');
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
    await t.run(async (ctx) => {
      const revision = await ctx.db
        .query('compensationRevisions')
        .withIndex('by_employee_period', (q) => q.eq('employeeId', people[0]._id))
        .first();
      await ctx.db.patch(revision!._id, { monthlySalary: -1 });
    });
    await expect(t.mutation(api.payroll.generate, { companyId, runId })).rejects.toThrow(
      'Monthly salary',
    );
    const result = await t.query(api.payroll.detail, { companyId, runId });
    expect(result.run.status).toBe('draft');
    expect(result.items).toHaveLength(0);
    expect(result.run.totalNetPay).toBe(0);
  });
  it('uses effective-dated salary revisions and protects calculated periods', async () => {
    const { t, companyId, people } = await setup();
    const priya = people.find((person) => person.firstName === 'Priya')!;
    await expect(
      t.mutation(api.employees.reviseCompensation, {
        companyId,
        employeeId: priya._id,
        monthlySalary: 10000000,
        effectiveMonth: 1,
        effectiveYear: 2024,
        reason: 'Before joining',
      }),
    ).rejects.toThrow('before the employee joined');
    const before = await t.query(api.dashboard.summary, { companyId, month: 10, year: 2026 });
    await t.mutation(api.employees.reviseCompensation, {
      companyId,
      employeeId: priya._id,
      monthlySalary: 12000000,
      effectiveMonth: 10,
      effectiveYear: 2026,
      reason: 'Annual review',
    });
    const after = await t.query(api.dashboard.summary, { companyId, month: 10, year: 2026 });
    expect(after.netPay - before.netPay).toBe(500000);
    const october = (await t.query(api.payroll.list, { companyId })).find(
      (run) => run.month === 10 && run.year === 2026,
    )!;
    await t.mutation(api.payroll.generate, { companyId, runId: october._id });
    const detail = await t.query(api.payroll.detail, { companyId, runId: october._id });
    expect(detail.items.find((item) => item.employeeId === priya._id)?.basePay).toBe(12000000);
    await expect(
      t.mutation(api.employees.reviseCompensation, {
        companyId,
        employeeId: priya._id,
        monthlySalary: 12500000,
        effectiveMonth: 10,
        effectiveYear: 2026,
        reason: 'Late edit',
      }),
    ).rejects.toThrow('calculated payroll');
  });
  it('approves and finalizes payroll only through adjacent transitions', async () => {
    const { t, companyId } = await setup();
    const runId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    await expect(t.mutation(api.payroll.approve, { companyId, runId })).rejects.toThrow(
      'transition',
    );
    await t.mutation(api.payroll.generate, { companyId, runId });
    await t.mutation(api.payroll.approve, { companyId, runId });
    expect((await t.query(api.payroll.detail, { companyId, runId })).run.status).toBe('approved');
    await t.mutation(api.payroll.finalize, { companyId, runId });
    const result = await t.query(api.payroll.detail, { companyId, runId });
    expect(result.run.status).toBe('processed');
    expect(result.run.processedAt).toEqual(expect.any(Number));
    await expect(t.mutation(api.payroll.finalize, { companyId, runId })).rejects.toThrow(
      'transition',
    );
    const activity = await t.query(api.activity.list, { companyId });
    expect(activity.some((event) => event.action === 'approved')).toBe(true);
    expect(activity.some((event) => event.action === 'finalized')).toBe(true);
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
    ).rejects.toThrow('not eligible');
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
    ).rejects.toThrow('employee');
  });
  it('previews employee and department raises without changing source data', async () => {
    const { t, companyId, people } = await setup();
    const priya = people.find((person) => person.firstName === 'Priya')!;
    const employeePreview = await t.query(api.scenarios.preview, {
      companyId,
      month: 9,
      year: 2026,
      targetType: 'employee',
      employeeId: priya._id,
      raiseBasisPoints: 1000,
    });
    expect(employeePreview).toMatchObject({
      subjectLabel: 'Priya Nair',
      affectedEmployeeCount: 1,
      basePayChange: 1150000,
      netPayChange: 1150000,
      annualNetPayChange: 13800000,
    });
    expect(employeePreview.items[0]).toMatchObject({
      baselineBasePay: 11500000,
      projectedBasePay: 12650000,
      baselineNetPay: 11820000,
      projectedNetPay: 12970000,
    });
    const departmentPreview = await t.query(api.scenarios.preview, {
      companyId,
      month: 9,
      year: 2026,
      targetType: 'department',
      department: 'Engineering',
      raiseBasisPoints: 500,
    });
    expect(departmentPreview.affectedEmployeeCount).toBe(8);
    expect(departmentPreview.netPayChange).toBe(departmentPreview.basePayChange);
    expect(await t.query(api.scenarios.list, { companyId, month: 9, year: 2026 })).toEqual([]);
  });
  it('saves stable scenario snapshots and discards them without touching payroll', async () => {
    const { t, companyId, people } = await setup();
    const priya = people.find((person) => person.firstName === 'Priya')!;
    const runsBefore = await t.query(api.payroll.list, { companyId });
    const revisionsBefore = await t.run((ctx) => ctx.db.query('compensationRevisions').collect());
    const scenarioId = await t.mutation(api.scenarios.create, {
      companyId,
      name: 'Engineering market adjustment',
      month: 9,
      year: 2026,
      targetType: 'employee',
      employeeId: priya._id,
      raiseBasisPoints: 750,
    });
    const saved = await t.query(api.scenarios.detail, { companyId, scenarioId });
    expect(saved.scenario.netPayChange).toBe(862500);
    expect(saved.items).toHaveLength(1);
    await t.run(async (ctx) => {
      const revision = await ctx.db
        .query('compensationRevisions')
        .withIndex('by_employee_period', (q) => q.eq('employeeId', priya._id))
        .order('desc')
        .first();
      await ctx.db.patch(revision!._id, { monthlySalary: 13000000 });
    });
    expect(
      (await t.query(api.scenarios.detail, { companyId, scenarioId })).scenario.netPayChange,
    ).toBe(862500);
    await t.mutation(api.scenarios.discard, { companyId, scenarioId });
    expect(await t.query(api.scenarios.list, { companyId, month: 9, year: 2026 })).toEqual([]);
    expect(await t.query(api.payroll.list, { companyId })).toEqual(runsBefore);
    expect((await t.run((ctx) => ctx.db.query('compensationRevisions').collect())).length).toBe(
      revisionsBefore.length,
    );
    const activity = await t.query(api.activity.list, { companyId });
    expect(activity.some((event) => event.action === 'saved')).toBe(true);
    expect(activity.some((event) => event.action === 'discarded')).toBe(true);
  });
  it('validates scenario targets, names, percentages, and company boundaries', async () => {
    const { t, companyId, people } = await setup();
    const other = await t.run((ctx) =>
      ctx.db.insert('companies', {
        name: 'Other',
        slug: 'scenario-other',
        currency: 'INR',
        country: 'IN',
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.query(api.scenarios.preview, {
        companyId,
        month: 9,
        year: 2026,
        targetType: 'employee',
        employeeId: people[0]._id,
        raiseBasisPoints: 0,
      }),
    ).rejects.toThrow('Raise');
    await expect(
      t.query(api.scenarios.preview, {
        companyId,
        month: 9,
        year: 2026,
        targetType: 'department',
        department: 'Missing',
        raiseBasisPoints: 100,
      }),
    ).rejects.toThrow('no eligible');
    await expect(
      t.mutation(api.scenarios.create, {
        companyId,
        name: 'x',
        month: 9,
        year: 2026,
        targetType: 'employee',
        employeeId: people[0]._id,
        raiseBasisPoints: 100,
      }),
    ).rejects.toThrow('scenario name');
    const scenarioId = await t.mutation(api.scenarios.create, {
      companyId,
      name: 'Valid scenario',
      month: 9,
      year: 2026,
      targetType: 'employee',
      employeeId: people[0]._id,
      raiseBasisPoints: 100,
    });
    await expect(t.query(api.scenarios.detail, { companyId: other, scenarioId })).rejects.toThrow(
      'not found',
    );
  });
  it('persists a Copilot proposal and only creates a pending adjustment after confirmation', async () => {
    const { t, companyId, people } = await setup();
    const employee = people[0];
    const before = await t.query(api.dashboard.summary, { companyId, month: 10, year: 2026 });
    const saved = await t.mutation(api.copilot.recordTurn, {
      companyId,
      month: 10,
      year: 2026,
      provider: 'openai',
      userText: `Give ${employee.firstName} a ₹12,500 bonus this month.`,
      assistantText: 'I prepared a bonus proposal for your review.',
      proposal: {
        employeeId: employee._id,
        adjustmentType: 'bonus',
        amount: 1250000,
        title: 'Customer launch bonus',
        rationale: 'Matches the requested one-time performance reward.',
      },
    });
    expect(saved.proposalId).toBeDefined();
    const conversation = await t.query(api.copilot.conversation, {
      companyId,
      threadId: saved.threadId,
    });
    expect(conversation.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(conversation.proposals[0]).toMatchObject({
      status: 'pending',
      employeeId: employee._id,
      amount: 1250000,
      baselineNetPay: before.netPay,
      projectedNetPay: before.netPay + 1250000,
    });
    expect(
      (await t.query(api.dashboard.summary, { companyId, month: 10, year: 2026 })).netPay,
    ).toBe(before.netPay);
    const confirmed = await t.mutation(api.copilot.confirmProposal, {
      companyId,
      proposalId: saved.proposalId!,
    });
    const adjustments = await t.query(api.adjustments.list, { companyId, month: 10, year: 2026 });
    expect(adjustments.find((item) => item._id === confirmed.adjustmentId)).toMatchObject({
      status: 'pending',
      amount: 1250000,
      title: 'Customer launch bonus',
    });
    expect(
      (await t.query(api.dashboard.summary, { companyId, month: 10, year: 2026 })).netPay,
    ).toBe(before.netPay);
    await expect(
      t.mutation(api.copilot.confirmProposal, {
        companyId,
        proposalId: saved.proposalId!,
      }),
    ).rejects.toThrow('Only pending');
    await t.mutation(api.adjustments.approve, {
      companyId,
      adjustmentId: confirmed.adjustmentId,
      note: 'Reviewed after Copilot confirmation',
    });
    expect(
      (await t.query(api.dashboard.summary, { companyId, month: 10, year: 2026 })).netPay,
    ).toBe(before.netPay + 1250000);
  });
  it('rejects a stale Copilot proposal when payroll inputs change', async () => {
    const { t, companyId, people } = await setup();
    const saved = await t.mutation(api.copilot.recordTurn, {
      companyId,
      month: 10,
      year: 2026,
      provider: 'inkeep',
      userText: 'Prepare a reimbursement for this employee.',
      assistantText: 'The reimbursement is ready for review.',
      proposal: {
        employeeId: people[0]._id,
        adjustmentType: 'reimbursement',
        amount: 500000,
        title: 'Travel reimbursement',
        rationale: 'Reimburses the requested travel expense.',
      },
    });
    const adjustmentId = await t.mutation(api.adjustments.create, {
      companyId,
      employeeId: people[1]._id,
      month: 10,
      year: 2026,
      type: 'bonus',
      amount: 100,
      title: 'Changed source data',
    });
    await t.mutation(api.adjustments.approve, { companyId, adjustmentId });
    await expect(
      t.mutation(api.copilot.confirmProposal, {
        companyId,
        proposalId: saved.proposalId!,
      }),
    ).rejects.toThrow('Payroll data changed');
    const conversation = await t.query(api.copilot.conversation, {
      companyId,
      threadId: saved.threadId,
    });
    expect(conversation.proposals[0].status).toBe('pending');
  });
  it('records Copilot rejection feedback and enforces company and period boundaries', async () => {
    const { t, companyId, people } = await setup();
    const saved = await t.mutation(api.copilot.recordTurn, {
      companyId,
      month: 10,
      year: 2026,
      provider: 'openai',
      userText: 'Prepare a deduction.',
      assistantText: 'I prepared the requested deduction.',
      proposal: {
        employeeId: people[0]._id,
        adjustmentType: 'deduction',
        amount: 10000,
        title: 'Equipment recovery',
        rationale: 'Matches the requested deduction.',
      },
    });
    await t.mutation(api.copilot.rejectProposal, {
      companyId,
      proposalId: saved.proposalId!,
      reason: 'Use a reimbursement instead.',
    });
    const conversation = await t.query(api.copilot.conversation, {
      companyId,
      threadId: saved.threadId,
    });
    expect(conversation.proposals[0]).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Use a reimbursement instead.',
    });
    expect(conversation.messages.at(-1)?.content).toContain('Use a reimbursement instead');
    await expect(
      t.mutation(api.copilot.rejectProposal, {
        companyId,
        proposalId: saved.proposalId!,
        reason: 'Try again',
      }),
    ).rejects.toThrow('Only pending');
    const other = await t.run((ctx) =>
      ctx.db.insert('companies', {
        name: 'Copilot Other',
        slug: 'copilot-other',
        currency: 'INR',
        country: 'IN',
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.query(api.copilot.conversation, { companyId: other, threadId: saved.threadId }),
    ).rejects.toThrow('not found');
    await expect(
      t.mutation(api.copilot.recordTurn, {
        companyId,
        month: 9,
        year: 2026,
        threadId: saved.threadId,
        provider: 'openai',
        userText: 'Continue in another month.',
        assistantText: 'This should not save.',
      }),
    ).rejects.toThrow('another payroll period');
  });
  it('serves read-only Copilot context and blocks proposals for locked payroll', async () => {
    const { t, companyId, people } = await setup();
    const context = await t.query(api.copilot.aiContext, {
      companyId,
      month: 9,
      year: 2026,
    });
    expect(context).toMatchObject({
      company: { name: 'Acme Studio' },
      period: { month: 9, year: 2026 },
      runStatus: 'projected',
    });
    expect(context.people).toHaveLength(24);
    const runId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    await t.mutation(api.payroll.generate, { companyId, runId });
    await expect(
      t.mutation(api.copilot.recordTurn, {
        companyId,
        month: 9,
        year: 2026,
        provider: 'openai',
        userText: 'Create a bonus in the locked period.',
        assistantText: 'This proposal should be rejected by the backend.',
        proposal: {
          employeeId: people[0]._id,
          adjustmentType: 'bonus',
          amount: 100,
          title: 'Locked bonus',
          rationale: 'Attempts to change a calculated period.',
        },
      }),
    ).rejects.toThrow('already been calculated');
    const answer = await t.mutation(api.copilot.recordTurn, {
      companyId,
      month: 9,
      year: 2026,
      provider: 'openai',
      userText: 'What is this payroll total?',
      assistantText: 'The saved payroll total comes from the calculated snapshot.',
    });
    expect(answer.proposalId).toBeUndefined();
  });
  it('creates and edits employees with unique identity and audited starting compensation', async () => {
    const { t, companyId } = await setup();
    const employeeId = await t.mutation(api.employees.create, {
      companyId,
      employeeCode: ' pf-025 ',
      firstName: 'Maya',
      lastName: 'Sen',
      email: 'MAYA.SEN@ACME.EXAMPLE',
      department: 'Finance',
      jobTitle: 'Payroll Specialist',
      employmentType: 'full_time',
      joiningDate: '2026-09-15',
      monthlySalary: 9200000,
    });
    const created = await t.query(api.employees.detail, {
      companyId,
      employeeId,
      month: 9,
      year: 2026,
    });
    expect(created?.employee).toMatchObject({
      employeeCode: 'PF-025',
      email: 'maya.sen@acme.example',
      currentMonthlySalary: 9200000,
      status: 'active',
    });
    expect(created?.compensationRevisions).toHaveLength(1);
    expect(created?.compensationRevisions[0]).toMatchObject({
      monthlySalary: 9200000,
      effectiveMonth: 9,
      effectiveYear: 2026,
      reason: 'Starting compensation',
    });
    await t.mutation(api.employees.updateProfile, {
      companyId,
      employeeId,
      employeeCode: 'PF-025',
      firstName: 'Maya',
      lastName: 'Sen',
      email: 'maya.sen@acme.example',
      department: 'Operations',
      jobTitle: 'Payroll Operations Specialist',
      employmentType: 'full_time',
      joiningDate: '2026-09-15',
    });
    expect(
      (await t.query(api.employees.detail, { companyId, employeeId }))?.employee,
    ).toMatchObject({ department: 'Operations', jobTitle: 'Payroll Operations Specialist' });
    await expect(
      t.mutation(api.employees.create, {
        companyId,
        employeeCode: 'PF-025',
        firstName: 'Duplicate',
        lastName: 'Code',
        email: 'another@acme.example',
        department: 'Finance',
        jobTitle: 'Analyst',
        employmentType: 'full_time',
        joiningDate: '2026-10-01',
        monthlySalary: 5000000,
      }),
    ).rejects.toThrow('code already exists');
    const activity = await t.query(api.activity.list, { companyId });
    expect(activity.some((event) => event.action === 'created')).toBe(true);
    expect(activity.some((event) => event.action === 'profile_updated')).toBe(true);
  });
  it('applies effective employment endings without rewriting calculated payroll', async () => {
    const { t, companyId, people } = await setup();
    const employee = people.find((person) => person.firstName === 'Tara')!;
    await expect(
      t.mutation(api.employees.deactivate, {
        companyId,
        employeeId: employee._id,
        leavingDate: '2026-07-31',
      }),
    ).rejects.toThrow('calculated payroll');
    await t.mutation(api.employees.deactivate, {
      companyId,
      employeeId: employee._id,
      leavingDate: '2026-10-15',
    });
    const october = await t.query(api.dashboard.summary, { companyId, month: 10, year: 2026 });
    const november = await t.query(api.dashboard.summary, { companyId, month: 11, year: 2026 });
    expect(october.employeeCount).toBe(24);
    expect(november.employeeCount).toBe(23);
    const octoberAdjustment = await t.mutation(api.adjustments.create, {
      companyId,
      employeeId: employee._id,
      month: 10,
      year: 2026,
      type: 'reimbursement',
      amount: 10000,
      title: 'Final expense',
    });
    expect(octoberAdjustment).toBeDefined();
    await expect(
      t.mutation(api.adjustments.create, {
        companyId,
        employeeId: employee._id,
        month: 11,
        year: 2026,
        type: 'reimbursement',
        amount: 10000,
        title: 'Too late',
      }),
    ).rejects.toThrow('not eligible');
    await t.mutation(api.employees.reactivate, { companyId, employeeId: employee._id });
    const reactivated = (
      await t.query(api.employees.detail, { companyId, employeeId: employee._id })
    )?.employee;
    expect(reactivated).toMatchObject({ status: 'active' });
    expect(reactivated).not.toHaveProperty('leavingDate');
  });
  it('exposes payslips only for processed snapshots and audits delivery outcomes', async () => {
    const { t, companyId, people } = await setup();
    const employee = people.find((person) => person.firstName === 'Ananya')!;
    const payslips = await t.query(api.payslips.listForEmployee, {
      companyId,
      employeeId: employee._id,
    });
    expect(payslips).toHaveLength(1);
    expect(payslips[0].run?.status).toBe('processed');
    const payrollItemId = payslips[0].item._id;
    let detail = await t.query(api.payslips.detail, { companyId, payrollItemId });
    expect(detail).toMatchObject({
      employee: { email: 'ananya.sharma@acme.example' },
      item: { employeeName: 'Ananya Sharma' },
      deliveries: [],
    });
    const deliveryId = await t.mutation(api.payslips.beginDelivery, {
      companyId,
      payrollItemId,
    });
    await t.mutation(api.payslips.completeDelivery, {
      companyId,
      deliveryId,
      status: 'sent',
      providerMessageId: 'email_123',
    });
    detail = await t.query(api.payslips.detail, { companyId, payrollItemId });
    expect(detail.deliveries[0]).toMatchObject({
      status: 'sent',
      recipient: 'ananya.sharma@acme.example',
      providerMessageId: 'email_123',
    });
    await expect(
      t.mutation(api.payslips.completeDelivery, {
        companyId,
        deliveryId,
        status: 'failed',
        error: 'Duplicate completion',
      }),
    ).rejects.toThrow('already complete');
    const septemberId = await t.mutation(api.payroll.create, { companyId, month: 9, year: 2026 });
    await t.mutation(api.payroll.generate, { companyId, runId: septemberId });
    const september = await t.query(api.payroll.detail, { companyId, runId: septemberId });
    await expect(
      t.query(api.payslips.detail, {
        companyId,
        payrollItemId: september.items[0]._id,
      }),
    ).rejects.toThrow('only after payroll is finalized');
  });
});
