import OpenAI from 'openai';
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import type { ResponseInput, Tool } from 'openai/resources/responses/responses';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import {
  chatCompletionTools,
  copilotInstructions,
  executeCopilotTool,
  responseTools,
  type CopilotContext,
  type CopilotProposalDraft,
  type CopilotProvider,
} from '@/lib/copilot-provider';

export const runtime = 'nodejs';

type RequestBody = {
  companyId: string;
  month: number;
  year: number;
  message: string;
  threadId?: string;
};

type ProviderResult = {
  assistantText: string;
  proposal?: CopilotProposalDraft;
};

function provider(): CopilotProvider {
  return process.env.COPILOT_PROVIDER?.toLowerCase() === 'inkeep' ? 'inkeep' : 'openai';
}

function configuration() {
  const selected = provider();
  const missing =
    selected === 'openai'
      ? process.env.OPENAI_API_KEY
        ? []
        : ['OPENAI_API_KEY']
      : [
          !process.env.INKEEP_API_KEY && 'INKEEP_API_KEY',
          !process.env.INKEEP_BASE_URL && 'INKEEP_BASE_URL',
          !process.env.INKEEP_AGENT_ID && 'INKEEP_AGENT_ID',
        ].filter((item): item is string => Boolean(item));
  return {
    provider: selected,
    configured: missing.length === 0,
    missing,
    model:
      selected === 'openai'
        ? process.env.OPENAI_MODEL || 'gpt-5-mini'
        : process.env.INKEEP_AGENT_ID || null,
  };
}

function requestBody(value: unknown): RequestBody {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Request body is invalid.');
  const body = value as Record<string, unknown>;
  if (typeof body.companyId !== 'string' || !body.companyId)
    throw new Error('Company is required.');
  if (!Number.isInteger(body.month) || !Number.isInteger(body.year))
    throw new Error('Payroll period is invalid.');
  if (
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.trim().length > 2_000
  )
    throw new Error('Message must be between 1 and 2,000 characters.');
  if (body.threadId !== undefined && typeof body.threadId !== 'string')
    throw new Error('Conversation is invalid.');
  return {
    companyId: body.companyId,
    month: body.month as number,
    year: body.year as number,
    message: body.message.trim(),
    ...(body.threadId ? { threadId: body.threadId } : {}),
  };
}

function historyInput(context: CopilotContext, message: string): ResponseInput {
  return [
    ...context.history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: 'user' as const, content: message },
  ];
}

async function runOpenAI(context: CopilotContext, message: string): Promise<ProviderResult> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45_000,
    maxRetries: 1,
  });
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const tools = responseTools as unknown as Tool[];
  const input = historyInput(context, message);
  let proposal: CopilotProposalDraft | undefined;
  for (let turn = 0; turn < 5; turn++) {
    const response = await client.responses.create({
      model,
      instructions: copilotInstructions,
      input,
      tools,
      store: false,
    });
    const calls = response.output.filter((item) => item.type === 'function_call');
    if (!calls.length) {
      const assistantText = response.output_text.trim();
      if (!assistantText) throw new Error('The provider returned an empty response.');
      return { assistantText, ...(proposal ? { proposal } : {}) };
    }
    input.push(...toResponseInputItems(response.output));
    for (const call of calls) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(call.arguments);
      } catch {
        parsed = {};
      }
      const result = executeCopilotTool(context, call.name, parsed);
      if (result.proposal) proposal = result.proposal;
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(result.output),
      });
    }
  }
  throw new Error('The provider exceeded the tool-call limit. Try a simpler request.');
}

type InkeepMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

type InkeepResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
  }>;
  error?: { message?: string } | string;
};

async function readInkeepResponse(response: Response): Promise<InkeepResponse> {
  const raw = await response.text();
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    try {
      return JSON.parse(raw) as InkeepResponse;
    } catch {
      return { error: raw || `Inkeep returned HTTP ${response.status}.` };
    }
  }
  let content = '';
  const calls = new Map<
    number,
    { id: string; type: 'function'; function: { name: string; arguments: string } }
  >();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const value = line.slice(5).trim();
    if (!value || value === '[DONE]') continue;
    try {
      const event = JSON.parse(value) as {
        type?: string;
        delta?: string;
        choices?: Array<{
          message?: InkeepResponse['choices'] extends Array<infer Choice>
            ? Choice extends { message?: infer Message }
              ? Message
              : never
            : never;
          delta?: {
            content?: string;
            tool_calls?: Array<{
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      };
      if (event.type === 'text-delta' && event.delta) content += event.delta;
      const choice = event.choices?.[0];
      if (choice?.message) return { choices: [{ message: choice.message }] };
      if (choice?.delta?.content) content += choice.delta.content;
      for (const part of choice?.delta?.tool_calls ?? []) {
        const current = calls.get(part.index) ?? {
          id: '',
          type: 'function' as const,
          function: { name: '', arguments: '' },
        };
        if (part.id) current.id = part.id;
        if (part.function?.name) current.function.name += part.function.name;
        if (part.function?.arguments) current.function.arguments += part.function.arguments;
        calls.set(part.index, current);
      }
    } catch {
      continue;
    }
  }
  return {
    choices: [
      {
        message: {
          content: content || null,
          tool_calls: calls.size ? [...calls.values()] : undefined,
        },
      },
    ],
  };
}

async function runInkeep(context: CopilotContext, message: string): Promise<ProviderResult> {
  const baseUrl = process.env.INKEEP_BASE_URL!.replace(/\/$/, '');
  const messages: InkeepMessage[] = [
    { role: 'system', content: copilotInstructions },
    ...context.history.map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: message },
  ];
  let proposal: CopilotProposalDraft | undefined;
  for (let turn = 0; turn < 5; turn++) {
    const response = await fetch(`${baseUrl}/run/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.INKEEP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.INKEEP_AGENT_ID,
        messages,
        tools: chatCompletionTools,
        stream: false,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const payload = await readInkeepResponse(response);
    if (!response.ok)
      throw new Error(
        typeof payload.error === 'string'
          ? payload.error
          : payload.error?.message || `Inkeep returned HTTP ${response.status}.`,
      );
    const assistant = payload.choices?.[0]?.message;
    if (!assistant) throw new Error('Inkeep returned an invalid response.');
    const calls = assistant.tool_calls ?? [];
    if (!calls.length) {
      const assistantText = assistant.content?.trim();
      if (!assistantText) throw new Error('Inkeep returned an empty response.');
      return { assistantText, ...(proposal ? { proposal } : {}) };
    }
    messages.push({ role: 'assistant', content: assistant.content ?? null, tool_calls: calls });
    for (const call of calls) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch {
        parsed = {};
      }
      const result = executeCopilotTool(context, call.function.name, parsed);
      if (result.proposal) proposal = result.proposal;
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result.output),
      });
    }
  }
  throw new Error('Inkeep exceeded the tool-call limit. Try a simpler request.');
}

export async function GET() {
  return Response.json(configuration());
}

export async function POST(request: Request) {
  try {
    const config = configuration();
    if (!config.configured)
      return Response.json(
        {
          error: `Copilot is not configured. Add ${config.missing.join(', ')} to .env.local and restart Next.js.`,
          configuration: config,
        },
        { status: 503 },
      );
    const body = requestBody(await request.json());
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
    const convex = new ConvexHttpClient(convexUrl);
    const context = (await convex.query(api.copilot.aiContext, {
      companyId: body.companyId as Id<'companies'>,
      month: body.month,
      year: body.year,
      ...(body.threadId ? { threadId: body.threadId as Id<'copilotThreads'> } : {}),
    })) as CopilotContext;
    const result =
      config.provider === 'inkeep'
        ? await runInkeep(context, body.message)
        : await runOpenAI(context, body.message);
    return Response.json({ provider: config.provider, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Copilot request failed.';
    const status = /required|invalid|between 1/.test(message) ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
