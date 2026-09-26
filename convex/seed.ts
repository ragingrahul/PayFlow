import { internalMutation } from './_generated/server';
import { createDraft, generateRun, recordActivity } from './payrollService';
import { assertTransition } from '../src/lib/payroll';
const people = [
  ['Ananya', 'Sharma', 'Engineering', 'Engineering Lead', 160000],
  ['Arjun', 'Mehta', 'Engineering', 'Senior Software Engineer', 135000],
  ['Priya', 'Nair', 'Engineering', 'Product Engineer', 110000],
  ['Rohan', 'Gupta', 'Engineering', 'Software Engineer', 90000],
  ['Kavya', 'Iyer', 'Engineering', 'Product Designer', 95000],
  ['Vikram', 'Rao', 'Engineering', 'Platform Engineer', 125000],
  ['Neha', 'Patel', 'Engineering', 'QA Engineer', 70000],
  ['Aditya', 'Verma', 'Engineering', 'Frontend Engineer', 100000],
  ['Ishaan', 'Malhotra', 'Sales', 'Head of Sales', 140000],
  ['Sneha', 'Reddy', 'Sales', 'Account Executive', 85000],
  ['Karan', 'Singh', 'Sales', 'Account Executive', 75000],
  ['Meera', 'Joshi', 'Sales', 'Sales Development Rep', 50000],
  ['Aditi', 'Desai', 'Operations', 'Operations Lead', 105000],
  ['Rahul', 'Sarma', 'Operations', 'Business Operations', 65000],
  ['Pooja', 'Shah', 'Operations', 'People Partner', 80000],
  ['Dev', 'Kapoor', 'Operations', 'Recruiting Consultant', 60000],
  ['Siddharth', 'Bose', 'Finance', 'Finance Lead', 130000],
  ['Divya', 'Menon', 'Finance', 'Financial Analyst', 85000],
  ['Nikhil', 'Jain', 'Finance', 'Accounts Associate', 55000],
  ['Sana', 'Khan', 'Customer Support', 'Customer Success Lead', 90000],
  ['Aman', 'Chopra', 'Customer Support', 'Support Specialist', 45000],
  ['Tara', 'Das', 'Customer Support', 'Support Specialist', 45000],
  ['Yash', 'Kulkarni', 'Customer Support', 'Support Specialist', 42000],
  ['Anika', 'Pillai', 'Customer Support', 'Customer Success Associate', 48000],
] as const;
/** Explicit CLI-only, idempotent demo initialization. Never deletes an existing workspace. */
export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('companies')
      .withIndex('by_slug', (q) => q.eq('slug', 'acme-studio'))
      .unique();
    if (existing) return { companyId: existing._id, seeded: false };
    const companyId = await ctx.db.insert('companies', {
      name: 'Acme Studio',
      slug: 'acme-studio',
      currency: 'INR',
      country: 'IN',
      createdAt: Date.UTC(2026, 0, 1),
    });
    const ids = [];
    for (const [i, p] of people.entries()) {
      const joiningDate =
        i === 23 ? '2026-09-07' : `2025-${String((i % 10) + 1).padStart(2, '0')}-10`;
      const employeeId = await ctx.db.insert('employees', {
        companyId,
        employeeCode: `PF-${String(i + 1).padStart(3, '0')}`,
        firstName: p[0],
        lastName: p[1],
        email: `${p[0].toLowerCase()}.${p[1].toLowerCase()}@acme.example`,
        department: p[2],
        jobTitle: p[3],
        employmentType: i === 15 || i === 22 ? 'contractor' : i === 23 ? 'part_time' : 'full_time',
        joiningDate,
        status: 'active',
        baseMonthlySalary: p[4] * 100,
        currency: 'INR',
        createdAt: Date.UTC(2026, 7, 1),
      });
      ids.push(employeeId);
      const [effectiveYear, effectiveMonth] = joiningDate.split('-').map(Number);
      await ctx.db.insert('compensationRevisions', {
        companyId,
        employeeId,
        monthlySalary: p[4] * 100,
        effectiveMonth,
        effectiveYear,
        reason: 'Starting monthly compensation',
        createdAt: Date.UTC(effectiveYear, effectiveMonth - 1, 1),
      });
    }
    const aug = await createDraft(ctx, companyId, 8, 2026);
    await ctx.db.insert('adjustments', {
      companyId,
      employeeId: ids[8],
      type: 'bonus',
      amount: 2500000,
      title: 'August sales commission',
      effectiveMonth: 8,
      effectiveYear: 2026,
      status: 'approved',
      createdAt: Date.UTC(2026, 7, 25),
    });
    const augustRun = await ctx.db.get(aug);
    await generateRun(ctx, augustRun!);
    assertTransition('ready_for_review', 'approved');
    await ctx.db.patch(aug, { status: 'approved', approvedAt: Date.UTC(2026, 7, 28) });
    assertTransition('approved', 'processed');
    await ctx.db.patch(aug, { status: 'processed' });
    // A genuine salary change after August snapshot, with audit history.
    await ctx.db.patch(ids[2], { baseMonthlySalary: 11500000 });
    await ctx.db.insert('compensationRevisions', {
      companyId,
      employeeId: ids[2],
      monthlySalary: 11500000,
      effectiveMonth: 9,
      effectiveYear: 2026,
      reason: 'Performance salary revision',
      createdAt: Date.UTC(2026, 8, 1),
    });
    await ctx.db.insert('activityEvents', {
      companyId,
      entityType: 'employee',
      entityId: ids[2],
      action: 'salary_changed',
      message: 'Priya Nair’s monthly salary increased to ₹1,15,000 for September.',
      metadata: { previousAmount: 11000000, newAmount: 11500000 },
      createdAt: Date.UTC(2026, 8, 1),
    });
    const adjustments = [
      { i: 0, type: 'bonus', amount: 2000000, title: 'Performance bonus' },
      { i: 8, type: 'bonus', amount: 3500000, title: 'Quarterly sales commission' },
      { i: 9, type: 'bonus', amount: 1500000, title: 'New account incentive' },
      { i: 4, type: 'reimbursement', amount: 125050, title: 'Design tools reimbursement' },
      { i: 13, type: 'reimbursement', amount: 850000, title: 'Client travel reimbursement' },
      { i: 2, type: 'reimbursement', amount: 320000, title: 'Home office setup' },
      { i: 3, type: 'deduction', amount: 300000, title: 'Salary advance recovery' },
      { i: 10, type: 'deduction', amount: 150000, title: 'Equipment purchase recovery' },
    ] as const;
    for (const [index, a] of adjustments.entries())
      await ctx.db.insert('adjustments', {
        companyId,
        employeeId: ids[a.i],
        type: a.type,
        amount: a.amount,
        title: a.title,
        effectiveMonth: 9,
        effectiveYear: 2026,
        status: 'approved',
        createdAt: Date.UTC(2026, 8, 18 + index),
      });
    await ctx.db.insert('adjustments', {
      companyId,
      employeeId: ids[5],
      type: 'bonus',
      amount: 2500000,
      title: 'Pending infrastructure milestone bonus',
      effectiveMonth: 9,
      effectiveYear: 2026,
      status: 'pending',
      createdAt: Date.UTC(2026, 8, 25),
    });
    // October draft demonstrates the next cycle; September stays absent for the success workflow.
    await createDraft(ctx, companyId, 10, 2026);
    await recordActivity(
      ctx,
      companyId,
      'employee',
      'joined',
      'Anika Pillai joined Customer Support.',
    );
    await recordActivity(
      ctx,
      companyId,
      'adjustment',
      'approved',
      'September bonuses, reimbursements, and deductions are ready.',
    );
    await recordActivity(
      ctx,
      companyId,
      'company',
      'seeded',
      'Acme Studio demo workspace is ready.',
    );
    return { companyId, seeded: true };
  },
});
