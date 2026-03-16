import AuthGuard from '../../components/auth-guard';

export default function NoticesLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
