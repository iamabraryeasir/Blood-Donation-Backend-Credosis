import path from 'node:path';
import ejs from 'ejs';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendTemplateEmailOptions<T extends Record<string, unknown>> {
  to: string | string[];
  subject: string;
  templateName: string;
  data: T;
}

export interface EmailDispatchResult {
  messageId: string;
  previewUrl?: string | false;
}

class EmailService {
  private transporter: Transporter | null = null;
  private readonly templatesDir: string;

  constructor() {
    this.templatesDir = path.resolve(process.cwd(), 'src/templates/emails');
  }

  /**
   * Lazy-initialize and cache Nodemailer transporter
   */
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // Production or configured SMTP
    if (env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      return this.transporter;
    }

    // Development auto-fallback to Ethereal fake SMTP
    console.log('🧪 No SMTP credentials provided. Creating ethereal test email account...');
    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(`✉️  Ethereal test mailbox initialized: ${testAccount.user}`);
    return this.transporter;
  }

  /**
   * Render an EJS template into an HTML string
   */
  public async renderTemplate<T extends Record<string, unknown>>(
    templateName: string,
    data: T,
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.ejs`);
    return await ejs.renderFile(templatePath, data, { async: true });
  }

  /**
   * Send a raw HTML/text email
   */
  public async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Email Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }

  /**
   * Render an EJS template and dispatch email in a single call
   */
  public async sendTemplateEmail<T extends Record<string, unknown>>(
    options: SendTemplateEmailOptions<T>,
  ): Promise<EmailDispatchResult> {
    const html = await this.renderTemplate(options.templateName, {
      ...options.data,
      subject: options.subject,
    });

    return await this.sendEmail({
      to: options.to,
      subject: options.subject,
      html,
    });
  }
}

export const emailService = new EmailService();
