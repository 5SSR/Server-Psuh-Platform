import AuthGuard from '../../components/auth-guard';

export default function WalletLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
