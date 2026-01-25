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

  return [
    addMembership(user.id, primaryOrg.id, "ADMIN"),
    addMembership(user.id, secondaryOrg.id, "MEMBER")
  ];
};
