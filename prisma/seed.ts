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
  const manager = await prisma.user.create({
    data: {
      name: "Carlos Gestor",
      email: "manager@empresa.com",
      passwordHash: managerHash,
      role: Role.MANAGER,
      weeklyHours: 40,
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
    },
  });

  const employees = [emp1, emp2, emp3];

  for (const emp of employees) {
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
  console.log("👤 Gestor:       manager@empresa.com / manager123");
  console.log("👤 Funcionário 1: ana@empresa.com / senha123");
  console.log("👤 Funcionário 2: bruno@empresa.com / senha123");
  console.log("👤 Funcionário 3: carla@empresa.com / senha123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
