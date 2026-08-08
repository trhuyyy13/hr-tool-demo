import { UnauthorizedException } from '@nestjs/common';
import { SessionAuthGuard } from './session-auth.guard.js';
import { SESSION_COOKIE_NAME, signSession } from './session.util.js';

function makeContext(cookies: Record<string, string>) {
  const request = { cookies } as any;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe('SessionAuthGuard — UC-001 AC-5 / AC-6', () => {
  const guard = new SessionAuthGuard();

  // AC-5: valid session -> request proceeds, employeeId attached.
  it('allows a request with a valid session cookie and attaches employeeId', () => {
    const token = signSession(7);
    const context = makeContext({ [SESSION_COOKIE_NAME]: token });

    expect(guard.canActivate(context)).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.employeeId).toBe(7);
  });

  // AC-6: no cookie at all (never logged in / cleared) -> rejected with E4's message.
  it('rejects a request with no session cookie', () => {
    const context = makeContext({});
    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'),
    );
  });

  // AC-6: expired session -> same rejection.
  it('rejects a request with an invalid/expired session cookie', () => {
    const context = makeContext({ [SESSION_COOKIE_NAME]: 'garbage.token' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
