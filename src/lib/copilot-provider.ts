import { addMoney, money, parseInr, type AdjustmentType } from './payroll';

export type CopilotProvider = 'openai' | 'inkeep';

export type CopilotContext = {
  company: { id: string; name: string; currency: 'INR' };
  period: { month: number; year: number };
  runStatus: string;
  totals: {
    basePay: number;
    bonusTotal: number;
    reimbursementTotal: number;
    deductionTotal: number;
    grossPay: number;
    netPay: number;
  };
  previous: {
    month: number;
    year: number;
    status: string;
    netPay: number;
    employeeCount: number;
  } | null;
  people: Array<{
    id: string;
    name: string;
    code: string;
    email: string;
    department?: string;
    jobTitle?: string;
    employmentType?: string;
    basePay: number;
    netPay: number;
  }>;
  adjustments: Array<{
    type: AdjustmentType;
    amount: number;
    title: string;
    status: 'pending' | 'approved' | 'rejected';
    employeeName: string;
  }>;
  history: Array<{ role: 'user' | 'assistant'; content: string; kind: string }>;
};

export type CopilotProposalDraft = {
  employeeId: string;
  employeeName: string;
  adjustmentType: AdjustmentType;
  amount: number;
  title: string;
  rationale: string;
};

type JsonObject = Record<string, unknown>;

export const responseTools = [
  {
    type: 'function' as const,
    name: 'get_payroll_context',
    description:
      'Get authoritative totals, run status, department totals, and previous-month comparison for the selected payroll period.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function' as const,
    name: 'find_employees',
    description:
      'Find eligible employees by name, employee code, email, department, job title, or employment type.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'A name, code, email, department, or role.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function' as const,
    name: 'list_adjustments',
    description:
      'List bonus, reimbursement, and deduction records for the selected period using deterministic stored amounts.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'pending', 'approved', 'rejected'],
          description: 'Adjustment status filter.',
        },
        minimumAmountInr: {
          type: 'string',
          description:
            'Minimum INR amount using digits and optional two decimals, or 0 for no minimum.',
        },
      },
      required: ['status', 'minimumAmountInr'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function' as const,
    name: 'prepare_adjustment_proposal',
    description:
      'Prepare one review-only bonus, reimbursement, or deduction proposal. This never writes payroll data.',
    parameters: {
      type: 'object',
      properties: {
        employeeQuery: {
          type: 'string',
          description: 'Employee name, exact employee code, or exact employee email.',
        },
        adjustmentType: {
          type: 'string',
          enum: ['bonus', 'reimbursement', 'deduction'],
        },
        amountInr: {
          type: 'string',
          description:
            'Positive INR amount using digits and optional two decimals, without symbols or commas.',
        },
        title: { type: 'string', description: 'Short business reason, at most 120 characters.' },
        rationale: {
          type: 'string',
          description: 'A concise explanation of how this proposal matches the user request.',
        },
      },
      required: ['employeeQuery', 'adjustmentType', 'amountInr', 'title', 'rationale'],
      additionalProperties: false,
    },
    strict: true,
  },
] as const;

export const chatCompletionTools = responseTools.map((tool) => ({
  type: 'function' as const,
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: true,
  },
}));

export const copilotInstructions = `You are PayFlow Copilot for an Indian payroll operations demo.
Use tools for every payroll fact. Never invent employee names, amounts, totals, or status.
Money returned by tools is integer paise; format it as INR for people.
You may answer questions and prepare exactly one adjustment proposal for a bonus, reimbursement, or deduction.
Never claim to apply, approve, finalize, or pay anything. prepare_adjustment_proposal creates only a review card.
If a target or amount is unclear, ask one concise clarification question instead of guessing.
When a proposal tool succeeds, explain the proposal and remind the user that confirmation creates a pending adjustment that still needs approval in Adjustments.
Keep answers concise and use plain text without markdown tables.`;

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Tool arguments must be an object.');
  return value as JsonObject;
}

function textArg(args: JsonObject, key: string, maximum = 500) {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum)
    throw new Error(`${key} is invalid.`);
  return value.trim();
}

function employeeMatches(context: CopilotContext, query: string) {
  const needle = query.toLocaleLowerCase('en-IN');
  const exact = context.people.filter((person) =>
    [person.name, person.code, person.email].some(
      (value) => value.toLocaleLowerCase('en-IN') === needle,
    ),
  );
  if (exact.length) return exact;
  return context.people.filter((person) =>
    [
      person.name,
      person.code,
      person.email,
      person.department ?? '',
      person.jobTitle ?? '',
      person.employmentType ?? '',
    ].some((value) => value.toLocaleLowerCase('en-IN').includes(needle)),
  );
}

export function executeCopilotTool(
  context: CopilotContext,
  name: string,
  rawArguments: unknown,
): { output: JsonObject; proposal?: CopilotProposalDraft } {
  try {
    const args = object(rawArguments);
    if (name === 'get_payroll_context') {
      const departments = Object.values(
        context.people.reduce<Record<string, { name: string; count: number; netPay: number }>>(
          (groups, person) => {
            const department = person.department ?? 'Unknown';
            const group = groups[department] ?? { name: department, count: 0, netPay: 0 };
            group.count += 1;
            group.netPay = addMoney(group.netPay, person.netPay);
            groups[department] = group;
            return groups;
          },
          {},
        ),
      );
      return {
        output: {
          period: context.period,
          runStatus: context.runStatus,
          employeeCount: context.people.length,
          totals: context.totals,
          departments,
          previous: context.previous,
        },
      };
    }
    if (name === 'find_employees') {
      const matches = employeeMatches(context, textArg(args, 'query', 160));
      return {
        output: {
          count: matches.length,
          employees: matches.map(
            ({ id, name, code, email, department, jobTitle, basePay, netPay }) => ({
              id,
              name,
              code,
              email,
              department,
              jobTitle,
              basePay,
              netPay,
            }),
          ),
        },
      };
    }
    if (name === 'list_adjustments') {
      const status = textArg(args, 'status', 20);
      if (!['all', 'pending', 'approved', 'rejected'].includes(status))
        throw new Error('status is invalid.');
      const minimumText = textArg(args, 'minimumAmountInr', 40);
      const minimum = minimumText === '0' ? 0 : parseInr(minimumText);
      const adjustments = context.adjustments.filter(
        (adjustment) =>
          (status === 'all' || adjustment.status === status) && adjustment.amount >= minimum,
      );
      return { output: { count: adjustments.length, adjustments } };
    }
    if (name === 'prepare_adjustment_proposal') {
      if (!['projected', 'draft'].includes(context.runStatus))
        throw new Error(
          'The selected payroll is already calculated. Choose a draft or future period.',
        );
      const matches = employeeMatches(context, textArg(args, 'employeeQuery', 160));
      if (matches.length !== 1)
        throw new Error(
          matches.length
            ? `Employee target is ambiguous. Matching employees: ${matches.map((item) => item.name).join(', ')}.`
            : 'No eligible employee matches that target.',
        );
      const adjustmentType = textArg(args, 'adjustmentType', 30) as AdjustmentType;
      if (!['bonus', 'reimbursement', 'deduction'].includes(adjustmentType))
        throw new Error('Adjustment type is invalid.');
      const amount = parseInr(textArg(args, 'amountInr', 40));
      if (amount === 0) throw new Error('Adjustment amount must be greater than zero.');
      const title = textArg(args, 'title', 120);
      const rationale = textArg(args, 'rationale', 500);
      const employee = matches[0];
      if (adjustmentType === 'deduction' && employee.netPay < amount)
        throw new Error('That deduction would make the employee’s take-home pay negative.');
      const projectedNetPay =
        adjustmentType === 'deduction'
          ? money(context.totals.netPay - amount, 'Projected payroll')
          : addMoney(context.totals.netPay, amount);
      const proposal: CopilotProposalDraft = {
        employeeId: employee.id,
        employeeName: employee.name,
        adjustmentType,
        amount,
        title,
        rationale,
      };
      return {
        proposal,
        output: {
          status: 'ready_for_human_review',
          employee: { id: employee.id, name: employee.name },
          adjustmentType,
          amount,
          title,
          baselineNetPay: context.totals.netPay,
          projectedNetPay,
          effectIfLaterApproved: adjustmentType === 'deduction' ? -amount : amount,
          nextStep:
            'Show the review card. Do not create an adjustment until the user explicitly confirms.',
        },
      };
    }
    throw new Error(`Unknown tool: ${name}.`);
  } catch (error) {
    return {
      output: {
        error: error instanceof Error ? error.message : 'The tool input was invalid.',
        instruction: 'Correct the request or ask the user for clarification. Do not guess.',
      },
    };
  }
}
