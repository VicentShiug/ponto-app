import { PrismaClient, Role, OvertimeMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, setHours, setMinutes, getDay, startOfDay } from "date-fns";

const prisma = new PrismaClient();

function randomMinutes(base: number, spread: number) {
  return base + Math.floor(Math.random() * spread) - spread / 2;
}

function makeTime(base: Date, hours: number, minutes: number) {
  return setMinutes(setHours(base, hours), minutes);
}

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.auditLog.deleteMany();
  await prisma.hourBankAdjustment.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.user.deleteMany();

  const managerHash = await bcrypt.hash("manager123", 10);
  const manager1 = await prisma.user.create({
    data: {
      name: "Carlos Gestor",
      email: "manager@empresa.com",
      passwordHash: managerHash,
      role: Role.MANAGER,
      weeklyHours: 40,
    },
  });

  const manager2Hash = await bcrypt.hash("manager123", 10);
  const manager2 = await prisma.user.create({
    data: {
      name: "Juliana Gestora",
      email: "manager2@empresa.com",
      passwordHash: manager2Hash,
      role: Role.MANAGER,
      weeklyHours: 40,
    },
  });

  const superAdminHash = await bcrypt.hash("admin123*", 10);
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "gui@email.com",
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const emp1Hash = await bcrypt.hash("senha123", 10);
  const emp1 = await prisma.user.create({
    data: {
      name: "Ana Silva",
      email: "ana@empresa.com",
      passwordHash: emp1Hash,
      role: Role.EMPLOYEE,
      weeklyHours: 40,
      overtimeMode: OvertimeMode.HOUR_BANK,
      managerId: manager1.id,
    },
  });

  const emp2Hash = await bcrypt.hash("senha123", 10);
  const emp2 = await prisma.user.create({
    data: {
      name: "Bruno Costa",
      email: "bruno@empresa.com",
      passwordHash: emp2Hash,
      role: Role.EMPLOYEE,
      weeklyHours: 40,
      overtimeMode: OvertimeMode.OVERTIME,
      managerId: manager1.id,
    },
  });

  const emp3Hash = await bcrypt.hash("senha123", 10);
  const emp3 = await prisma.user.create({
    data: {
      name: "Carla Mendes",
      email: "carla@empresa.com",
      passwordHash: emp3Hash,
      role: Role.EMPLOYEE,
      weeklyHours: 30,
      overtimeMode: OvertimeMode.HOUR_BANK,
      managerId: manager2.id,
    },
  });

  const employees = [
    { user: emp1, manager: manager1 },
    { user: emp2, manager: manager1 },
    { user: emp3, manager: manager2 }
  ];

  for (const { user: emp, manager } of employees) {
    for (let i = 30; i >= 1; i--) {
      const day = subDays(new Date(), i);
      const dayOfWeek = getDay(day);
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const skip = Math.random() < 0.05;
      if (skip) continue;

      const base = startOfDay(day);
      const clockIn = makeTime(base, 8, randomMinutes(0, 20));
      const lunchOut = makeTime(base, 12, randomMinutes(0, 30));
      const lunchIn = makeTime(base, 13, randomMinutes(0, 30));
      const clockOut = makeTime(base, 17, randomMinutes(30, 60));

      await prisma.timeEntry.create({
        data: {
          userId: emp.id,
          date: base,
          clockIn,
          lunchOut,
          lunchIn,
          clockOut,
        },
      });
    }

    await prisma.hourBankAdjustment.create({
      data: {
        userId: emp.id,
        managerId: manager.id,
        minutes: 60,
        reason: "Compensação por trabalho no feriado",
      },
    });
  }

  console.log("✅ Seed concluído!");
  console.log("---");
  console.log("👤 Gestor 1:      manager@empresa.com / manager123");
  console.log("👤 Gestor 2:      manager2@empresa.com / manager123");
  console.log("👤 Func Ana (G1): ana@empresa.com / senha123");
  console.log("👤 Func Bruno(G1): bruno@empresa.com / senha123");
  console.log("👤 Func Carla(G2): carla@empresa.com / senha123");
  console.log("🔑 Super Admin:   gui@email.com / admin123*");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
