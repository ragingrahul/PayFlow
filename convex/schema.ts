import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
export const runStatus = v.union(
  v.literal('draft'),
  v.literal('calculating'),
  v.literal('ready_for_review'),
  v.literal('approved'),
  v.literal('processed'),
);
export const adjustmentType = v.union(
  v.literal('bonus'),
  v.literal('deduction'),
  v.literal('reimbursement'),
);
export const amounts = {
  basePay: v.number(),
  bonusTotal: v.number(),
  reimbursementTotal: v.number(),
  deductionTotal: v.number(),
  grossPay: v.number(),
  netPay: v.number(),
};
export default defineSchema({
  companies: defineTable({
    name: v.string(),
    slug: v.string(),
    currency: v.literal('INR'),
    country: v.literal('IN'),
    createdAt: v.number(),
  }).index('by_slug', ['slug']),
  employees: defineTable({
    companyId: v.id('companies'),
    employeeCode: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    department: v.string(),
    jobTitle: v.string(),
    employmentType: v.union(
      v.literal('full_time'),
      v.literal('part_time'),
      v.literal('contractor'),
    ),
    joiningDate: v.string(),
    status: v.union(v.literal('active'), v.literal('inactive')),
    baseMonthlySalary: v.number(),
    currency: v.literal('INR'),
    createdAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_company_code', ['companyId', 'employeeCode']),
  compensationRevisions: defineTable({
    companyId: v.id('companies'),
    employeeId: v.id('employees'),
    monthlySalary: v.number(),
    effectiveMonth: v.number(),
    effectiveYear: v.number(),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index('by_company', ['companyId'])
    .index('by_employee_period', ['employeeId', 'effectiveYear', 'effectiveMonth']),
  payrollRuns: defineTable({
    companyId: v.id('companies'),
    month: v.number(),
    year: v.number(),
    status: runStatus,
    totalBasePay: v.number(),
    totalBonuses: v.number(),
    totalReimbursements: v.number(),
    totalDeductions: v.number(),
    totalGrossPay: v.number(),
    totalNetPay: v.number(),
    employeeCount: v.number(),
    createdAt: v.number(),
    calculatedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
  }).index('by_company_period', ['companyId', 'year', 'month']),
  payrollItems: defineTable({
    companyId: v.id('companies'),
    payrollRunId: v.id('payrollRuns'),
    employeeId: v.id('employees'),
    employeeName: v.string(),
    employeeCode: v.string(),
    department: v.string(),
    jobTitle: v.string(),
    ...amounts,
    status: v.literal('calculated'),
  })
    .index('by_run', ['payrollRunId'])
    .index('by_employee', ['employeeId']),
  adjustments: defineTable({
    companyId: v.id('companies'),
    employeeId: v.id('employees'),
    payrollRunId: v.optional(v.id('payrollRuns')),
    type: adjustmentType,
    amount: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    effectiveMonth: v.number(),
    effectiveYear: v.number(),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    reviewedAt: v.optional(v.number()),
    reviewNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_company_period', ['companyId', 'effectiveYear', 'effectiveMonth'])
    .index('by_employee', ['employeeId']),
  scenarios: defineTable({
    companyId: v.id('companies'),
    name: v.string(),
    month: v.number(),
    year: v.number(),
    targetType: v.union(v.literal('employee'), v.literal('department')),
    employeeId: v.optional(v.id('employees')),
    department: v.optional(v.string()),
    subjectLabel: v.string(),
    raiseBasisPoints: v.number(),
    affectedEmployeeCount: v.number(),
    baselineBasePay: v.number(),
    projectedBasePay: v.number(),
    basePayChange: v.number(),
    baselineNetPay: v.number(),
    projectedNetPay: v.number(),
    netPayChange: v.number(),
    annualNetPayChange: v.number(),
    createdAt: v.number(),
  }).index('by_company_period', ['companyId', 'year', 'month']),
  scenarioItems: defineTable({
    companyId: v.id('companies'),
    scenarioId: v.id('scenarios'),
    employeeId: v.id('employees'),
    employeeName: v.string(),
    department: v.string(),
    baselineBasePay: v.number(),
    projectedBasePay: v.number(),
    basePayChange: v.number(),
    baselineNetPay: v.number(),
    projectedNetPay: v.number(),
    netPayChange: v.number(),
  })
    .index('by_scenario', ['scenarioId'])
    .index('by_employee', ['employeeId']),
  activityEvents: defineTable({
    companyId: v.id('companies'),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    action: v.string(),
    message: v.string(),
    metadata: v.optional(
      v.object({
        previousAmount: v.optional(v.number()),
        newAmount: v.optional(v.number()),
        month: v.optional(v.number()),
        year: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
  }).index('by_company', ['companyId']),
});
