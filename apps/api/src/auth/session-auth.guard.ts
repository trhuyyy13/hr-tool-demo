import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_COOKIE_NAME, verifySession } from './session.util.js';

const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';

// UC-001 E4. Replaces the old x-demo-employee-id header (flagged by the
// adversarial review as spoofable) — the cookie is signed, so a caller can
// no longer just declare who they are.
@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    const payload = verifySession(token);
    if (!payload) {
      throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
    }
    (request as Request & { employeeId: number }).employeeId = payload.employeeId;
    return true;
  }
}
