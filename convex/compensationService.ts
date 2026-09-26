import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { money, validatePeriod } from '../src/lib/payroll';

export function periodNumber(month: number, year: number) {
  validatePeriod(month, year);
  return year * 12 + month;
}

export function salaryAt(
  employee: Doc<'employees'>,
  revisions: Doc<'compensationRevisions'>[],
  month: number,
  year: number,
) {
  const target = periodNumber(month, year);
  const revision = revisions
    .filter((item) => periodNumber(item.effectiveMonth, item.effectiveYear) <= target)
    .sort(
      (a, b) =>
        periodNumber(b.effectiveMonth, b.effectiveYear) -
        periodNumber(a.effectiveMonth, a.effectiveYear),
    )[0];
  return money(revision?.monthlySalary ?? employee.baseMonthlySalary, 'Monthly salary');
}

export async function employeeRevisions(ctx: QueryCtx | MutationCtx, employeeId: Id<'employees'>) {
  return ctx.db
    .query('compensationRevisions')
    .withIndex('by_employee_period', (q) => q.eq('employeeId', employeeId))
    .collect();
}

export async function companyRevisionMap(ctx: QueryCtx | MutationCtx, companyId: Id<'companies'>) {
  const revisions = await ctx.db
    .query('compensationRevisions')
    .withIndex('by_company', (q) => q.eq('companyId', companyId))
    .collect();
  const result = new Map<Id<'employees'>, Doc<'compensationRevisions'>[]>();
  for (const revision of revisions) {
    const group = result.get(revision.employeeId) ?? [];
    group.push(revision);
    result.set(revision.employeeId, group);
  }
  return result;
}
