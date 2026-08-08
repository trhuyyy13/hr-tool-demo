'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const now = new Date();

export default function MonthlyReportPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleExport() {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`);
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        const body = await res.json();
        setErrorMessage(body.message ?? 'Có lỗi xảy ra');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly-report-${year}-${String(month).padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage('Không kết nối được tới server');
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return null;
  }

  return (
    <main style={{ maxWidth: 420, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Báo cáo tháng</h1>

      {errorMessage && (
        <div style={{ background: '#fdecea', color: '#b3261e', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '.6rem', marginBottom: '1.2rem' }}>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: '.5rem' }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ width: '6rem', padding: '.5rem' }}
        />
      </div>

      <button type="button" disabled={busy} onClick={handleExport} style={{ padding: '.7rem 1.2rem', borderRadius: 8, border: '1px solid #dadce0', cursor: 'pointer' }}>
        {busy ? 'Đang xuất…' : 'Xuất CSV'}
      </button>
    </main>
  );
}
