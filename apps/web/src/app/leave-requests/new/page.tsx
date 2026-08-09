'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RoleBadge, type EmployeeRole } from '../../components/RoleBadge';

type SessionEmployee = {
  id: number;
  fullName: string;
  email: string;
  department: string;
  annualLeaveBalance: number;
  role: EmployeeRole;
};

type LeaveType = 'annual' | 'sick' | 'unpaid';

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
};

export default function NewLeaveRequestPage() {
  const router = useRouter();
  const pathname = usePathname();
  const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
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
          router.replace(loginUrl);
          return;
        }
        setMe(await res.json());
        setCheckingSession(false);
      })
      .catch(() => router.replace(loginUrl));
  }, [router, loginUrl]);

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
        router.replace(loginUrl);
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
    <main className="page">
      <Link href="/" className="back-link">
        ← Trang chủ
      </Link>
      <div className="page-header">
        <div>
          <h1 className="page-title">Xin nghỉ phép</h1>
          <div className="identity-row">
            <span className="identity-name">{me.fullName}</span>
            <RoleBadge role={me.role} />
            <span className="identity-meta">
              {me.department} · còn {me.annualLeaveBalance} ngày phép
            </span>
          </div>
        </div>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>

      {success && <div className="banner banner-success">Đã gửi yêu cầu</div>}
      {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label htmlFor="type" className="field-label">
            Loại nghỉ
          </label>
          <select
            id="type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType)}
          >
            {(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((t) => (
              <option key={t} value={t}>
                {LEAVE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="fromDate" className="field-label">
              Từ ngày
            </label>
            <input
              id="fromDate"
              type="date"
              className="input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="toDate" className="field-label">
              Đến ngày
            </label>
            <input
              id="toDate"
              type="date"
              className="input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="reason" className="field-label">
            Lý do
          </label>
          <textarea
            id="reason"
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </form>
    </main>
  );
}
