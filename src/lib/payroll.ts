/** All financial values are safe integer paise. No floating-point currency inputs. */
export type AdjustmentType = 'bonus' | 'deduction' | 'reimbursement';
export type RunStatus = 'draft' | 'calculating' | 'ready_for_review' | 'approved' | 'processed';
export interface CalculationAdjustment {
  type: AdjustmentType;
  amount: number;
}
export interface PayrollAmounts {
  basePay: number;
  bonusTotal: number;
  reimbursementTotal: number;
  deductionTotal: number;
  grossPay: number;
  netPay: number;
}
export const zeroAmounts = (): PayrollAmounts => ({
  basePay: 0,
  bonusTotal: 0,
  reimbursementTotal: 0,
  deductionTotal: 0,
  grossPay: 0,
  netPay: 0,
});
export function money(value: number, label = 'Amount'): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${label} must be a non-negative safe integer in paise.`);
  return value;
}
export function addMoney(a: number, b: number): number {
  return money(money(a) + money(b), 'Total');
}
export function validatePeriod(month: number, year: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new Error('Month must be between 1 and 12.');
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new Error('Year must be between 2000 and 2100.');
}
export function calculatePayroll(
  basePay: number,
  adjustments: readonly CalculationAdjustment[] = [],
): PayrollAmounts {
  const result = { ...zeroAmounts(), basePay: money(basePay, 'Base salary') };
  for (const adjustment of adjustments) {
    money(adjustment.amount, 'Adjustment');
    if (adjustment.amount === 0) throw new Error('Adjustment must be greater than zero.');
    switch (adjustment.type) {
      case 'bonus':
        result.bonusTotal = addMoney(result.bonusTotal, adjustment.amount);
        break;
      case 'reimbursement':
        result.reimbursementTotal = addMoney(result.reimbursementTotal, adjustment.amount);
        break;
      case 'deduction':
        result.deductionTotal = addMoney(result.deductionTotal, adjustment.amount);
        break;
      default:
        throw new Error('Unknown adjustment type.');
    }
  }
  result.grossPay = addMoney(result.basePay, result.bonusTotal);
  result.netPay = money(
    addMoney(result.grossPay, result.reimbursementTotal) - result.deductionTotal,
    'Net pay',
  );
  return result;
}
export function aggregatePayroll(items: readonly PayrollAmounts[]): PayrollAmounts {
  return items.reduce((sum, item) => {
    for (const key of Object.keys(sum) as (keyof PayrollAmounts)[])
      sum[key] = addMoney(sum[key], item[key]);
    return sum;
  }, zeroAmounts());
}
const nextStatus: Partial<Record<RunStatus, RunStatus>> = {
  draft: 'calculating',
  calculating: 'ready_for_review',
  ready_for_review: 'approved',
  approved: 'processed',
};
export function assertTransition(from: RunStatus, to: RunStatus) {
  if (nextStatus[from] !== to) throw new Error(`Cannot transition payroll from ${from} to ${to}.`);
}
export function parseInr(input: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim()))
    throw new Error('Enter a valid INR amount with up to two decimal places.');
  const [whole, fraction = ''] = input.trim().split('.');
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (paise > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount is too large.');
  return money(Number(paise));
}
export function payrollChange(current: number, previous: number): number | null {
  money(current);
  money(previous);
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;
}
