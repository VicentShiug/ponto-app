import { prisma } from "@/lib/prisma";

interface LogParams {
  actorId: string;
  action: string;
  targetUserId?: string;
  details: Record<string, unknown>;
}

export async function createAuditLog({ actorId, action, targetUserId, details }: LogParams) {
  return prisma.auditLog.create({
    data: { actorId, action, targetUserId, details },
  });
}
