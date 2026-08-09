'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const now = new Date();

export default function MonthlyReportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
  const [checkingSession, setCheckingSession] = useState(true);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.replace(loginUrl);
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => router.replace(loginUrl));
  }, [router, loginUrl]);

  async function handleExport() {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`);
      if (res.status === 401) {
        router.replace(loginUrl);
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
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo tháng</h1>
          <p className="page-subtitle">Demo: mở cho mọi nhân viên đã đăng nhập, chưa giới hạn HR-only.</p>
        </div>
      </div>

      {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

      <div className="card">
        <div className="field-row" style={{ marginBottom: '1rem' }}>
          <div className="field">
            <label className="field-label" htmlFor="month">
              Tháng
            </label>
            <select
              id="month"
              className="input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="year">
              Năm
            </label>
            <input
              id="year"
              type="number"
              className="input"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={handleExport}>
          {busy ? 'Đang xuất…' : 'Xuất CSV'}
        </button>
      </div>
    </main>
  );
}
