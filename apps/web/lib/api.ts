const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface Membership {
  organization: {
    id: string;
    name: string;
  };
  role: string;
  strikeScore: number;
}

export interface MicroTaskSummary {
  id: string;
  title: string;
  status: string;
  task: { id: string; title: string } | null;
  timeframe: string | null;
  location: string | null;
  rewardPoints: number;
}

export interface MicroTaskDetail {
  id: string;
  title: string;
  status: string;
  task: { id: string; title: string } | null;
  description_how: string | null;
  impactReason: string | null;
  location: string | null;
  contactPerson: string | null;
  estimatedDuration: string | null;
  attachments: string | null;
  dueAt: string | null;
  createdAt: string;
  rewardPoints: number;
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

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  age?: number;
  gender?: "female" | "male" | "diverse" | "preferNotToSay";
  department?: string;
  interests?: string;
  qualifications?: string;
  hasDriversLicense?: boolean;
  helpContext?: string;
  weeklyTimeBudgetMinutes?: number;
}

export const fetchMyProfile = async (token: string): Promise<UserProfile> => {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: authHeaders(token)
  });
  if (!response.ok) throw new Error("Unable to load profile");
  return (await response.json()) as UserProfile;
};

export const updateMyProfile = async (token: string, data: Partial<UserProfile>): Promise<UserProfile> => {
  const response = await fetch(`${API_BASE_URL}/me/profile`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update profile");
  }
  return (await response.json()) as UserProfile;
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
): Promise<{ offered: MicroTaskSummary[]; open: MicroTaskSummary[] }> => {
  const response = await fetch(
    `${API_BASE_URL}/microtasks/feed`,
    {
      headers: authHeaders(token, orgId)
    }
  );
  if (!response.ok) {
    throw new Error("Unable to load microtasks");
  }
  return (await response.json()) as { offered: MicroTaskSummary[]; open: MicroTaskSummary[] };
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

export const acceptOffer = async (token: string, orgId: string, microTaskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}/offer/accept`, {
    method: "POST",
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) throw new Error("Unable to accept offer");
};

export const rejectOffer = async (token: string, orgId: string, microTaskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}/offer/reject`, {
    method: "POST",
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) throw new Error("Unable to reject offer");
};

export const assignTask = async (token: string, orgId: string, microTaskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}/assign`, {
    method: "POST",
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) throw new Error("Unable to assign task");
};

export const completeTask = async (token: string, orgId: string, microTaskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}/complete`, {
    method: "POST",
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) throw new Error("Unable to complete task");
};

export const generateTaskSuggestions = async (token: string, orgId: string, prompt: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/ai/split-task`, {
    method: "POST",
    headers: authHeaders(token, orgId),
    body: JSON.stringify({ prompt })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Fehler bei der KI-Generierung");
  }
  return response.json();
};

export const fetchMyMicroTasks = async (token: string, orgId: string): Promise<MicroTaskSummary[]> => {
  const response = await fetch(`${API_BASE_URL}/me/microtasks`, {
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) throw new Error("Unable to load my microtasks");
  return (await response.json()) as MicroTaskSummary[];
};

export const fetchLeaderboard = async (token: string, orgId: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/org/leaderboard`, {
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) throw new Error("Unable to load leaderboard");
  return await response.json();
};

export const createTask = async (
  token: string,
  orgId: string,
  payload: { title: string; category?: string; description?: string }
): Promise<{ id: string }> => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create task");
  }
  return await response.json();
};

export const createMicroTask = async (
  token: string,
  orgId: string,
  taskId: string,
  payload: {
    title: string;
    description_how?: string;
    location?: string;
    contactPerson?: string;
    estimatedDuration?: string;
    impactReason?: string;
    rewardPoints?: number;
    dueAt?: string;
    assignedUserId?: string;
  }
): Promise<{ id: string }> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/microtasks`, {
    method: "POST",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create microtask");
  }
  return await response.json();
};

export const joinQueue = async (token: string, orgId: string, microTaskId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}/queue/join`, {
    method: "POST",
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Unable to join queue");
  }
  return await response.json();
};

export const leaveQueue = async (token: string, orgId: string, microTaskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}/queue/leave`, {
    method: "POST",
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Unable to leave queue");
  }
};

export const unassignTask = async (token: string, orgId: string, microTaskId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/microtasks/${microTaskId}/unassign`, {
    method: "POST",
    headers: authHeaders(token, orgId)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Unable to unassign task");
  }
  return await response.json();
};
