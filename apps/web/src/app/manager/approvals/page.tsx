'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type PendingLeaveRequest = {
  id: number;
  employeeId: number;
  employeeName: string;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
};

const TYPE_LABEL: Record<string, string> = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  unpaid: 'Nghỉ không lương',
};

export default function ManagerApprovalsPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [items, setItems] = useState<PendingLeaveRequest[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    const res = await fetch('/api/leave-requests/pending');
    if (res.status === 401) {
      router.replace('/login');
      return;
    }
    setItems(await res.json());
  }, [router]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        setCheckingSession(false);
        await loadPending();
      })
      .catch(() => router.replace('/login'));
  }, [router, loadPending]);

  async function handleApprove(id: number) {
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/leave-requests/${id}/approve`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body.message ?? 'Có lỗi xảy ra');
        return;
      }
      await loadPending();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: number) {
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/leave-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body.message ?? 'Có lỗi xảy ra');
        return;
      }
      setRejectingId(null);
      setRejectReason('');
      await loadPending();
    } finally {
      setBusyId(null);
    }
  }

  if (checkingSession) {
    return null;
  }

  return (
    <main style={{ maxWidth: 560, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Yêu cầu nghỉ phép chờ duyệt</h1>

      {errorMessage && (
        <div
          style={{ background: '#fdecea', color: '#b3261e', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem' }}
        >
          {errorMessage}
        </div>
      )}

      {items.length === 0 && <p style={{ color: '#666' }}>Không có yêu cầu nào đang chờ duyệt.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
        {items.map((item) => (
          <div key={item.id} style={{ padding: '1rem', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{item.employeeName}</p>
            <p style={{ margin: '.3rem 0', fontSize: '0.85rem', color: '#555' }}>
              {TYPE_LABEL[item.type] ?? item.type} · {item.fromDate} → {item.toDate}
            </p>
            <p style={{ margin: '.3rem 0', fontSize: '0.85rem', color: '#555' }}>Lý do: {item.reason}</p>

            {rejectingId === item.id ? (
              <div style={{ marginTop: '.6rem', display: 'flex', gap: '.5rem' }}>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Lý do từ chối"
                  style={{ flex: 1, padding: '.4rem .6rem', borderRadius: 6, border: '1px solid #dadce0' }}
                />
                <button type="button" disabled={busyId === item.id} onClick={() => handleReject(item.id)}>
                  Xác nhận từ chối
                </button>
                <button type="button" onClick={() => setRejectingId(null)}>
                  Huỷ
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '.6rem', display: 'flex', gap: '.6rem' }}>
                <button type="button" disabled={busyId === item.id} onClick={() => handleApprove(item.id)}>
                  Duyệt
                </button>
                <button type="button" disabled={busyId === item.id} onClick={() => setRejectingId(item.id)}>
                  Từ chối
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
