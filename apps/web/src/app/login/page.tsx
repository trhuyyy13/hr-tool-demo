'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Employee = {
  id: number;
  fullName: string;
  email: string;
  department: string;
  annualLeaveBalance: number;
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

  return (
    <main style={{ maxWidth: 420, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.3rem', marginBottom: '.4rem' }}>HR Tool</h1>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Đăng nhập bằng tài khoản Google công ty.
      </p>

      <p
        style={{
          fontSize: '0.75rem',
          color: '#9a6b00',
          background: '#fff8e1',
          padding: '.6rem .8rem',
          borderRadius: 8,
          marginBottom: '1.2rem',
        }}
      >
        Demo: chưa nối Google OAuth thật — chọn một tài khoản bên dưới để mô
        phỏng bước Google xác thực xong trả email về cho hệ thống.
      </p>

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {employees.map((emp) => (
          <button
            key={emp.id}
            type="button"
            onClick={() => handleLogin(emp.email)}
            disabled={loadingEmail !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '.7rem 1rem',
              background: '#fff',
              border: '1px solid #dadce0',
              borderRadius: 8,
              cursor: loadingEmail ? 'default' : 'pointer',
              fontSize: '0.88rem',
              textAlign: 'left',
            }}
          >
            <span>
              <strong>{emp.fullName}</strong>
              <br />
              <span style={{ color: '#666', fontSize: '0.78rem' }}>{emp.email}</span>
            </span>
            <span style={{ color: '#1a73e8', fontSize: '0.8rem' }}>
              {loadingEmail === emp.email ? 'Đang đăng nhập…' : 'Đăng nhập bằng Google →'}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
