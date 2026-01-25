const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface Membership {
  organization: {
    id: string;
    name: string;
  };
  role: string;
}

export interface MicroTaskSummary {
  id: string;
  title: string;
  status: string;
  task: { id: string; title: string } | null;
  dueAt: string | null;
}

export interface MicroTaskDetail extends MicroTaskSummary {
  description: string | null;
  createdAt: string;
}

const authHeaders = (token: string, orgId?: string) => ({
  Authorization: `Bearer ${token}`,
  ...(orgId ? { "X-Org-Id": orgId } : {})
});

export const login = async (email: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!response.ok) {
    throw new Error("Login failed");
  }
  const payload = (await response.json()) as { accessToken: string };
  return payload.accessToken;
};

export const fetchMemberships = async (token: string): Promise<Membership[]> => {
  const response = await fetch(`${API_BASE_URL}/me/memberships`, {
    headers: authHeaders(token)
  });
  if (!response.ok) {
    throw new Error("Unable to load memberships");
  }
  return (await response.json()) as Membership[];
};

export const pingOrganization = async (token: string, orgId: string) => {
  const response = await fetch(`${API_BASE_URL}/org/ping`, {
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) {
    throw new Error("Unable to ping organization");
  }
  return (await response.json()) as {
    status: string;
    organizationId: string;
    role: string;
  };
};

export const fetchMicroTasks = async (
  token: string,
  orgId: string
): Promise<MicroTaskSummary[]> => {
  const response = await fetch(
    `${API_BASE_URL}/microtasks?status=OPEN`,
    {
      headers: authHeaders(token, orgId)
    }
  );
  if (!response.ok) {
    throw new Error("Unable to load microtasks");
  }
  return (await response.json()) as MicroTaskSummary[];
};

export const fetchMicroTaskDetail = async (
  token: string,
  orgId: string,
  microTaskId: string
): Promise<MicroTaskDetail> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}`, {
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) {
    throw new Error("Unable to load microtask detail");
  }
  return (await response.json()) as MicroTaskDetail;
};
