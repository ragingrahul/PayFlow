// Read-only integration check against the configured, running Convex deployment.
import assert from 'node:assert/strict';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
assert(url, 'Set NEXT_PUBLIC_CONVEX_URL in .env.local.');
const client = new ConvexHttpClient(url);
const query = (name, args = {}) => client.query(makeFunctionReference(name), args);
const company = await query('workspace:current');
assert(company, 'Run npm run seed first.');
const args = { companyId: company._id };
const people = await query('employees:list', args);
assert.equal(people.length, 24);
const dashboard = await query('dashboard:summary', { ...args, month: 9, year: 2026 });
assert.equal(dashboard.employeeCount, 24);
const runs = await query('payroll:list', args);
const september = runs.find((r) => r.month === 9 && r.year === 2026);
assert(september, 'Create and calculate September payroll in the UI before this check.');
assert.equal(september.status, 'ready_for_review');
const detail = await query('payroll:detail', { ...args, runId: september._id });
assert.equal(detail.items.length, 24);
assert.equal(
  detail.items.reduce((sum, i) => sum + i.netPay, 0),
  september.totalNetPay,
);
assert.equal(dashboard.netPay, september.totalNetPay);
assert.equal(
  september.totalNetPay,
  september.totalBasePay +
    september.totalBonuses +
    september.totalReimbursements -
    september.totalDeductions,
);
assert(
  dashboard.activity.some((a) => a.action === 'calculated'),
  'Expected payroll activity.',
);
const ananya = people.find((p) => p.firstName === 'Ananya');
const employee = await query('employees:detail', { ...args, employeeId: ananya._id });
assert(employee.history.some((h) => h.run?.month === 9));
console.log(
  'PASS: 24 employees, September payroll items/totals, dashboard, activity, and employee history persisted in Convex.',
);
console.log(`September total: ${september.totalNetPay} paise.`);
