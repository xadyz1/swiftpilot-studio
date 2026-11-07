import nodemailer, { type Transporter } from 'nodemailer';
import { z } from 'zod';
import { StudioError } from './safety';

/**
 * SMTP mailer for transactional studio notifications (onboarding complete,
 * generation finished, invites). Env-gated: without SMTP_HOST the endpoint
 * reports "not configured" instead of failing loudly.
 */
const notifySchema = z.object({
  to: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(8000),
  html: z.string().trim().max(24000).optional(),
}).strict();

export function mailConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!((env.SMTP_HOST ?? '').trim() && (env.SMTP_USER ?? '').trim());
}

let _transport: Transporter | null = null;
function transport(): Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return _transport;
}

export async function sendNotify(input: unknown): Promise<{ sent: boolean; skipped?: string }> {
  const parsed = notifySchema.safeParse(input);
  if (!parsed.success) throw new StudioError('Invalid notification payload. Provide to, subject and text.', 400);
  if (!mailConfigured()) return { sent: false, skipped: 'SMTP is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.' };
  try {
    await transport().sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: parsed.data.to,
      subject: parsed.data.subject,
      text: parsed.data.text,
      ...(parsed.data.html ? { html: parsed.data.html } : {}),
    });
    return { sent: true };
  } catch {
    throw new StudioError('The email could not be sent. Check your SMTP configuration.', 502);
  }
}
