import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly template: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT', 1025),
        secure: false,
        ...(this.configService.get<string>('SMTP_USER')
          ? {
              auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASS'),
              },
            }
          : {}),
      });
    } else {
      this.transporter = null;
    }
    this.from = this.configService.get<string>('EMAIL_FROM', 'noreply@nabdh.com');
    this.template = fs.readFileSync(path.join(__dirname, '../templates/otp-email.html'), 'utf-8');
  }

  async sendEmail(to: string, subject: string, code: string, firstName?: string): Promise<void> {
    const html = this.render({
      first_name: firstName || '',
      verification_code: code,
      button_url: '#',
      year: String(new Date().getFullYear()),
    });
    if (this.transporter) {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}`);
    } else {
      this.logger.log(`[Email Stub] To: ${to}, Subject: ${subject}, Body: ${code}`);
    }
  }

  private render(vars: Record<string, string>): string {
    let html = this.template;
    for (const [key, val] of Object.entries(vars)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }
    return html;
  }
}
