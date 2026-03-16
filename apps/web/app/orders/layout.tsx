import AuthGuard from '../../components/auth-guard';

export default function OrdersLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
