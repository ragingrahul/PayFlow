import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

export const runtime = 'nodejs';

function configuration() {
  const missing = [
    !process.env.RESEND_API_KEY && 'RESEND_API_KEY',
    !process.env.RESEND_FROM_EMAIL && 'RESEND_FROM_EMAIL',
  ].filter((item): item is string => Boolean(item));
  return { configured: missing.length === 0, missing };
}

function formatInr(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!,
  );
}

function body(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Request body is invalid.');
  const record = value as Record<string, unknown>;
  if (typeof record.companyId !== 'string' || !record.companyId)
    throw new Error('Company is required.');
  if (typeof record.payrollItemId !== 'string' || !record.payrollItemId)
    throw new Error('Payslip is required.');
  return { companyId: record.companyId, payrollItemId: record.payrollItemId };
}

export async function GET() {
  return Response.json(configuration());
}

export async function POST(request: Request) {
  const config = configuration();
  if (!config.configured)
    return Response.json(
      {
        error: `Payslip email is not configured. Add ${config.missing.join(', ')} to .env.local and restart Next.js.`,
        configuration: config,
      },
      { status: 503 },
    );
  let convex: ConvexHttpClient | null = null;
  let companyId: Id<'companies'> | null = null;
  let deliveryId: Id<'payslipDeliveries'> | null = null;
  try {
    const requestBody = body(await request.json());
    companyId = requestBody.companyId as Id<'companies'>;
    const payrollItemId = requestBody.payrollItemId as Id<'payrollItems'>;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
    convex = new ConvexHttpClient(convexUrl);
    const payload = await convex.query(api.payslips.deliveryPayload, {
      companyId,
      payrollItemId,
    });
    deliveryId = await convex.mutation(api.payslips.beginDelivery, {
      companyId,
      payrollItemId,
    });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(
      /\/$/,
      '',
    );
    const payslipUrl = `${appUrl}/portal/${payload.employee.id}/payslips/${payload.item.id}`;
    const employeeName = `${payload.employee.firstName} ${payload.employee.lastName}`;
    const period = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(payload.run.year, payload.run.month - 1, 1)));
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `payflow-payslip-${deliveryId}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [payload.employee.email],
        subject: `${period} payslip from ${payload.company.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1c2723">
            <p style="color:#176c50;font-weight:700">PayFlow</p>
            <h1 style="font-size:24px">Your ${escapeHtml(period)} payslip is ready</h1>
            <p>Hello ${escapeHtml(payload.employee.firstName)},</p>
            <p>${escapeHtml(payload.company.name)} finalized your payroll record. Your net pay is <strong>${escapeHtml(formatInr(payload.item.netPay))}</strong>.</p>
            <p><a href="${escapeHtml(payslipUrl)}" style="display:inline-block;background:#176c50;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">View payslip</a></p>
            <p style="color:#64716c;font-size:12px">This hackathon MVP records payroll information only and does not initiate a bank transfer.</p>
          </div>`,
        text: `Hello ${employeeName}, your ${period} payslip from ${payload.company.name} is ready. Net pay: ${formatInr(payload.item.netPay)}. View: ${payslipUrl}. No bank transfer was initiated by PayFlow.`,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const result = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: { message?: string };
    };
    if (!response.ok || !result.id)
      throw new Error(
        result.error?.message || result.message || `Resend returned HTTP ${response.status}.`,
      );
    await convex.mutation(api.payslips.completeDelivery, {
      companyId,
      deliveryId,
      status: 'sent',
      providerMessageId: result.id,
    });
    return Response.json({ delivered: true, recipient: payload.employee.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payslip email failed.';
    if (convex && companyId && deliveryId) {
      try {
        await convex.mutation(api.payslips.completeDelivery, {
          companyId,
          deliveryId,
          status: 'failed',
          error: message,
        });
      } catch {
        // The original provider or validation error is the useful response.
      }
    }
    const status = /required|invalid|not found|only after/.test(message.toLowerCase()) ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}
