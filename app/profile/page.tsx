import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/AppLayout";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, weeklyHours: true, workDays: true, role: true, avatarUrl: true, accentColor: true },
  });
  if (!user) redirect("/login");

  return (
    <AppLayout userName={user.name} userRole={user.role === "MANAGER" ? "MANAGER" : "EMPLOYEE"} avatarUrl={user.avatarUrl ?? undefined}>
      <ProfileClient user={{ ...user, avatarUrl: user.avatarUrl ?? null, accentColor: user.accentColor ?? "default", workDays: user.workDays ?? [1,2,3,4,5] }} />
    </AppLayout>
  );
}
