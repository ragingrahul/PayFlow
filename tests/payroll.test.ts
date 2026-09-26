import { describe, it, expect } from 'vitest';
import {
  calculatePayroll,
  aggregatePayroll,
  parseInr,
  assertTransition,
  validatePeriod,
  payrollChange,
  type RunStatus,
  type AdjustmentType,
} from '../src/lib/payroll';
describe('integer paise payroll engine', () => {
  it('base only', () =>
    expect(calculatePayroll(100000)).toEqual({
      basePay: 100000,
      bonusTotal: 0,
      reimbursementTotal: 0,
      deductionTotal: 0,
      grossPay: 100000,
      netPay: 100000,
    }));
  it('base plus bonus', () =>
    expect(calculatePayroll(100000, [{ type: 'bonus', amount: 20000 }]).netPay).toBe(120000));
  it('reimbursement does not increase gross', () =>
    expect(calculatePayroll(100000, [{ type: 'reimbursement', amount: 125050 }])).toMatchObject({
      grossPay: 100000,
      netPay: 225050,
    }));
  it('deduction reduces net', () =>
    expect(calculatePayroll(100000, [{ type: 'deduction', amount: 10000 }]).netPay).toBe(90000));
  it('combines and accumulates multiple adjustments exactly', () =>
    expect(
      calculatePayroll(100000, [
        { type: 'bonus', amount: 10000 },
        { type: 'bonus', amount: 20000 },
        { type: 'reimbursement', amount: 125050 },
        { type: 'deduction', amount: 5000 },
      ]),
    ).toMatchObject({ grossPay: 130000, netPay: 250050, bonusTotal: 30000 }));
  it('handles zero salary and no adjustments', () =>
    expect(calculatePayroll(0, []).netPay).toBe(0));
  it.each([-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid base %s',
    (value) => expect(() => calculatePayroll(value)).toThrow(),
  );
  it.each([-1, 0, 0.5, NaN, Infinity])('rejects invalid adjustment %s', (amount) =>
    expect(() => calculatePayroll(100, [{ type: 'bonus', amount }])).toThrow(),
  );
  it('rejects unknown type', () =>
    expect(() => calculatePayroll(100, [{ type: 'other' as AdjustmentType, amount: 1 }])).toThrow(
      'Unknown',
    ));
  it('rejects negative take-home pay', () =>
    expect(() => calculatePayroll(100, [{ type: 'deduction', amount: 101 }])).toThrow('Net pay'));
  it('rejects overflow', () =>
    expect(() =>
      calculatePayroll(Number.MAX_SAFE_INTEGER, [{ type: 'bonus', amount: 1 }]),
    ).toThrow());
  it('aggregates every financial field', () =>
    expect(
      aggregatePayroll([
        calculatePayroll(100, [{ type: 'bonus', amount: 10 }]),
        calculatePayroll(200, [{ type: 'deduction', amount: 5 }]),
      ]),
    ).toEqual({
      basePay: 300,
      bonusTotal: 10,
      reimbursementTotal: 0,
      deductionTotal: 5,
      grossPay: 310,
      netPay: 305,
    }));
  it('rejects aggregate overflow', () =>
    expect(() =>
      aggregatePayroll([calculatePayroll(Number.MAX_SAFE_INTEGER), calculatePayroll(1)]),
    ).toThrow());
  it('parses currency exactly', () => {
    expect(parseInr('1000.50')).toBe(100050);
    expect(parseInr('0.29')).toBe(29);
    expect(parseInr(' 1.1 ')).toBe(110);
  });
  it.each(['-10', 'NaN', '1e3', '1.001', '1,000', '₹5', '', '9007199254740992'])(
    'rejects malformed INR %s',
    (input) => expect(() => parseInr(input)).toThrow(),
  );
  it('calculates display comparison without altering money', () => {
    expect(payrollChange(11000, 10000)).toBe(10);
    expect(payrollChange(100, 0)).toBeNull();
  });
});
describe('period and state invariants', () => {
  it.each([
    [0, 2026],
    [13, 2026],
    [1.5, 2026],
    [9, 1999],
    [9, 2101],
    [9, 2026.5],
  ])('rejects invalid period %s/%s', (month, year) =>
    expect(() => validatePeriod(month, year)).toThrow(),
  );
  it('accepts valid period', () => expect(() => validatePeriod(9, 2026)).not.toThrow());
  const statuses: RunStatus[] = [
    'draft',
    'calculating',
    'ready_for_review',
    'approved',
    'processed',
  ];
  it('accepts only adjacent forward transitions', () => {
    for (let i = 0; i < statuses.length; i++)
      for (let j = 0; j < statuses.length; j++) {
        if (j === i + 1) expect(() => assertTransition(statuses[i], statuses[j])).not.toThrow();
        else expect(() => assertTransition(statuses[i], statuses[j])).toThrow();
      }
  });
});
