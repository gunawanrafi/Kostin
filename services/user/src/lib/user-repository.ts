import type { Prisma, PrismaClient, User, UserProfile } from "@kostin/database";

export interface UpdateMeInput {
  name?: string | undefined;
  bio?: string | undefined;
  university?: string | undefined;
  major?: string | undefined;
  yearOfStudy?: number | undefined;
}

// Narrow surface of Prisma actually needed by user routes, so tests can
// inject an in-memory fake instead of hitting Postgres.
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findProfileByUserId(userId: string): Promise<UserProfile | null>;
  updateMe(userId: string, input: UpdateMeInput): Promise<{ user: User; profile: UserProfile | null }>;
  updateAvatarUrl(userId: string, avatarUrl: string): Promise<User>;
  updateLifestyle(userId: string, lifestyle: Record<string, unknown>): Promise<UserProfile>;
  updateScreeningCriteria(
    userId: string,
    screeningCriteria: Record<string, unknown>,
  ): Promise<UserProfile>;
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    findProfileByUserId: (userId) => prisma.userProfile.findUnique({ where: { userId } }),

    updateMe: async (userId, input) => {
      const { name, ...rawProfileFields } = input;
      const profileFields = Object.fromEntries(
        Object.entries(rawProfileFields).filter(([, v]) => v !== undefined),
      ) as Record<string, string | number>;
      const hasProfileFields = Object.keys(profileFields).length > 0;

      const user = await prisma.user.update({
        where: { id: userId },
        data: name !== undefined ? { name } : {},
      });

      const profile = hasProfileFields
        ? await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, ...profileFields } as Prisma.UserProfileUncheckedCreateInput,
            update: profileFields as Prisma.UserProfileUpdateInput,
          })
        : await prisma.userProfile.findUnique({ where: { userId } });

      return { user, profile };
    },

    updateAvatarUrl: (userId, avatarUrl) =>
      prisma.user.update({ where: { id: userId }, data: { avatarUrl } }),

    updateLifestyle: (userId, lifestyle) => {
      const json = lifestyle as Prisma.InputJsonValue;
      return prisma.userProfile.upsert({
        where: { userId },
        create: { userId, lifestyle: json },
        update: { lifestyle: json },
      });
    },

    // Upsert, because an owner who has never touched their profile has no
    // UserProfile row — saving criteria must not 404 on them.
    updateScreeningCriteria: (userId, screeningCriteria) => {
      const json = screeningCriteria as Prisma.InputJsonValue;
      return prisma.userProfile.upsert({
        where: { userId },
        create: { userId, screeningCriteria: json },
        update: { screeningCriteria: json },
      });
    },
  };
}
