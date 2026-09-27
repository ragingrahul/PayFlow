import { query } from './_generated/server';
import { v } from 'convex/values';
import { employeeEligibleForPeriod, periodInputs, requireCompany } from './payrollService';
import { addMoney, payrollChange, validatePeriod } from '../src/lib/payroll';
export const summary = query({
  args: { companyId: v.id('companies'), month: v.number(), year: v.number() },
  handler: async (ctx, { companyId, month, year }) => {
    await requireCompany(ctx, companyId);
    validatePeriod(month, year);
    const allEmployees = await ctx.db
      .query('employees')
      .withIndex('by_company', (q) => q.eq('companyId', companyId))
      .collect();
    const run = await ctx.db
      .query('payrollRuns')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('year', year).eq('month', month),
      )
      .unique();
    const previousMonth = month === 1 ? 12 : month - 1,
      previousYear = month === 1 ? year - 1 : year;
    const previous = await ctx.db
      .query('payrollRuns')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('year', previousYear).eq('month', previousMonth),
      )
      .unique();
    const calculated = run && run.status !== 'draft' && run.status !== 'calculating';
    const projected = calculated ? null : await periodInputs(ctx, companyId, month, year, run?._id);
    const netPay = calculated ? run.totalNetPay : projected!.totals.netPay;
    const rows = calculated
      ? await ctx.db
          .query('payrollItems')
          .withIndex('by_run', (q) => q.eq('payrollRunId', run._id))
          .collect()
      : projected!.items.map((x) => ({ department: x.employee.department, netPay: x.netPay }));
    const departments: Record<string, { count: number; netPay: number }> = {};
    for (const row of rows) {
      const d = departments[row.department] ?? { count: 0, netPay: 0 };
      d.count++;
      d.netPay = addMoney(d.netPay, row.netPay);
      departments[row.department] = d;
    }
    const adjustments = await ctx.db
      .query('adjustments')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('effectiveYear', year).eq('effectiveMonth', month),
      )
      .collect();
    const activity = await ctx.db
      .query('activityEvents')
      .withIndex('by_company', (q) => q.eq('companyId', companyId))
      .order('desc')
      .take(6);
    const employeeNames = new Map(allEmployees.map((e) => [e._id, `${e.firstName} ${e.lastName}`]));
    return {
      netPay,
      employeeCount: rows.length,
      contractorCount: allEmployees.filter(
        (employee) =>
          employee.employmentType === 'contractor' &&
          employeeEligibleForPeriod(employee, month, year),
      ).length,
      run,
      previous,
      change:
        previous && previous.status !== 'draft'
          ? payrollChange(netPay, previous.totalNetPay)
          : null,
      departments: Object.entries(departments)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.netPay - a.netPay),
      activity,
      adjustments: adjustments.map((a) => ({
        ...a,
        employeeName: employeeNames.get(a.employeeId) ?? 'Unknown employee',
      })),
      totals: calculated
        ? {
            basePay: run.totalBasePay,
            bonusTotal: run.totalBonuses,
            reimbursementTotal: run.totalReimbursements,
            deductionTotal: run.totalDeductions,
            grossPay: run.totalGrossPay,
            netPay: run.totalNetPay,
          }
        : projected!.totals,
    };
  },
});
