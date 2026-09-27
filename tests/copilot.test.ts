import { describe, expect, it } from 'vitest';
import { executeCopilotTool, type CopilotContext } from '../src/lib/copilot-provider';

function context(overrides: Partial<CopilotContext> = {}): CopilotContext {
  return {
    company: { id: 'company', name: 'Acme Labs India', currency: 'INR' },
    period: { month: 10, year: 2026 },
    runStatus: 'draft',
    totals: {
      basePay: 10000000,
      bonusTotal: 2000000,
      reimbursementTotal: 0,
      deductionTotal: 0,
      grossPay: 12000000,
      netPay: 12000000,
    },
    previous: {
      month: 9,
      year: 2026,
      status: 'ready_for_review',
      netPay: 11000000,
      employeeCount: 2,
    },
    people: [
      {
        id: 'ananya',
        name: 'Ananya Iyer',
        code: 'PF-001',
        email: 'ananya@example.com',
        department: 'Engineering',
        jobTitle: 'Staff Engineer',
        employmentType: 'full_time',
        basePay: 7000000,
        netPay: 9000000,
      },
      {
        id: 'arjun',
        name: 'Arjun Rao',
        code: 'PF-002',
        email: 'arjun@example.com',
        department: 'Engineering',
        jobTitle: 'Engineer',
        employmentType: 'full_time',
        basePay: 3000000,
        netPay: 3000000,
      },
    ],
    adjustments: [
      {
        type: 'bonus',
        amount: 2000000,
        title: 'Launch bonus',
        status: 'approved',
        employeeName: 'Ananya Iyer',
      },
    ],
    history: [],
    ...overrides,
  };
}

describe('Copilot deterministic tools', () => {
  it('returns authoritative payroll and department context', () => {
    const result = executeCopilotTool(context(), 'get_payroll_context', {});
    expect(result.output).toMatchObject({
      employeeCount: 2,
      runStatus: 'draft',
      totals: { netPay: 12000000 },
      previous: { netPay: 11000000 },
    });
    expect(result.output.departments).toEqual([
      { name: 'Engineering', count: 2, netPay: 12000000 },
    ]);
  });

  it('finds employees and filters stored adjustments', () => {
    expect(
      executeCopilotTool(context(), 'find_employees', { query: 'PF-001' }).output,
    ).toMatchObject({
      count: 1,
      employees: [{ name: 'Ananya Iyer' }],
    });
    expect(
      executeCopilotTool(context(), 'list_adjustments', {
        status: 'approved',
        minimumAmountInr: '20000',
      }).output,
    ).toMatchObject({ count: 1 });
  });

  it('parses a proposal with deterministic paise impact', () => {
    const result = executeCopilotTool(context(), 'prepare_adjustment_proposal', {
      employeeQuery: 'Ananya',
      adjustmentType: 'bonus',
      amountInr: '12500.50',
      title: 'Customer launch bonus',
      rationale: 'The user requested this reward.',
    });
    expect(result.proposal).toEqual({
      employeeId: 'ananya',
      employeeName: 'Ananya Iyer',
      adjustmentType: 'bonus',
      amount: 1250050,
      title: 'Customer launch bonus',
      rationale: 'The user requested this reward.',
    });
    expect(result.output).toMatchObject({
      baselineNetPay: 12000000,
      projectedNetPay: 13250050,
      effectIfLaterApproved: 1250050,
    });
  });

  it('returns correction guidance for ambiguous, malformed, and unsafe proposals', () => {
    const ambiguous = executeCopilotTool(context(), 'prepare_adjustment_proposal', {
      employeeQuery: 'Engineering',
      adjustmentType: 'bonus',
      amountInr: '100',
      title: 'Bonus',
      rationale: 'Ambiguous target.',
    });
    expect(ambiguous.proposal).toBeUndefined();
    expect(String(ambiguous.output.error)).toContain('ambiguous');
    const malformed = executeCopilotTool(context(), 'prepare_adjustment_proposal', {
      employeeQuery: 'Ananya',
      adjustmentType: 'bonus',
      amountInr: '₹1,000',
      title: 'Bonus',
      rationale: 'Malformed amount.',
    });
    expect(String(malformed.output.error)).toContain('valid INR');
    const unsafe = executeCopilotTool(context(), 'prepare_adjustment_proposal', {
      employeeQuery: 'Arjun',
      adjustmentType: 'deduction',
      amountInr: '30000.01',
      title: 'Recovery',
      rationale: 'Would make net negative.',
    });
    expect(String(unsafe.output.error)).toContain('negative');
  });

  it('does not prepare writes for a calculated period', () => {
    const result = executeCopilotTool(
      context({ runStatus: 'ready_for_review' }),
      'prepare_adjustment_proposal',
      {
        employeeQuery: 'Ananya',
        adjustmentType: 'bonus',
        amountInr: '100',
        title: 'Late bonus',
        rationale: 'Locked period.',
      },
    );
    expect(result.proposal).toBeUndefined();
    expect(String(result.output.error)).toContain('already calculated');
  });
});
