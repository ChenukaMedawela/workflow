import AuthGuard from "./auth-guard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        {children}
      </div>
    </AuthGuard>
  );
}
