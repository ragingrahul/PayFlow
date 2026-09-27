import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { QueryCtx, MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import {
  addMoney,
  aggregatePayroll,
  applyRaise,
  calculatePayroll,
  validatePeriod,
  validateRaiseBasisPoints,
  type CalculationAdjustment,
  type PayrollAmounts,
} from '../src/lib/payroll';
import { periodInputs, recordActivity, requireCompany } from './payrollService';

const targetType = v.union(v.literal('employee'), v.literal('department'));
const simulationArgs = {
  companyId: v.id('companies'),
  month: v.number(),
  year: v.number(),
  targetType,
  employeeId: v.optional(v.id('employees')),
  department: v.optional(v.string()),
  raiseBasisPoints: v.number(),
};

type ScenarioArgs = {
  companyId: Id<'companies'>;
  month: number;
  year: number;
  targetType: 'employee' | 'department';
  employeeId?: Id<'employees'>;
  department?: string;
  raiseBasisPoints: number;
};

type BaselineRow = {
  employeeId: Id<'employees'>;
  employeeName: string;
  department: string;
  amounts: PayrollAmounts;
};

function adjustmentTotals(amounts: PayrollAmounts): CalculationAdjustment[] {
  return [
    amounts.bonusTotal ? { type: 'bonus' as const, amount: amounts.bonusTotal } : null,
    amounts.reimbursementTotal
      ? { type: 'reimbursement' as const, amount: amounts.reimbursementTotal }
      : null,
    amounts.deductionTotal ? { type: 'deduction' as const, amount: amounts.deductionTotal } : null,
  ].filter((item): item is CalculationAdjustment => item !== null);
}

async function baselineRows(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<'companies'>,
  month: number,
  year: number,
) {
  const run = await ctx.db
    .query('payrollRuns')
    .withIndex('by_company_period', (q) =>
      q.eq('companyId', companyId).eq('year', year).eq('month', month),
    )
    .unique();
  if (run && run.status !== 'draft' && run.status !== 'calculating') {
    const items = await ctx.db
      .query('payrollItems')
      .withIndex('by_run', (q) => q.eq('payrollRunId', run._id))
      .collect();
    return items.map((item): BaselineRow => ({
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      department: item.department,
      amounts: {
        basePay: item.basePay,
        bonusTotal: item.bonusTotal,
        reimbursementTotal: item.reimbursementTotal,
        deductionTotal: item.deductionTotal,
        grossPay: item.grossPay,
        netPay: item.netPay,
      },
    }));
  }
  const input = await periodInputs(ctx, companyId, month, year, run?._id);
  return input.items.map(({ employee, ...amounts }): BaselineRow => ({
    employeeId: employee._id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    department: employee.department,
    amounts,
  }));
}

async function simulate(ctx: QueryCtx | MutationCtx, args: ScenarioArgs) {
  await requireCompany(ctx, args.companyId);
  validatePeriod(args.month, args.year);
  validateRaiseBasisPoints(args.raiseBasisPoints);
  const rows = await baselineRows(ctx, args.companyId, args.month, args.year);
  if (!rows.length) throw new Error('No eligible employees exist for this scenario period.');
  let subjectLabel = '';
  let targets: BaselineRow[] = [];
  if (args.targetType === 'employee') {
    if (!args.employeeId) throw new Error('Choose an employee for this scenario.');
    targets = rows.filter((row) => row.employeeId === args.employeeId);
    subjectLabel = targets[0]?.employeeName ?? '';
  } else {
    const department = args.department?.trim();
    if (!department) throw new Error('Choose a department for this scenario.');
    targets = rows.filter((row) => row.department === department);
    subjectLabel = department;
  }
  if (!targets.length)
    throw new Error('The selected target has no eligible employees this period.');
  const targetIds = new Set(targets.map((row) => row.employeeId));
  const affectedItems: Array<{
    employeeId: Id<'employees'>;
    employeeName: string;
    department: string;
    baselineBasePay: number;
    projectedBasePay: number;
    basePayChange: number;
    baselineNetPay: number;
    projectedNetPay: number;
    netPayChange: number;
  }> = [];
  const projectedRows = rows.map((row) => {
    if (!targetIds.has(row.employeeId)) return row.amounts;
    const raised = applyRaise(row.amounts.basePay, args.raiseBasisPoints);
    const projected = calculatePayroll(raised.projected, adjustmentTotals(row.amounts));
    affectedItems.push({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      department: row.department,
      baselineBasePay: row.amounts.basePay,
      projectedBasePay: projected.basePay,
      basePayChange: raised.change,
      baselineNetPay: row.amounts.netPay,
      projectedNetPay: projected.netPay,
      netPayChange: projected.netPay - row.amounts.netPay,
    });
    return projected;
  });
  const baseline = aggregatePayroll(rows.map((row) => row.amounts));
  const projected = aggregatePayroll(projectedRows);
  return {
    subjectLabel,
    affectedEmployeeCount: affectedItems.length,
    baselineBasePay: baseline.basePay,
    projectedBasePay: projected.basePay,
    basePayChange: projected.basePay - baseline.basePay,
    baselineNetPay: baseline.netPay,
    projectedNetPay: projected.netPay,
    netPayChange: projected.netPay - baseline.netPay,
    annualNetPayChange: addMoney(0, (projected.netPay - baseline.netPay) * 12),
    items: affectedItems.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
  };
}

export const list = query({
  args: { companyId: v.id('companies'), month: v.number(), year: v.number() },
  handler: async (ctx, { companyId, month, year }) => {
    await requireCompany(ctx, companyId);
    validatePeriod(month, year);
    return ctx.db
      .query('scenarios')
      .withIndex('by_company_period', (q) =>
        q.eq('companyId', companyId).eq('year', year).eq('month', month),
      )
      .order('desc')
      .collect();
  },
});

export const preview = query({
  args: simulationArgs,
  handler: (ctx, args) => simulate(ctx, args),
});

export const detail = query({
  args: { companyId: v.id('companies'), scenarioId: v.id('scenarios') },
  handler: async (ctx, { companyId, scenarioId }) => {
    await requireCompany(ctx, companyId);
    const scenario = await ctx.db.get(scenarioId);
    if (!scenario || scenario.companyId !== companyId) throw new Error('Scenario not found.');
    const items = await ctx.db
      .query('scenarioItems')
      .withIndex('by_scenario', (q) => q.eq('scenarioId', scenarioId))
      .collect();
    return { scenario, items };
  },
});

export const create = mutation({
  args: { ...simulationArgs, name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 3 || name.length > 100)
      throw new Error('Provide a scenario name between 3 and 100 characters.');
    const result = await simulate(ctx, args);
    const scenarioId = await ctx.db.insert('scenarios', {
      companyId: args.companyId,
      name,
      month: args.month,
      year: args.year,
      targetType: args.targetType,
      ...(args.employeeId ? { employeeId: args.employeeId } : {}),
      ...(args.department?.trim() ? { department: args.department.trim() } : {}),
      subjectLabel: result.subjectLabel,
      raiseBasisPoints: args.raiseBasisPoints,
      affectedEmployeeCount: result.affectedEmployeeCount,
      baselineBasePay: result.baselineBasePay,
      projectedBasePay: result.projectedBasePay,
      basePayChange: result.basePayChange,
      baselineNetPay: result.baselineNetPay,
      projectedNetPay: result.projectedNetPay,
      netPayChange: result.netPayChange,
      annualNetPayChange: result.annualNetPayChange,
      createdAt: Date.now(),
    });
    for (const item of result.items)
      await ctx.db.insert('scenarioItems', {
        companyId: args.companyId,
        scenarioId,
        ...item,
      });
    await recordActivity(
      ctx,
      args.companyId,
      'scenario',
      'saved',
      `Saved scenario “${name}” for ${result.subjectLabel}.`,
      scenarioId,
    );
    return scenarioId;
  },
});

export const discard = mutation({
  args: { companyId: v.id('companies'), scenarioId: v.id('scenarios') },
  handler: async (ctx, { companyId, scenarioId }) => {
    await requireCompany(ctx, companyId);
    const scenario = await ctx.db.get(scenarioId);
    if (!scenario || scenario.companyId !== companyId) throw new Error('Scenario not found.');
    const items = await ctx.db
      .query('scenarioItems')
      .withIndex('by_scenario', (q) => q.eq('scenarioId', scenarioId))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
    await ctx.db.delete(scenarioId);
    await recordActivity(
      ctx,
      companyId,
      'scenario',
      'discarded',
      `Discarded scenario “${scenario.name}”. No payroll data changed.`,
      scenarioId,
    );
    return scenarioId;
  },
});
