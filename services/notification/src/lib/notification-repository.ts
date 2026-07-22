import type {
  Notification,
  NotificationEventType,
  NotificationStatus,
  Prisma,
  PrismaClient,
} from "@kostin/database";

export interface CreateNotificationData {
  userId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface ListNotificationsFilters {
  status?: NotificationStatus;
}

export interface ListPage<T> {
  items: T[];
  total: number;
}

// Narrow surface of Prisma actually needed by notification routes, so tests
// can inject an in-memory fake instead of hitting Postgres.
export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUserId(
    userId: string,
    filters: ListNotificationsFilters,
    page: number,
    limit: number,
  ): Promise<ListPage<Notification>>;
  create(input: CreateNotificationData): Promise<Notification>;
  markSent(id: string): Promise<Notification>;
  markRead(id: string): Promise<Notification>;
  userExists(userId: string): Promise<boolean>;
}

export function createPrismaNotificationRepository(prisma: PrismaClient): NotificationRepository {
  return {
    findById: (id) => prisma.notification.findUnique({ where: { id } }),

    findByUserId: async (userId, filters, page, limit) => {
      const where = { userId, ...(filters.status ? { status: filters.status } : {}) };
      const [items, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);
      return { items, total };
    },

    create: (input) =>
      prisma.notification.create({
        data: {
          userId: input.userId,
          channel: "PUSH",
          status: "UNREAD",
          eventType: input.eventType,
          title: input.title,
          body: input.body,
          data: input.data as Prisma.InputJsonValue,
        },
      }),

    markSent: (id) => prisma.notification.update({ where: { id }, data: { sentAt: new Date() } }),

    markRead: (id) =>
      prisma.notification.update({ where: { id }, data: { status: "READ", readAt: new Date() } }),

    userExists: async (userId) => (await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) !== null,
  };
}
