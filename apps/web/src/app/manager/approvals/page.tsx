'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RoleBadge, type EmployeeRole } from '../../components/RoleBadge';

type SessionEmployee = {
  id: number;
  fullName: string;
  role: EmployeeRole;
};

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
  const pathname = usePathname();
  const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
  const [checkingSession, setCheckingSession] = useState(true);
  const [me, setMe] = useState<SessionEmployee | null>(null);
  const [items, setItems] = useState<PendingLeaveRequest[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    const res = await fetch('/api/leave-requests/pending');
    if (res.status === 401) {
      router.replace(loginUrl);
      return;
    }
    setItems(await res.json());
  }, [router, loginUrl]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.replace(loginUrl);
          return;
        }
        setMe(await res.json());
        setCheckingSession(false);
        await loadPending();
      })
      .catch(() => router.replace(loginUrl));
  }, [router, loginUrl, loadPending]);

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

  if (checkingSession || !me) {
    return null;
  }

  const canApproveAnything = me.role === 'manager' || me.role === 'hr_director';

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yêu cầu nghỉ phép chờ duyệt</h1>
          <div className="identity-row">
            <span className="identity-name">{me.fullName}</span>
            <RoleBadge role={me.role} />
          </div>
        </div>
      </div>

      {!canApproveAnything && (
        <div className="banner banner-warning">
          Tài khoản này có vai trò <strong>Nhân viên</strong>, không phải Quản
          lý hay HR Director — sẽ không có yêu cầu nào để duyệt, và bấm "Duyệt"
          trên đơn của người khác sẽ luôn bị từ chối (403). Đăng xuất và chọn
          một tài khoản có badge <strong>Quản lý</strong> hoặc{' '}
          <strong>HR Director</strong> ở trang đăng nhập để test UC-005.
        </div>
      )}

      {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

      {items.length === 0 && canApproveAnything && (
        <div className="banner banner-neutral">Không có yêu cầu nào đang chờ duyệt.</div>
      )}

      <div className="card-list">
        {items.map((item) => (
          <div key={item.id} className="card">
            <p style={{ margin: 0, fontWeight: 600 }}>{item.employeeName}</p>
            <p style={{ margin: '.35rem 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              {TYPE_LABEL[item.type] ?? item.type} · {item.fromDate} → {item.toDate}
            </p>
            <p style={{ margin: '.35rem 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Lý do: {item.reason}
            </p>

            {rejectingId === item.id ? (
              <div className="btn-row" style={{ marginTop: '.7rem' }}>
                <input
                  type="text"
                  className="input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Lý do từ chối"
                />
                <button
                  type="button"
                  className="btn"
                  disabled={busyId === item.id}
                  onClick={() => handleReject(item.id)}
                >
                  Xác nhận từ chối
                </button>
                <button type="button" className="btn-ghost" onClick={() => setRejectingId(null)}>
                  Huỷ
                </button>
              </div>
            ) : (
              <div className="btn-row" style={{ marginTop: '.7rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busyId === item.id}
                  onClick={() => handleApprove(item.id)}
                >
                  Duyệt
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busyId === item.id}
                  onClick={() => setRejectingId(item.id)}
                >
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
