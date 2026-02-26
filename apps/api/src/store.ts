import { randomUUID } from "crypto";
import { eq, and, desc, or, gte, lt } from "drizzle-orm";
import { db } from "./db/index";
import { users, organizations, memberships, tasks, microTasks, taskOffers, queueIntents } from "./db/schema";
import { appEvents } from "./events";

export type MembershipRole = "ADMIN" | "ORGANIZER" | "MEMBER";
export type MembershipStatus = "ACTIVE" | "INACTIVE";
export type MicroTaskStatus = "OPEN" | "ASSIGNED" | "DONE";
export type TaskOfferStatus = "SUGGESTED" | "REJECTED" | "ACCEPTED";

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type MicroTask = typeof microTasks.$inferSelect;
export type TaskOffer = typeof taskOffers.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type QueueIntent = typeof queueIntents.$inferSelect;

export const createUser = async (email: string, displayName?: string): Promise<User> => {
  const [user] = await db.insert(users).values({
    id: randomUUID(),
    email,
    displayName,
    calendarFeedToken: randomUUID()
  }).returning();
  return user;
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
};

export const updateUserProfile = async (
  userId: string,
  data: Partial<Omit<User, "id" | "email" | "createdAt" | "updatedAt">>
): Promise<User> => {
  const [updatedUser] = await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  if (!updatedUser) throw new Error("User not found");
  return updatedUser;
};

export const createOrganization = async (name: string): Promise<Organization> => {
  const [org] = await db.insert(organizations).values({ id: randomUUID(), name }).returning();
  return org;
};

export const addMembership = async (userId: string, organizationId: string, role: MembershipRole): Promise<Membership> => {
  const [membership] = await db.insert(memberships).values({
    id: randomUUID(),
    userId,
    organizationId,
    role,
    status: "ACTIVE"
  }).returning();
  return membership;
};

export const listMembershipsForUser = async (userId: string): Promise<Membership[]> => {
  return db.select().from(memberships).where(eq(memberships.userId, userId));
};

export const listMembershipsForOrganization = async (organizationId: string) => {
  return db.select({
    id: memberships.id,
    role: memberships.role,
    userId: users.id,
    displayName: users.displayName,
    weeklyTimeBudgetMinutes: users.weeklyTimeBudgetMinutes
  }).from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, organizationId));
};

export const findMembership = async (userId: string, organizationId: string): Promise<Membership | undefined> => {
  const [membership] = await db.select().from(memberships).where(
    and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId))
  );
  return membership;
};

export const getOrganizationById = async (organizationId: string): Promise<Organization | undefined> => {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
  return org;
};

export const seedUserMemberships = async (user: User): Promise<Membership[]> => {
  const existing = await listMembershipsForUser(user.id);
  if (existing.length > 0) return existing;

  const primaryOrg = await createOrganization(`Pinky Workspace (${user.email})`);
  const secondaryOrg = await createOrganization("Pinky Demo Workspace");

  const m1 = await addMembership(user.id, primaryOrg.id, "ADMIN");
  const m2 = await addMembership(user.id, secondaryOrg.id, "MEMBER");

  await ensureSeedMicroTasks(primaryOrg.id, user.id);
  await ensureSeedMicroTasks(secondaryOrg.id);

  return [m1, m2];
};

export const ensureSeedMicroTasksForUser = async (userId: string) => {
  const userMemberships = await listMembershipsForUser(userId);
  for (const m of userMemberships) {
    await ensureSeedMicroTasks(m.organizationId, userId);
  }
};

export const createTask = async (organizationId: string, title: string, description?: string, category?: string): Promise<Task> => {
  const [task] = await db.insert(tasks).values({ id: randomUUID(), organizationId, title, description, category }).returning();
  return task;
};

export const getTaskById = async (taskId: string): Promise<Task | undefined> => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  return task;
};

export const createMicroTask = async (params: {
  organizationId: string;
  taskId: string;
  title: string;
  description_how?: string;
  impactReason?: string;
  location?: string;
  contactPerson?: string;
  estimatedDuration?: string;
  attachments?: string;
  status?: MicroTaskStatus;
  assignedUserId?: string;
  dueAt?: string | null;
  rewardPoints?: number;
}): Promise<MicroTask> => {
  const task = await getTaskById(params.taskId);
  if (!task) throw new Error("Task not found");
  if (task.organizationId !== params.organizationId) throw new Error("MicroTask organization mismatch");

  const [microTask] = await db.insert(microTasks).values({
    id: randomUUID(),
    organizationId: params.organizationId,
    taskId: params.taskId,
    title: params.title,
    descriptionHow: params.description_how,
    impactReason: params.impactReason,
    location: params.location,
    contactPerson: params.contactPerson,
    estimatedDuration: params.estimatedDuration,
    attachments: params.attachments,
    rewardPoints: params.rewardPoints ?? 10,
    status: params.status ?? (params.assignedUserId ? "ASSIGNED" : "OPEN"),
    assignedUserId: params.assignedUserId,
    dueAt: params.dueAt ? new Date(params.dueAt) : null,
  }).returning();
  return microTask;
};

export const createTaskOffer = async (microTaskId: string, userId: string, status: TaskOfferStatus = "SUGGESTED"): Promise<TaskOffer> => {
  const [offer] = await db.insert(taskOffers).values({
    id: randomUUID(),
    microTaskId,
    userId,
    status
  }).returning();
  return offer;
};

export const getTaskOfferByMicroTaskIdAndUserId = async (microTaskId: string, userId: string): Promise<TaskOffer | undefined> => {
  const [offer] = await db.select().from(taskOffers).where(
    and(eq(taskOffers.microTaskId, microTaskId), eq(taskOffers.userId, userId))
  );
  return offer;
};

export const listTaskOffersForUser = async (userId: string): Promise<TaskOffer[]> => {
  return db.select().from(taskOffers).where(eq(taskOffers.userId, userId));
};

export const getMicroTaskById = async (microTaskId: string): Promise<MicroTask | undefined> => {
  const [microTask] = await db.select().from(microTasks).where(eq(microTasks.id, microTaskId));
  return microTask;
};

export const acceptTaskOffer = async (microTaskId: string, userId: string): Promise<TaskOffer> => {
  const offer = await getTaskOfferByMicroTaskIdAndUserId(microTaskId, userId);
  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "SUGGESTED") throw new Error("Offer is not in SUGGESTED state");

  const microTask = await getMicroTaskById(microTaskId);
  if (!microTask) throw new Error("MicroTask not found");
  if (microTask.status !== "OPEN") throw new Error("MicroTask is not OPEN");

  const [updatedOffer] = await db.update(taskOffers)
    .set({ status: "ACCEPTED", updatedAt: new Date() })
    .where(eq(taskOffers.id, offer.id)).returning();

  await db.update(microTasks)
    .set({ status: "ASSIGNED", assignedUserId: userId, updatedAt: new Date() })
    .where(eq(microTasks.id, microTaskId));

  return updatedOffer;
};

export const rejectTaskOffer = async (microTaskId: string, userId: string): Promise<TaskOffer> => {
  const offer = await getTaskOfferByMicroTaskIdAndUserId(microTaskId, userId);
  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "SUGGESTED") throw new Error("Offer is not in SUGGESTED state");

  const [updatedOffer] = await db.update(taskOffers)
    .set({ status: "REJECTED", updatedAt: new Date() })
    .where(eq(taskOffers.id, offer.id)).returning();
  return updatedOffer;
};

export const assignMicroTask = async (microTaskId: string, userId: string): Promise<MicroTask> => {
  const microTask = await getMicroTaskById(microTaskId);
  if (!microTask) throw new Error("MicroTask not found");
  if (microTask.status !== "OPEN") throw new Error("MicroTask is not OPEN");

  const [updatedTask] = await db.update(microTasks)
    .set({ status: "ASSIGNED", assignedUserId: userId, updatedAt: new Date() })
    .where(eq(microTasks.id, microTaskId)).returning();

  return updatedTask;
};

export const completeMicroTask = async (microTaskId: string, userId: string): Promise<MicroTask> => {
  const microTask = await getMicroTaskById(microTaskId);
  if (!microTask) throw new Error("MicroTask not found");
  if (microTask.status !== "ASSIGNED") throw new Error("MicroTask is not ASSIGNED");
  if (microTask.assignedUserId !== userId) throw new Error("Not assigned to user");

  const [updatedTask] = await db.update(microTasks)
    .set({ status: "DONE", updatedAt: new Date() })
    .where(eq(microTasks.id, microTaskId)).returning();

  if (process.env.ENABLE_GAMIFICATION === "true") {
    const membership = await findMembership(userId, microTask.organizationId);
    if (membership) {
      await db.update(memberships)
        .set({ strikeScore: membership.strikeScore + microTask.rewardPoints })
        .where(eq(memberships.id, membership.id));
    }
  }

  return updatedTask;
};

export const joinQueue = async (microTaskId: string, userId: string): Promise<QueueIntent> => {
  const microTask = await getMicroTaskById(microTaskId);
  if (!microTask) throw new Error("MicroTask not found");

  // Check if already in queue
  const existing = await db.select().from(queueIntents).where(
    and(
      eq(queueIntents.microTaskId, microTaskId),
      eq(queueIntents.userId, userId),
      or(eq(queueIntents.status, "QUEUED"), eq(queueIntents.status, "NOTIFIED"))
    )
  );
  if (existing.length > 0) throw new Error("User already in queue");

  const [intent] = await db.insert(queueIntents).values({
    id: randomUUID(),
    microTaskId,
    userId,
    status: "QUEUED"
  }).returning();
  return intent;
};

export const leaveQueue = async (microTaskId: string, userId: string): Promise<void> => {
  await db.update(queueIntents)
    .set({ status: "WITHDRAWN", updatedAt: new Date() })
    .where(
      and(
        eq(queueIntents.microTaskId, microTaskId),
        eq(queueIntents.userId, userId),
        eq(queueIntents.status, "QUEUED")
      )
    );
};

export const promoteNextInQueue = async (microTaskId: string): Promise<MicroTask> => {
  const [nextInQueue] = await db.select().from(queueIntents)
    .where(
      and(eq(queueIntents.microTaskId, microTaskId), eq(queueIntents.status, "QUEUED"))
    )
    .orderBy(queueIntents.createdAt)
    .limit(1);

  if (nextInQueue) {
    const [updatedIntent] = await db.update(queueIntents)
      .set({ status: "NOTIFIED", updatedAt: new Date() })
      .where(eq(queueIntents.id, nextInQueue.id)).returning();

    const [updatedTask] = await db.update(microTasks)
      .set({ status: "ASSIGNED", assignedUserId: nextInQueue.userId, updatedAt: new Date() })
      .where(eq(microTasks.id, microTaskId)).returning();

    appEvents.emit("pushNotification", {
      userId: nextInQueue.userId,
      event: "TASK_ASSIGNED_FROM_QUEUE",
      payload: {
        microTaskId: updatedTask.id,
        title: updatedTask.title,
        message: "Eine Aufgabe aus deiner Warteschlange wurde dir zugewiesen!"
      }
    });

    return updatedTask;
  } else {
    const [updatedTask] = await db.update(microTasks)
      .set({ status: "OPEN", assignedUserId: null, updatedAt: new Date() })
      .where(eq(microTasks.id, microTaskId)).returning();

    appEvents.emit("pushNotificationRole", {
      organizationId: updatedTask.organizationId,
      role: "ORGANIZER",
      event: "TASK_QUEUE_EMPTY",
      payload: {
        microTaskId: updatedTask.id,
        title: updatedTask.title,
        message: "Eine Aufgabe wurde abgesagt und die Warteschlange ist leer!"
      }
    });

    return updatedTask;
  }
};

export const unassignTask = async (microTaskId: string, userId: string): Promise<MicroTask> => {
  const microTask = await getMicroTaskById(microTaskId);
  if (!microTask) throw new Error("MicroTask not found");
  if (microTask.status !== "ASSIGNED") throw new Error("MicroTask is not ASSIGNED");
  if (microTask.assignedUserId !== userId) throw new Error("Not assigned to user");

  // Also remove the current user's NOTIFIED queue intent if they had one
  await db.update(queueIntents)
    .set({ status: "WITHDRAWN", updatedAt: new Date() })
    .where(
      and(
        eq(queueIntents.microTaskId, microTaskId),
        eq(queueIntents.userId, userId),
        eq(queueIntents.status, "NOTIFIED")
      )
    );

  return await promoteNextInQueue(microTaskId);
};

export const checkQueueTimeouts = async () => {
  const timeoutThreshold = new Date(Date.now() - 15 * 60 * 1000);

  const expiredIntents = await db.select().from(queueIntents)
    .where(
      and(
        eq(queueIntents.status, "NOTIFIED"),
        lt(queueIntents.updatedAt, timeoutThreshold)
      )
    );

  for (const intent of expiredIntents) {
    if (intent.status === "NOTIFIED") {
      await db.update(queueIntents)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(eq(queueIntents.id, intent.id));

      // Auto-promote the next user
      await promoteNextInQueue(intent.microTaskId);
    }
  }
};

export const listMyMicroTasks = async (organizationId: string, userId: string): Promise<MicroTask[]> => {
  return db.select().from(microTasks).where(
    and(
      eq(microTasks.organizationId, organizationId),
      eq(microTasks.assignedUserId, userId),
      or(eq(microTasks.status, "ASSIGNED"), eq(microTasks.status, "DONE"))
    )
  ).orderBy(desc(microTasks.createdAt));
};

export const listMicroTasksForOrganization = async (
  organizationId: string,
  status?: MicroTaskStatus
): Promise<MicroTask[]> => {
  if (status) {
    return db.select().from(microTasks).where(
      and(eq(microTasks.organizationId, organizationId), eq(microTasks.status, status))
    ).orderBy(desc(microTasks.createdAt));
  }
  return db.select().from(microTasks).where(eq(microTasks.organizationId, organizationId)).orderBy(desc(microTasks.createdAt));
};

export const getLeaderboard = async (organizationId: string) => {
  return db.select({
    id: users.id,
    displayName: users.displayName,
    strikeScore: memberships.strikeScore
  })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.status, "ACTIVE")))
    .orderBy(desc(memberships.strikeScore));
};

export const ensureSeedMicroTasks = async (organizationId: string, seedUserId?: string) => {
  const existing = await listMicroTasksForOrganization(organizationId);
  if (existing.length > 0) return;

  const task = await createTask(
    organizationId,
    "Sommerfest organisieren",
    "Koordination des Sommerfests für das Team"
  );

  const micro1 = await createMicroTask({
    organizationId,
    taskId: task.id,
    title: "Getränke einkaufen",
    description_how: "Wasser, Saft, Cola für ca. 20 Personen kaufen. Transporter steht am Vereinsheim bereit.",
    location: "Getränkemarkt Süd",
    contactPerson: "Maria (Vorstand)",
    estimatedDuration: "ca. 1 Stunde",
    attachments: "https://example.com/einkaufsliste",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString()
  });

  if (seedUserId) {
    await createTaskOffer(micro1.id, seedUserId);
  }

  await createMicroTask({
    organizationId,
    taskId: task.id,
    title: "Einladung verschicken",
    description_how: "Einladung an das gesamte Team via E-Mail Verteiler senden. Entwurf liegt im Drive.",
    location: "Remote",
    contactPerson: "Julian",
    estimatedDuration: "ca. 15 Minuten",
    attachments: "https://drive.google.com/...",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString()
  });

  await createMicroTask({
    organizationId,
    taskId: task.id,
    title: "Musik-Playlist kuratieren",
    description_how: "Spotify Playlist für den Abend zusammenstellen. Mischung aus Pop und Klassikern.",
    location: "Remote",
    contactPerson: "Anna",
    estimatedDuration: "ca. 30 Minuten",
    dueAt: null
  });
};

export const parseDurationMinutes = (durationStr: string | null): number => {
  if (!durationStr) return 0;
  const lower = durationStr.toLowerCase();
  const match = lower.match(/(\d+)/);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  if (lower.includes("stunde") || lower.includes("h")) return val * 60;
  return val;
};

export const getUserCompletedTaskTimeThisMonth = async (userId: string, organizationId: string): Promise<number> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tasks = await db.select().from(microTasks).where(
    and(
      eq(microTasks.assignedUserId, userId),
      eq(microTasks.organizationId, organizationId),
      eq(microTasks.status, "DONE"),
      gte(microTasks.updatedAt, startOfMonth)
    )
  );

  return tasks.reduce((sum, t) => sum + parseDurationMinutes(t.estimatedDuration), 0);
};

export const getOrganizationAverageCompletedTimeThisMonth = async (organizationId: string): Promise<number> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tasks = await db.select().from(microTasks).where(
    and(
      eq(microTasks.organizationId, organizationId),
      eq(microTasks.status, "DONE"),
      gte(microTasks.updatedAt, startOfMonth)
    )
  );

  const totalMinutes = tasks.reduce((sum, t) => sum + parseDurationMinutes(t.estimatedDuration), 0);

  const members = await listMembershipsForOrganization(organizationId);
  const activeMembersCount = members.length;
  if (activeMembersCount === 0) return 0;

  return Math.round(totalMinutes / activeMembersCount);
};

export const ensureCalendarToken = async (userId: string): Promise<string> => {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.calendarFeedToken) return user.calendarFeedToken;

  const newToken = randomUUID();
  await db.update(users)
    .set({ calendarFeedToken: newToken, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return newToken;
};

export const getUserByCalendarToken = async (token: string): Promise<User | undefined> => {
  const [user] = await db.select().from(users).where(eq(users.calendarFeedToken, token));
  return user;
};

export const getAssignedMicroTasksForUserGlobally = async (userId: string): Promise<MicroTask[]> => {
  return db.select().from(microTasks).where(
    and(
      eq(microTasks.assignedUserId, userId),
      eq(microTasks.status, "ASSIGNED")
    )
  );
};
