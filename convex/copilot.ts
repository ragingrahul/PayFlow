import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { adjustmentType, copilotProvider } from './schema';
import {
  addMoney,
  calculatePayroll,
  money,
  validatePeriod,
  type AdjustmentType,
  type PayrollAmounts,
} from '../src/lib/payroll';
import { createPendingAdjustment, editableRun } from './adjustmentService';
import { periodInputs, recordActivity, requireCompany } from './payrollService';

const proposalArgs = {
  employeeId: v.id('employees'),
  adjustmentType,
  amount: v.number(),
  title: v.string(),
  rationale: v.string(),
};

function requiredText(value: string, label: string, minimum: number, maximum: number) {
  const text = value.trim();
  if (text.length < minimum || text.length > maximum)
    throw new Error(`${label} must be between ${minimum} and ${maximum} characters.`);
  return text;
}

function adjustmentTotals(amounts: PayrollAmounts) {
  return [
    amounts.bonusTotal ? { type: 'bonus' as const, amount: amounts.bonusTotal } : null,
    amounts.reimbursementTotal
      ? { type: 'reimbursement' as const, amount: amounts.reimbursementTotal }
      : null,
    amounts.deductionTotal ? { type: 'deduction' as const, amount: amounts.deductionTotal } : null,
  ].filter((item): item is { type: AdjustmentType; amount: number } => item !== null);
}

async function proposalPreview(
  ctx: QueryCtx | MutationCtx,
  args: {
    companyId: Id<'companies'>;
    employeeId: Id<'employees'>;
    month: number;
    year: number;
    adjustmentType: AdjustmentType;
    amount: number;
  },
) {
  await requireCompany(ctx, args.companyId);
  validatePeriod(args.month, args.year);
  money(args.amount);
  if (args.amount === 0) throw new Error('Adjustment must be greater than zero.');
  const employee = await ctx.db.get(args.employeeId);
  if (!employee || employee.companyId !== args.companyId || employee.status !== 'active')
    throw new Error('Choose an active employee in this company.');
  const run = await editableRun(ctx, args.companyId, args.month, args.year);
  const input = await periodInputs(ctx, args.companyId, args.month, args.year, run?._id);
  const employeeInput = input.items.find((item) => item.employee._id === args.employeeId);
  if (!employeeInput) throw new Error('Employee is not eligible for this payroll period.');
  const { employee: ignoredEmployee, ...amounts } = employeeInput;
  void ignoredEmployee;
  const projectedEmployee = calculatePayroll(amounts.basePay, [
    ...adjustmentTotals(amounts),
    { type: args.adjustmentType, amount: args.amount },
  ]);
  const delta = projectedEmployee.netPay - amounts.netPay;
  const projectedNetPay =
    delta >= 0
      ? addMoney(input.totals.netPay, delta)
      : money(input.totals.netPay + delta, 'Projected payroll');
  const rows = input.items
    .map(({ employee: itemEmployee, ...itemAmounts }) => ({
      employeeId: itemEmployee._id,
      status: itemEmployee.status,
      joiningDate: itemEmployee.joiningDate,
      ...itemAmounts,
    }))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  const sourceVersion = JSON.stringify({
    run: run ? { id: run._id, status: run.status } : null,
    rows,
  });
  return {
    employee,
    baselineNetPay: input.totals.netPay,
    projectedNetPay,
    sourceVersion,
  };
}

async function threadForCompany(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<'companies'>,
  threadId: Id<'copilotThreads'>,
) {
  const thread = await ctx.db.get(threadId);
  if (!thread || thread.companyId !== companyId) throw new Error('Copilot conversation not found.');
  return thread;
}

export const threads = query({
  args: { companyId: v.id('companies'), month: v.number(), year: v.number() },
  handler: async (ctx, { companyId, month, year }) => {
    await requireCompany(ctx, companyId);
    validatePeriod(month, year);
    return ctx.db
      .query('copilotThreads')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('year', year).eq('month', month),
      )
      .order('desc')
      .take(20);
  },
});

export const conversation = query({
  args: { companyId: v.id('companies'), threadId: v.id('copilotThreads') },
  handler: async (ctx, { companyId, threadId }) => {
    const thread = await threadForCompany(ctx, companyId, threadId);
    const messages = await ctx.db
      .query('copilotMessages')
      .withIndex('by_thread', (q) => q.eq('threadId', threadId))
      .collect();
    const proposals = await ctx.db
      .query('copilotProposals')
      .withIndex('by_thread', (q) => q.eq('threadId', threadId))
      .collect();
    return {
      thread,
      messages: messages.sort((a, b) => a.createdAt - b.createdAt),
      proposals,
    };
  },
});

export const aiContext = query({
  args: {
    companyId: v.id('companies'),
    month: v.number(),
    year: v.number(),
    threadId: v.optional(v.id('copilotThreads')),
  },
  handler: async (ctx, { companyId, month, year, threadId }) => {
    const company = await requireCompany(ctx, companyId);
    validatePeriod(month, year);
    if (threadId) await threadForCompany(ctx, companyId, threadId);
    const run = await ctx.db
      .query('payrollRuns')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('year', year).eq('month', month),
      )
      .unique();
    const calculated = run && run.status !== 'draft' && run.status !== 'calculating';
    const liveInput = calculated ? null : await periodInputs(ctx, companyId, month, year, run?._id);
    const storedItems = calculated
      ? await ctx.db
          .query('payrollItems')
          .withIndex('by_run', (q) => q.eq('payrollRunId', run._id))
          .collect()
      : null;
    const employees = await ctx.db
      .query('employees')
      .withIndex('by_company', (q) => q.eq('companyId', companyId))
      .collect();
    const employeeMap = new Map(employees.map((employee) => [employee._id, employee]));
    const people = (storedItems ?? liveInput!.items).map((item) => {
      const employee = 'employee' in item ? item.employee : employeeMap.get(item.employeeId);
      return {
        id: employee?._id ?? ('employeeId' in item ? item.employeeId : ''),
        name:
          'employeeName' in item
            ? item.employeeName
            : employee
              ? `${employee.firstName} ${employee.lastName}`
              : 'Unknown employee',
        code: employee?.employeeCode ?? ('employeeCode' in item ? item.employeeCode : ''),
        email: employee?.email ?? '',
        department: 'department' in item ? item.department : employee?.department,
        jobTitle: 'jobTitle' in item ? item.jobTitle : employee?.jobTitle,
        employmentType: employee?.employmentType,
        basePay: item.basePay,
        netPay: item.netPay,
      };
    });
    const totals = calculated
      ? {
          basePay: run.totalBasePay,
          bonusTotal: run.totalBonuses,
          reimbursementTotal: run.totalReimbursements,
          deductionTotal: run.totalDeductions,
          grossPay: run.totalGrossPay,
          netPay: run.totalNetPay,
        }
      : liveInput!.totals;
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previous = await ctx.db
      .query('payrollRuns')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('year', previousYear).eq('month', previousMonth),
      )
      .unique();
    const adjustments = await ctx.db
      .query('adjustments')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('effectiveYear', year).eq('effectiveMonth', month),
      )
      .collect();
    const history = threadId
      ? await ctx.db
          .query('copilotMessages')
          .withIndex('by_thread', (q) => q.eq('threadId', threadId))
          .collect()
      : [];
    return {
      company: { id: company._id, name: company.name, currency: company.currency },
      period: { month, year },
      runStatus: run?.status ?? 'projected',
      totals,
      previous:
        previous && previous.status !== 'draft'
          ? {
              month: previous.month,
              year: previous.year,
              status: previous.status,
              netPay: previous.totalNetPay,
              employeeCount: previous.employeeCount,
            }
          : null,
      people,
      adjustments: adjustments.map((adjustment) => ({
        type: adjustment.type,
        amount: adjustment.amount,
        title: adjustment.title,
        status: adjustment.status,
        employeeName:
          employeeMap.has(adjustment.employeeId) && employeeMap.get(adjustment.employeeId)
            ? `${employeeMap.get(adjustment.employeeId)!.firstName} ${employeeMap.get(adjustment.employeeId)!.lastName}`
            : 'Unknown employee',
      })),
      history: history
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-20)
        .map(({ role, content, kind }) => ({ role, content, kind })),
    };
  },
});

export const recordTurn = mutation({
  args: {
    companyId: v.id('companies'),
    month: v.number(),
    year: v.number(),
    threadId: v.optional(v.id('copilotThreads')),
    provider: copilotProvider,
    userText: v.string(),
    assistantText: v.string(),
    proposal: v.optional(v.object(proposalArgs)),
  },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    validatePeriod(args.month, args.year);
    const userText = requiredText(args.userText, 'Message', 1, 2_000);
    const assistantText = requiredText(args.assistantText, 'Copilot response', 1, 6_000);
    let thread: Doc<'copilotThreads'> | null = null;
    let threadId = args.threadId;
    if (threadId) {
      thread = await threadForCompany(ctx, args.companyId, threadId);
      if (thread.month !== args.month || thread.year !== args.year)
        throw new Error('This conversation belongs to another payroll period.');
    } else {
      const now = Date.now();
      threadId = await ctx.db.insert('copilotThreads', {
        companyId: args.companyId,
        month: args.month,
        year: args.year,
        title: userText.length > 56 ? `${userText.slice(0, 53)}…` : userText,
        provider: args.provider,
        createdAt: now,
        updatedAt: now,
      });
    }
    const now = Date.now();
    await ctx.db.insert('copilotMessages', {
      companyId: args.companyId,
      threadId,
      role: 'user',
      kind: 'text',
      content: userText,
      createdAt: now,
    });
    let proposalId: Id<'copilotProposals'> | undefined;
    if (args.proposal) {
      const title = requiredText(args.proposal.title, 'Proposal title', 1, 120);
      const rationale = requiredText(args.proposal.rationale, 'Proposal rationale', 3, 500);
      const preview = await proposalPreview(ctx, {
        companyId: args.companyId,
        employeeId: args.proposal.employeeId,
        month: args.month,
        year: args.year,
        adjustmentType: args.proposal.adjustmentType,
        amount: args.proposal.amount,
      });
      proposalId = await ctx.db.insert('copilotProposals', {
        companyId: args.companyId,
        threadId,
        requestText: userText,
        provider: args.provider,
        status: 'pending',
        employeeId: args.proposal.employeeId,
        employeeName: `${preview.employee.firstName} ${preview.employee.lastName}`,
        month: args.month,
        year: args.year,
        adjustmentType: args.proposal.adjustmentType,
        amount: args.proposal.amount,
        title,
        rationale,
        baselineNetPay: preview.baselineNetPay,
        projectedNetPay: preview.projectedNetPay,
        sourceVersion: preview.sourceVersion,
        createdAt: now,
      });
      await recordActivity(
        ctx,
        args.companyId,
        'copilot_proposal',
        'proposed',
        `Copilot proposed a ${args.proposal.adjustmentType} for ${preview.employee.firstName} ${preview.employee.lastName}.`,
        proposalId,
      );
    }
    await ctx.db.insert('copilotMessages', {
      companyId: args.companyId,
      threadId,
      role: 'assistant',
      kind: proposalId ? 'proposal' : 'text',
      content: assistantText,
      ...(proposalId ? { proposalId } : {}),
      createdAt: now + 1,
    });
    await ctx.db.patch(threadId, { updatedAt: now, provider: args.provider });
    return { threadId, proposalId };
  },
});

export const confirmProposal = mutation({
  args: { companyId: v.id('companies'), proposalId: v.id('copilotProposals') },
  handler: async (ctx, { companyId, proposalId }) => {
    await requireCompany(ctx, companyId);
    const proposal = await ctx.db.get(proposalId);
    if (!proposal || proposal.companyId !== companyId)
      throw new Error('Copilot proposal not found.');
    if (proposal.status !== 'pending') throw new Error('Only pending proposals can be confirmed.');
    const preview = await proposalPreview(ctx, {
      companyId,
      employeeId: proposal.employeeId,
      month: proposal.month,
      year: proposal.year,
      adjustmentType: proposal.adjustmentType,
      amount: proposal.amount,
    });
    if (
      preview.sourceVersion !== proposal.sourceVersion ||
      preview.baselineNetPay !== proposal.baselineNetPay ||
      preview.projectedNetPay !== proposal.projectedNetPay
    )
      throw new Error('Payroll data changed after this proposal. Ask Copilot to prepare it again.');
    const { id: adjustmentId } = await createPendingAdjustment(ctx, {
      companyId,
      employeeId: proposal.employeeId,
      month: proposal.month,
      year: proposal.year,
      type: proposal.adjustmentType,
      amount: proposal.amount,
      title: proposal.title,
      origin: 'copilot',
    });
    const now = Date.now();
    await ctx.db.patch(proposalId, { status: 'applied', adjustmentId, decidedAt: now });
    await ctx.db.insert('copilotMessages', {
      companyId,
      threadId: proposal.threadId,
      role: 'assistant',
      kind: 'decision',
      content: `Confirmed and submitted “${proposal.title}” as a pending adjustment. It still requires approval in Adjustments before it can affect payroll.`,
      proposalId,
      createdAt: now,
    });
    await ctx.db.patch(proposal.threadId, { updatedAt: now });
    await recordActivity(
      ctx,
      companyId,
      'copilot_proposal',
      'confirmed',
      `Confirmed Copilot proposal for ${proposal.employeeName}; created a pending adjustment.`,
      proposalId,
    );
    return { proposalId, adjustmentId };
  },
});

export const rejectProposal = mutation({
  args: {
    companyId: v.id('companies'),
    proposalId: v.id('copilotProposals'),
    reason: v.string(),
  },
  handler: async (ctx, { companyId, proposalId, reason }) => {
    await requireCompany(ctx, companyId);
    const proposal = await ctx.db.get(proposalId);
    if (!proposal || proposal.companyId !== companyId)
      throw new Error('Copilot proposal not found.');
    if (proposal.status !== 'pending') throw new Error('Only pending proposals can be rejected.');
    const rejectionReason = requiredText(reason, 'Correction', 3, 500);
    const now = Date.now();
    await ctx.db.patch(proposalId, {
      status: 'rejected',
      rejectionReason,
      decidedAt: now,
    });
    await ctx.db.insert('copilotMessages', {
      companyId,
      threadId: proposal.threadId,
      role: 'user',
      kind: 'decision',
      content: `I rejected that proposal. Correction: ${rejectionReason}`,
      proposalId,
      createdAt: now,
    });
    await ctx.db.patch(proposal.threadId, { updatedAt: now });
    await recordActivity(
      ctx,
      companyId,
      'copilot_proposal',
      'rejected',
      `Rejected Copilot proposal for ${proposal.employeeName}: ${rejectionReason}`,
      proposalId,
    );
    return proposalId;
  },
});
