import AuthGuard from '../../components/auth-guard';

export default function PayLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
