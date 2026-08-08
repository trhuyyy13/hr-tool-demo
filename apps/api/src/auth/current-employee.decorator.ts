import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// Reads req.employeeId, set by SessionAuthGuard — use together, this
// decorator does not itself enforce authentication.
export const CurrentEmployeeId = createParamDecorator((_: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest<Request & { employeeId: number }>();
  return request.employeeId;
});
