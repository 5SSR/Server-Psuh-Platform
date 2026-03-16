import AuthGuard from '../../components/auth-guard';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requireRole="ADMIN">{children}</AuthGuard>;
}
