import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.4rem' }}>HR Tool (demo)</h1>
      <p>
        <Link href="/login">Đăng nhập (UC-001) →</Link>
      </p>
      <p>
        <Link href="/attendance">Chấm công (UC-002) →</Link>
      </p>
      <p>
        <Link href="/leave-requests/new">Xin nghỉ phép (UC-004) →</Link>
      </p>
      <p>
        <Link href="/manager/approvals">Duyệt nghỉ phép (UC-005) →</Link>
      </p>
    </main>
  );
}
