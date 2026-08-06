import { Injectable, Logger } from '@nestjs/common';

type LeaveApprovalRequestParams = {
  to: string;
  leaveRequestId: number;
  employeeName: string;
  fromDate: string;
  toDate: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // DEMO STUB — no SMTP/email provider configured. Swap the body for a real
  // provider (nodemailer/SES/...) later; keep this call signature so callers
  // don't need to change.
  async sendLeaveApprovalRequest(params: LeaveApprovalRequestParams): Promise<void> {
    const link = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/leave-requests/${params.leaveRequestId}`;
    this.logger.log(
      `[MOCK EMAIL] to=${params.to} subject="Yêu cầu duyệt nghỉ phép từ ${params.employeeName}" ` +
        `(${params.fromDate} → ${params.toDate}) link=${link}`,
    );
  }
}
