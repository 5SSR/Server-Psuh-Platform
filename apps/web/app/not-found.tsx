import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="hero-section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>404</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          页面不存在
        </p>
        <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          返回首页
        </Link>
      </div>
    </main>
  );
}
