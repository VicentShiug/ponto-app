import { requireSuperAdmin } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();
  return (
    <AppLayout userName={session.name} userRole="SUPER_ADMIN">
      {children}
    </AppLayout>
  );
}
