import AuthGuard from '../../components/auth-guard';

export default function SellerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
