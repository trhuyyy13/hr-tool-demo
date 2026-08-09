import Link from 'next/link';

const LINKS = [
  { href: '/login', title: 'Đăng nhập', sub: 'UC-001 · picker demo, không cần role riêng' },
  { href: '/attendance', title: 'Chấm công', sub: 'UC-002 · mọi nhân viên' },
  { href: '/leave-requests/new', title: 'Xin nghỉ phép', sub: 'UC-004 · mọi nhân viên' },
  { href: '/manager/approvals', title: 'Duyệt nghỉ phép', sub: 'UC-005 · cần đăng nhập bằng Quản lý hoặc HR Director' },
  { href: '/reports/monthly', title: 'Báo cáo tháng', sub: 'UC-006 · mọi nhân viên (demo, chưa phân quyền HR-only)' },
];

export default function HomePage() {
  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR Tool</h1>
          <p className="page-subtitle">Demo chấm công &amp; nghỉ phép — 5 use case, spec-driven.</p>
        </div>
      </div>

      <div className="card-list">
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="link-card">
            <span>
              <span className="link-card-title">{item.title}</span>
              <span className="link-card-sub">{item.sub}</span>
            </span>
            <span className="link-card-arrow">→</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
