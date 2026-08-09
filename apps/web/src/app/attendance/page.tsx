'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type AttendanceStatus = {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function AttendancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
  const [checkingSession, setCheckingSession] = useState(true);
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/attendance/today');
    if (res.status === 401) {
      router.replace(loginUrl);
      return;
    }
    setStatus(await res.json());
  }, [router, loginUrl]);

  // UC-001 E4/AC-6: no valid session -> back to /login instead of showing the page.
  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.replace(loginUrl);
          return;
        }
        setCheckingSession(false);
        await loadStatus();
      })
      .catch(() => router.replace(loginUrl));
  }, [router, loginUrl, loadStatus]);

  async function handleAction(action: 'check-in' | 'check-out') {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/attendance/${action}`, { method: 'POST' });
      if (res.status === 401) {
        router.replace(loginUrl);
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body.message ?? 'Có lỗi xảy ra');
        return;
      }
      setStatus(body);
    } catch {
      setErrorMessage('Không kết nối được tới server');
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession || !status) {
    return null;
  }

  return (
    <main className="page">
      <Link href="/" className="back-link">
        ← Trang chủ
      </Link>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chấm công</h1>
        </div>
      </div>

      {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Chấm công vào:{' '}
          <strong>{status.checkInAt ? formatTime(status.checkInAt) : 'chưa chấm công'}</strong>
        </p>
        <p style={{ margin: '.5rem 0 0', fontSize: '0.9rem' }}>
          Chấm công ra:{' '}
          <strong>{status.checkOutAt ? formatTime(status.checkOutAt) : 'chưa chấm công'}</strong>
        </p>
      </div>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy || !!status.checkInAt}
          onClick={() => handleAction('check-in')}
        >
          Chấm công vào
        </button>
        <button
          type="button"
          className="btn btn-block"
          disabled={busy || !status.checkInAt || !!status.checkOutAt}
          onClick={() => handleAction('check-out')}
        >
          Chấm công ra
        </button>
      </div>
    </main>
  );
}
