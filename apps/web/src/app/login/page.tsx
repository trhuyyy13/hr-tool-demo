'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RoleBadge, type EmployeeRole } from '../components/RoleBadge';

type Employee = {
  id: number;
  fullName: string;
  email: string;
  department: string;
  annualLeaveBalance: number;
  role: EmployeeRole;
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Remembers which page sent the user here (e.g. /login?next=/attendance),
  // so login always returns them where they meant to go instead of always
  // dumping them onto /leave-requests/new.
  const next = searchParams.get('next') || '/leave-requests/new';
  const [checkingSession, setCheckingSession] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AC-5: already have a valid session — skip the picker entirely.
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          router.replace(next);
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [router, next]);

  useEffect(() => {
    if (checkingSession) return;
    fetch('/api/employees')
      .then((res) => res.json())
      .then(setEmployees)
      .catch(() => setErrorMessage('Không tải được danh sách nhân viên'));
  }, [checkingSession]);

  async function handleLogin(email: string) {
    setLoadingEmail(email);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json();
        setErrorMessage(body.message ?? 'Đăng nhập thất bại');
        return;
      }
      router.replace(next);
    } catch {
      setErrorMessage('Không kết nối được tới server');
    } finally {
      setLoadingEmail(null);
    }
  }

  if (checkingSession) {
    return null;
  }

  const wantsApprovals = next === '/manager/approvals';

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR Tool</h1>
          <p className="page-subtitle">Đăng nhập bằng tài khoản Google công ty.</p>
        </div>
      </div>

      <div className="banner banner-warning">
        Demo: chưa nối Google OAuth thật — chọn một tài khoản bên dưới để mô
        phỏng bước Google xác thực xong trả email về cho hệ thống.
      </div>

      {wantsApprovals && (
        <div className="banner banner-neutral">
          Trang duyệt nghỉ phép chỉ hoạt động cho <strong>Quản lý</strong> (đơn của
          nhân viên báo cáo trực tiếp) hoặc <strong>HR Director</strong> (đơn của
          người không có quản lý). Chọn một tài khoản có badge tương ứng bên
          dưới.
        </div>
      )}

      {errorMessage && <div className="banner banner-danger">{errorMessage}</div>}

      <div className="card-list">
        {employees.map((emp) => (
          <button
            key={emp.id}
            type="button"
            className="picker-row"
            onClick={() => handleLogin(emp.email)}
            disabled={loadingEmail !== null}
          >
            <span className="picker-identity">
              <span className="picker-name-row">
                <strong>{emp.fullName}</strong>
                <RoleBadge role={emp.role} />
              </span>
              <span className="picker-email">{emp.email}</span>
            </span>
            <span className="picker-action">
              {loadingEmail === emp.email ? 'Đang đăng nhập…' : 'Đăng nhập bằng Google →'}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
