import type { ParentInvite, PrismaClient } from "@kostin/database";

export interface CreateParentInviteInput {
  studentId: string;
  parentEmail?: string | undefined;
  parentPhone?: string | undefined;
  token: string;
  expiresAt: Date;
}

// Narrow surface of Prisma actually needed by the invite-parent route, so
// tests can inject an in-memory fake instead of hitting Postgres.
export interface ParentInviteRepository {
  findPending(studentId: string, parentEmail?: string, parentPhone?: string): Promise<ParentInvite | null>;
  create(input: CreateParentInviteInput): Promise<ParentInvite>;
}

export function createPrismaParentInviteRepository(prisma: PrismaClient): ParentInviteRepository {
  return {
    findPending: (studentId, parentEmail, parentPhone) =>
      prisma.parentInvite.findFirst({
        where: {
          studentId,
          status: "PENDING",
          OR: [
            ...(parentEmail ? [{ parentEmail }] : []),
            ...(parentPhone ? [{ parentPhone }] : []),
          ],
        },
      }),
    create: (input) =>
      prisma.parentInvite.create({
        data: {
          studentId: input.studentId,
          parentEmail: input.parentEmail ?? null,
          parentPhone: input.parentPhone ?? null,
          token: input.token,
          expiresAt: input.expiresAt,
        },
      }),
  };
}
