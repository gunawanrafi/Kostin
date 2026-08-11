import type { PrismaClient, User, UserRole } from "@kostin/database";

export interface CreateUserInput {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash?: string;
  googleId?: string;
}

// Narrow surface of Prisma actually needed by auth routes, so tests can
// inject an in-memory fake instead of hitting Postgres.
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByEmailOrPhone(email: string, phone: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  linkGoogleId(id: string, googleId: string): Promise<User>;
  activate(id: string): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<User>;
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    findByPhone: (phone) => prisma.user.findUnique({ where: { phone } }),
    findByEmailOrPhone: (email, phone) =>
      prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } }),
    findByGoogleId: (googleId) => prisma.user.findUnique({ where: { googleId } }),
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    create: (input) => prisma.user.create({ data: input }),
    linkGoogleId: (id, googleId) => prisma.user.update({ where: { id }, data: { googleId } }),
    activate: (id) => prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }),
    updatePassword: (id, passwordHash) =>
      prisma.user.update({ where: { id }, data: { passwordHash } }),
  };
}
