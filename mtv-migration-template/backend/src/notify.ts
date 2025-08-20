import type { Express, Request, Response } from 'express';
import nodemailer from 'nodemailer';

function isMock() { return String(process.env.MOCK).toLowerCase() === 'true'; }

export function registerNotifyRoutes(app: Express) {
  app.post('/api/notify/email', async (req: Request, res: Response) => {
    try {
      const { recipients = [], subject = 'VM Migration Notice', body = '' } = req.body || {};

      if (isMock()) {
        return res.json({ ok: true, mocked: true, recipients });
      }

      const host = process.env.SMTP_HOST as string;
      const port = Number(process.env.SMTP_PORT || 25);
      const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
      const user = process.env.SMTP_USER as string;
      const pass = process.env.SMTP_PASS as string;
      const from = process.env.EMAIL_FROM as string;

      const transporter = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined });
      await transporter.sendMail({ from, to: recipients.join(','), subject, text: body });
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Email send error' });
    }
  });
}