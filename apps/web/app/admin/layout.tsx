import AuthGuard from '../../components/auth-guard';
import AdminConsoleNav from '../../components/admin/console-nav';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireRole="ADMIN">
      <div className="admin-shell">
        <AdminConsoleNav />
        {children}
      </div>
    </AuthGuard>
  );
}
