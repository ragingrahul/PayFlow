import { internalMutation } from './_generated/server';

/** One-time, idempotent Milestone 2 backfill. It never changes saved payroll snapshots. */
export const milestone2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query('companies').collect();
    let inserted = 0;
    let updated = 0;
    for (const company of companies) {
      const employees = await ctx.db
        .query('employees')
        .withIndex('by_company', (q) => q.eq('companyId', company._id))
        .collect();
      const runs = await ctx.db
        .query('payrollRuns')
        .withIndex('by_company_period', (q) => q.eq('companyId', company._id))
        .collect();
      const runById = new Map(runs.map((run) => [run._id, run]));
      for (const employee of employees) {
        const existing = await ctx.db
          .query('compensationRevisions')
          .withIndex('by_employee_period', (q) => q.eq('employeeId', employee._id))
          .collect();
        if (existing.length) {
          const earliest = existing.sort(
            (a, b) =>
              a.effectiveYear * 12 + a.effectiveMonth - (b.effectiveYear * 12 + b.effectiveMonth),
          )[0];
          const [joiningYear, joiningMonth] = employee.joiningDate.split('-').map(Number);
          if (
            earliest.reason === 'Backfilled from saved payroll snapshot' &&
            earliest.effectiveYear * 12 + earliest.effectiveMonth > joiningYear * 12 + joiningMonth
          ) {
            await ctx.db.patch(earliest._id, {
              effectiveMonth: joiningMonth,
              effectiveYear: joiningYear,
            });
            updated++;
          }
          continue;
        }
        const items = await ctx.db
          .query('payrollItems')
          .withIndex('by_employee', (q) => q.eq('employeeId', employee._id))
          .collect();
        const observed = items
          .map((item) => ({ item, run: runById.get(item.payrollRunId) }))
          .filter((entry) => entry.run)
          .sort((a, b) => a.run!.year * 12 + a.run!.month - (b.run!.year * 12 + b.run!.month));
        let latestSalary: number | undefined;
        for (const [index, entry] of observed.entries()) {
          if (entry.item.basePay === latestSalary) continue;
          await ctx.db.insert('compensationRevisions', {
            companyId: company._id,
            employeeId: employee._id,
            monthlySalary: entry.item.basePay,
            effectiveMonth:
              index === 0 ? Number(employee.joiningDate.slice(5, 7)) : entry.run!.month,
            effectiveYear: index === 0 ? Number(employee.joiningDate.slice(0, 4)) : entry.run!.year,
            reason: 'Backfilled from saved payroll snapshot',
            createdAt: entry.run!.calculatedAt ?? entry.run!.createdAt,
          });
          latestSalary = entry.item.basePay;
          inserted++;
        }
        if (latestSalary === undefined) {
          const [year, month] = employee.joiningDate.split('-').map(Number);
          await ctx.db.insert('compensationRevisions', {
            companyId: company._id,
            employeeId: employee._id,
            monthlySalary: employee.baseMonthlySalary,
            effectiveMonth: month,
            effectiveYear: year,
            reason: 'Backfilled starting compensation',
            createdAt: employee.createdAt,
          });
          inserted++;
        } else if (latestSalary !== employee.baseMonthlySalary) {
          const changes = await ctx.db
            .query('activityEvents')
            .withIndex('by_company', (q) => q.eq('companyId', company._id))
            .collect();
          const change = changes
            .filter(
              (event) =>
                event.entityId === employee._id &&
                (event.action === 'salary_changed' || event.action === 'salary_revised'),
            )
            .sort((a, b) => b.createdAt - a.createdAt)[0];
          const date = new Date(change?.createdAt ?? Date.now());
          await ctx.db.insert('compensationRevisions', {
            companyId: company._id,
            employeeId: employee._id,
            monthlySalary: employee.baseMonthlySalary,
            effectiveMonth: change?.metadata?.month ?? date.getUTCMonth() + 1,
            effectiveYear: change?.metadata?.year ?? date.getUTCFullYear(),
            reason: 'Backfilled current compensation',
            createdAt: change?.createdAt ?? Date.now(),
          });
          inserted++;
        }
      }
    }
    return { companies: companies.length, inserted, updated };
  },
});
