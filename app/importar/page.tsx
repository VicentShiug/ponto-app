import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/AppLayout";
import ImportarCSV from "@/components/ImportarCSV";

export default async function ImportarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });

  if (!user) redirect("/login");

  let employees: { id: string; name: string }[] = [];
  if (user.role === "MANAGER") {
    employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE", managerId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  return (
    <AppLayout userName={user.name} userRole={user.role} avatarUrl={user.avatarUrl ?? undefined}>
      <div className="py-6">
        <ImportarCSV userRole={user.role} userId={user.id} employees={employees} />
      </div>
    </AppLayout>
  );
}
