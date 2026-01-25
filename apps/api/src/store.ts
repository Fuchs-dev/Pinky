import { randomUUID } from "crypto";

export type MembershipRole = "ADMIN" | "ORGANIZER" | "MEMBER";
export type MembershipStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type MicroTaskStatus = "OPEN" | "ASSIGNED" | "DONE";

export interface MicroTask {
  id: string;
  organizationId: string;
  taskId: string;
  title: string;
  description?: string;
  status: MicroTaskStatus;
  assignedUserId?: string;
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

const usersById = new Map<string, User>();
const usersByEmail = new Map<string, User>();
const organizationsById = new Map<string, Organization>();
const membershipsById = new Map<string, Membership>();
const tasksById = new Map<string, Task>();
const microTasksById = new Map<string, MicroTask>();

const now = () => new Date().toISOString();

export const createUser = (email: string, displayName?: string): User => {
  const timestamp = now();
  const user: User = {
    id: randomUUID(),
    email,
    displayName,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  usersById.set(user.id, user);
  usersByEmail.set(user.email, user);
  return user;
};

export const getUserByEmail = (email: string): User | undefined =>
  usersByEmail.get(email);

export const getUserById = (id: string): User | undefined => usersById.get(id);

export const createOrganization = (name: string): Organization => {
  const timestamp = now();
  const organization: Organization = {
    id: randomUUID(),
    name,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  organizationsById.set(organization.id, organization);
  return organization;
};

export const addMembership = (
  userId: string,
  organizationId: string,
  role: MembershipRole
): Membership => {
  const timestamp = now();
  const membership: Membership = {
    id: randomUUID(),
    userId,
    organizationId,
    role,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  membershipsById.set(membership.id, membership);
  return membership;
};

export const listMembershipsForUser = (userId: string): Membership[] =>
  Array.from(membershipsById.values()).filter(
    (membership) => membership.userId === userId
  );

export const findMembership = (
  userId: string,
  organizationId: string
): Membership | undefined =>
  listMembershipsForUser(userId).find(
    (membership) => membership.organizationId === organizationId
  );

export const getOrganizationById = (
  organizationId: string
): Organization | undefined => organizationsById.get(organizationId);

export const seedUserMemberships = (user: User): Membership[] => {
  const existing = listMembershipsForUser(user.id);
  if (existing.length > 0) {
    return existing;
  }

  const primaryOrg = createOrganization(`Pinky Workspace (${user.email})`);
  const secondaryOrg = createOrganization("Pinky Demo Workspace");

  const memberships = [
    addMembership(user.id, primaryOrg.id, "ADMIN"),
    addMembership(user.id, secondaryOrg.id, "MEMBER")
  ];

  ensureSeedMicroTasks(primaryOrg.id);
  ensureSeedMicroTasks(secondaryOrg.id);

  return memberships;
};

export const ensureSeedMicroTasksForUser = (userId: string) => {
  const memberships = listMembershipsForUser(userId);
  memberships.forEach((membership) => {
    ensureSeedMicroTasks(membership.organizationId);
  });
};

export const createTask = (
  organizationId: string,
  title: string,
  description?: string
): Task => {
  const timestamp = now();
  const task: Task = {
    id: randomUUID(),
    organizationId,
    title,
    description,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  tasksById.set(task.id, task);
  return task;
};

export const getTaskById = (taskId: string): Task | undefined =>
  tasksById.get(taskId);

export const createMicroTask = (params: {
  organizationId: string;
  taskId: string;
  title: string;
  description?: string;
  status?: MicroTaskStatus;
  assignedUserId?: string;
  dueAt?: string | null;
}): MicroTask => {
  const task = getTaskById(params.taskId);
  if (!task) {
    throw new Error("Task not found");
  }
  if (task.organizationId !== params.organizationId) {
    throw new Error("MicroTask organization mismatch");
  }
  const timestamp = now();
  const microTask: MicroTask = {
    id: randomUUID(),
    organizationId: params.organizationId,
    taskId: params.taskId,
    title: params.title,
    description: params.description,
    status: params.status ?? "OPEN",
    assignedUserId: params.assignedUserId,
    dueAt: params.dueAt ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  microTasksById.set(microTask.id, microTask);
  return microTask;
};

export const listMicroTasksForOrganization = (
  organizationId: string,
  status?: MicroTaskStatus
): MicroTask[] =>
  Array.from(microTasksById.values()).filter((microTask) => {
    if (microTask.organizationId !== organizationId) {
      return false;
    }
    if (status && microTask.status !== status) {
      return false;
    }
    return true;
  });

export const getMicroTaskById = (microTaskId: string): MicroTask | undefined =>
  microTasksById.get(microTaskId);

export const ensureSeedMicroTasks = (organizationId: string) => {
  const existing = listMicroTasksForOrganization(organizationId);
  if (existing.length > 0) {
    return;
  }
  const task = createTask(
    organizationId,
    "Sommerfest organisieren",
    "Koordination des Sommerfests für das Team"
  );
  createMicroTask({
    organizationId,
    taskId: task.id,
    title: "Getränke einkaufen",
    description: "Wasser, Saft, Cola für ca. 20 Personen",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString()
  });
  createMicroTask({
    organizationId,
    taskId: task.id,
    title: "Einladung verschicken",
    description: "Einladung an das gesamte Team versenden",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString()
  });
  createMicroTask({
    organizationId,
    taskId: task.id,
    title: "Musik-Playlist kuratieren",
    description: "Playlist für den Abend zusammenstellen",
    dueAt: null
  });
};

export interface SeedData {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  tasks: Task[];
  microTasks: MicroTask[];
}

export const resetStore = () => {
  usersById.clear();
  usersByEmail.clear();
  organizationsById.clear();
  membershipsById.clear();
  tasksById.clear();
  microTasksById.clear();
};

export const exportSeedData = (): SeedData => ({
  users: Array.from(usersById.values()),
  organizations: Array.from(organizationsById.values()),
  memberships: Array.from(membershipsById.values()),
  tasks: Array.from(tasksById.values()),
  microTasks: Array.from(microTasksById.values())
});

export const loadSeedData = (seed: SeedData) => {
  resetStore();
  seed.users.forEach((user) => {
    usersById.set(user.id, user);
    usersByEmail.set(user.email, user);
  });
  seed.organizations.forEach((organization) => {
    organizationsById.set(organization.id, organization);
  });
  seed.memberships.forEach((membership) => {
    membershipsById.set(membership.id, membership);
  });
  seed.tasks.forEach((task) => {
    tasksById.set(task.id, task);
  });
  seed.microTasks.forEach((microTask) => {
    microTasksById.set(microTask.id, microTask);
  });
};
