import { createHmac, timingSafeEqual } from 'node:crypto';

export type SessionPayload = {
  employeeId: number;
  iat: number;
  exp: number;
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h — a workday. Trivial to change.

function getSecret(): string {
  // DEMO — a fixed dev default is fine for local/demo use. Set a real
  // SESSION_SECRET before ever deploying this beyond a local demo.
  return process.env.SESSION_SECRET ?? 'hr-tool-demo-insecure-dev-secret';
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function signSession(employeeId: number): string {
  const now = Date.now();
  const payload: SessionPayload = { employeeId, iat: now, exp: now + SESSION_TTL_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

/** Returns the payload if the token is well-formed, correctly signed, and not expired — otherwise null. */
export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;

  const expected = sign(data);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload.employeeId !== 'number' || typeof payload.exp !== 'number') return null;
  if (Date.now() > payload.exp) return null;

  return payload;
}

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_COOKIE_MAX_AGE_MS = SESSION_TTL_MS;
