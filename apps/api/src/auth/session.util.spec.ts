import { jest } from '@jest/globals';
import { signSession, verifySession } from './session.util.js';

describe('session.util — underlying mechanism for AC-5 / AC-6', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // AC-5: a freshly issued session is valid immediately.
  it('verifies a freshly signed token and recovers the employeeId', () => {
    const token = signSession(42);
    const payload = verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload?.employeeId).toBe(42);
  });

  // AC-6: a session older than the TTL is rejected.
  it('rejects a token once past its expiry', () => {
    const token = signSession(42);
    const realNow = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(realNow + 9 * 60 * 60 * 1000); // +9h > 8h TTL

    expect(verifySession(token)).toBeNull();
  });

  it('rejects a tampered token', () => {
    const token = signSession(42);
    const [data, signature] = token.split('.');
    const tampered = `${data}.${signature.slice(0, -1)}${signature.at(-1) === 'a' ? 'b' : 'a'}`;

    expect(verifySession(tampered)).toBeNull();
  });

  it('rejects a missing/garbage token', () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession('not-a-real-token')).toBeNull();
  });
});
