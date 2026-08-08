'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SessionEmployee = {
  id: number;
  fullName: string;
  email: string;
  department: string;
  annualLeaveBalance: number;
};

type LeaveType = 'annual' | 'sick' | 'unpaid';

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
};

export default function NewLeaveRequestPage() {
  const router = useRouter();
  const [me, setMe] = useState<SessionEmployee | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [type, setType] = useState<LeaveType>('annual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // UC-001 E4/AC-6: no valid session -> back to /login instead of showing the form.
  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        setMe(await res.json());
        setCheckingSession(false);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No x-demo-employee-id anymore — the session cookie set at
        // /login rides along automatically on this same-origin request.
        body: JSON.stringify({ type, fromDate, toDate, reason }),
      });

      if (res.status === 401) {
        router.replace('/login');
        return;
      }

      const body = await res.json();

      if (!res.ok) {
        const message = Array.isArray(body.message) ? body.message.join('; ') : body.message;
        setErrorMessage(message ?? 'Có lỗi xảy ra');
        return;
      }

      setSuccess(true);
      setType('annual');
      setFromDate('');
      setToDate('');
      setReason('');
    } catch {
      setErrorMessage('Không kết nối được tới server');
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession || !me) {
    return null;
  }

  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Xin nghỉ phép</h1>
        <button
          type="button"
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          Đăng xuất
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '-1rem', marginBottom: '1.2rem' }}>
        Đăng nhập với tư cách <strong>{me.fullName}</strong> ({me.department}) — còn{' '}
        {me.annualLeaveBalance} ngày phép.
      </p>

      {success && (
        <div style={{ background: '#e6f4ea', color: '#1e7a34', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          Đã gửi yêu cầu
        </div>
      )}
      {errorMessage && (
        <div style={{ background: '#fdecea', color: '#b3261e', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: 8 }}
      >
        <div>
          <label htmlFor="type" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Loại nghỉ
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType)}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            {(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((t) => (
              <option key={t} value={t}>
                {LEAVE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="fromDate" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Từ ngày
            </label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="toDate" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
              Đến ngày
            </label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="reason" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Lý do
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '0.6rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </form>
    </main>
  );
}
