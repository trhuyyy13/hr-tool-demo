'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [checkingSession, setCheckingSession] = useState(true);
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/attendance/today');
    if (res.status === 401) {
      router.replace('/login');
      return;
    }
    setStatus(await res.json());
  }, [router]);

  // UC-001 E4/AC-6: no valid session -> back to /login instead of showing the page.
  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        setCheckingSession(false);
        await loadStatus();
      })
      .catch(() => router.replace('/login'));
  }, [router, loadStatus]);

  async function handleAction(action: 'check-in' | 'check-out') {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/attendance/${action}`, { method: 'POST' });
      if (res.status === 401) {
        router.replace('/login');
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
    <main style={{ maxWidth: 420, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Chấm công</h1>

      {errorMessage && (
        <div
          style={{
            background: '#fdecea',
            color: '#b3261e',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            marginBottom: '1rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      <div style={{ padding: '1rem', background: '#fff', borderRadius: 8, marginBottom: '1.2rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#444' }}>
          Chấm công vào:{' '}
          <strong>{status.checkInAt ? formatTime(status.checkInAt) : 'chưa chấm công'}</strong>
        </p>
        <p style={{ margin: '.4rem 0 0', fontSize: '0.9rem', color: '#444' }}>
          Chấm công ra:{' '}
          <strong>{status.checkOutAt ? formatTime(status.checkOutAt) : 'chưa chấm công'}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '.8rem' }}>
        <button
          type="button"
          disabled={busy || !!status.checkInAt}
          onClick={() => handleAction('check-in')}
          style={{ flex: 1, padding: '.7rem', borderRadius: 8, border: '1px solid #dadce0', cursor: 'pointer' }}
        >
          Chấm công vào
        </button>
        <button
          type="button"
          disabled={busy || !status.checkInAt || !!status.checkOutAt}
          onClick={() => handleAction('check-out')}
          style={{ flex: 1, padding: '.7rem', borderRadius: 8, border: '1px solid #dadce0', cursor: 'pointer' }}
        >
          Chấm công ra
        </button>
      </div>
    </main>
  );
}
