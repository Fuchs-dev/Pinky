import { pgTable, text, timestamp, varchar, primaryKey, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
    id: varchar("id", { length: 255 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    displayName: varchar("display_name", { length: 255 }),
    age: integer("age"),
    gender: varchar("gender", { length: 50 }), // female, male, diverse, preferNotToSay
    department: varchar("department", { length: 255 }),
    interests: text("interests"),
    qualifications: text("qualifications"),
    hasDriversLicense: boolean("has_drivers_license"),
    helpContext: text("help_context"),
    weeklyTimeBudgetMinutes: integer("weekly_time_budget_minutes").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const organizations = pgTable("organizations", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const memberships = pgTable("memberships", {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => organizations.id),
    role: varchar("role", { length: 50 }).notNull(), // ADMIN, ORGANIZER, MEMBER
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
    strikeScore: integer("strike_score").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const tasks = pgTable("tasks", {
    id: varchar("id", { length: 255 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => organizations.id),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const microTasks = pgTable("micro_tasks", {
    id: varchar("id", { length: 255 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 255 }).notNull().references(() => organizations.id),
    taskId: varchar("task_id", { length: 255 }).notNull().references(() => tasks.id),
    title: varchar("title", { length: 500 }).notNull(),
    descriptionHow: text("description_how"),
    impactReason: text("impact_reason"),
    rewardPoints: integer("reward_points").default(10).notNull(),
    location: varchar("location", { length: 500 }),
    contactPerson: varchar("contact_person", { length: 255 }),
    estimatedDuration: varchar("estimated_duration", { length: 255 }),
    attachments: text("attachments"),
    status: varchar("status", { length: 50 }).notNull().default("OPEN"), // OPEN, ASSIGNED, DONE
    assignedUserId: varchar("assigned_user_id", { length: 255 }).references(() => users.id),
    dueAt: timestamp("due_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const taskOffers = pgTable("task_offers", {
    id: varchar("id", { length: 255 }).primaryKey(),
    microTaskId: varchar("micro_task_id", { length: 255 }).notNull().references(() => microTasks.id),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    status: varchar("status", { length: 50 }).notNull().default("SUGGESTED"), // SUGGESTED, REJECTED, ACCEPTED
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const queueIntents = pgTable("queue_intents", {
    id: varchar("id", { length: 255 }).primaryKey(),
    microTaskId: varchar("micro_task_id", { length: 255 }).notNull().references(() => microTasks.id),
    userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    status: varchar("status", { length: 50 }).notNull().default("QUEUED"), // QUEUED, NOTIFIED, WITHDRAWN, EXPIRED
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations for easier nested queries
export const usersRelations = relations(users, ({ many }) => ({
    memberships: many(memberships),
    microTasks: many(microTasks),
    taskOffers: many(taskOffers),
    queueIntents: many(queueIntents)
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
    memberships: many(memberships),
    tasks: many(tasks),
    microTasks: many(microTasks)
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
    user: one(users, { fields: [memberships.userId], references: [users.id] }),
    organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] })
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    organization: one(organizations, { fields: [tasks.organizationId], references: [organizations.id] }),
    microTasks: many(microTasks)
}));

export const microTasksRelations = relations(microTasks, ({ one, many }) => ({
    task: one(tasks, { fields: [microTasks.taskId], references: [tasks.id] }),
    organization: one(organizations, { fields: [microTasks.organizationId], references: [organizations.id] }),
    assignedUser: one(users, { fields: [microTasks.assignedUserId], references: [users.id] }),
    offers: many(taskOffers),
    queueIntents: many(queueIntents)
}));

export const taskOffersRelations = relations(taskOffers, ({ one }) => ({
    microTask: one(microTasks, { fields: [taskOffers.microTaskId], references: [microTasks.id] }),
    user: one(users, { fields: [taskOffers.userId], references: [users.id] })
}));

export const queueIntentsRelations = relations(queueIntents, ({ one }) => ({
    microTask: one(microTasks, { fields: [queueIntents.microTaskId], references: [microTasks.id] }),
    user: one(users, { fields: [queueIntents.userId], references: [users.id] })
}));
