import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { recordActivity, requireCompany } from './payrollService';

async function payslipRecord(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<'companies'>,
  payrollItemId: Id<'payrollItems'>,
) {
  const company = await requireCompany(ctx, companyId);
  const item = await ctx.db.get(payrollItemId);
  if (!item || item.companyId !== companyId) throw new Error('Payslip not found.');
  const run = await ctx.db.get(item.payrollRunId);
  if (!run || run.companyId !== companyId || run.status !== 'processed')
    throw new Error('Payslips are available only after payroll is finalized.');
  const employee = await ctx.db.get(item.employeeId);
  if (!employee || employee.companyId !== companyId)
    throw new Error('Employee record for this payslip is unavailable.');
  const deliveries = await ctx.db
    .query('payslipDeliveries')
    .withIndex('by_item', (q) => q.eq('payrollItemId', payrollItemId))
    .collect();
  return {
    company,
    employee,
    run,
    item,
    deliveries: deliveries.sort((a, b) => b.createdAt - a.createdAt),
  };
}

export const listForEmployee = query({
  args: { companyId: v.id('companies'), employeeId: v.id('employees') },
  handler: async (ctx, { companyId, employeeId }) => {
    await requireCompany(ctx, companyId);
    const employee = await ctx.db.get(employeeId);
    if (!employee || employee.companyId !== companyId)
      throw new Error('Employee not found in this company.');
    const items = await ctx.db
      .query('payrollItems')
      .withIndex('by_employee', (q) => q.eq('employeeId', employeeId))
      .collect();
    const results = await Promise.all(
      items.map(async (item) => ({ item, run: await ctx.db.get(item.payrollRunId) })),
    );
    return results
      .filter(({ run }) => run?.companyId === companyId && run.status === 'processed')
      .sort(
        (a, b) =>
          (b.run?.year ?? 0) * 12 +
          (b.run?.month ?? 0) -
          ((a.run?.year ?? 0) * 12 + (a.run?.month ?? 0)),
      );
  },
});

export const detail = query({
  args: { companyId: v.id('companies'), payrollItemId: v.id('payrollItems') },
  handler: (ctx, { companyId, payrollItemId }) => payslipRecord(ctx, companyId, payrollItemId),
});

export const deliveryPayload = query({
  args: { companyId: v.id('companies'), payrollItemId: v.id('payrollItems') },
  handler: async (ctx, { companyId, payrollItemId }) => {
    const { company, employee, run, item } = await payslipRecord(ctx, companyId, payrollItemId);
    return {
      company: { name: company.name },
      employee: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
      },
      run: { month: run.month, year: run.year },
      item: {
        id: item._id,
        employeeCode: item.employeeCode,
        employeeName: item.employeeName,
        department: item.department,
        jobTitle: item.jobTitle,
        basePay: item.basePay,
        bonusTotal: item.bonusTotal,
        reimbursementTotal: item.reimbursementTotal,
        deductionTotal: item.deductionTotal,
        grossPay: item.grossPay,
        netPay: item.netPay,
      },
    };
  },
});

export const beginDelivery = mutation({
  args: { companyId: v.id('companies'), payrollItemId: v.id('payrollItems') },
  handler: async (ctx, { companyId, payrollItemId }) => {
    const { employee, run } = await payslipRecord(ctx, companyId, payrollItemId);
    return ctx.db.insert('payslipDeliveries', {
      companyId,
      payrollRunId: run._id,
      payrollItemId,
      employeeId: employee._id,
      recipient: employee.email,
      status: 'sending',
      createdAt: Date.now(),
    });
  },
});

export const completeDelivery = mutation({
  args: {
    companyId: v.id('companies'),
    deliveryId: v.id('payslipDeliveries'),
    status: v.union(v.literal('sent'), v.literal('failed')),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCompany(ctx, args.companyId);
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery || delivery.companyId !== args.companyId)
      throw new Error('Payslip delivery record not found.');
    if (delivery.status !== 'sending') throw new Error('Payslip delivery is already complete.');
    const item = await ctx.db.get(delivery.payrollItemId);
    await ctx.db.patch(args.deliveryId, {
      status: args.status,
      ...(args.providerMessageId
        ? { providerMessageId: args.providerMessageId.slice(0, 200) }
        : {}),
      ...(args.error ? { error: args.error.trim().slice(0, 500) } : {}),
      completedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      args.companyId,
      'payslip',
      args.status === 'sent' ? 'emailed' : 'email_failed',
      args.status === 'sent'
        ? `Emailed ${item?.employeeName ?? 'employee'}’s payslip to ${delivery.recipient}.`
        : `Payslip email to ${delivery.recipient} failed.`,
      delivery.payrollItemId,
    );
    return args.deliveryId;
  },
});
