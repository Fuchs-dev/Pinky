import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../server";

const startServer = async () => {
  const server = createApiServer();
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to start server");
  }
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
};

const loginUser = async (baseUrl: string, email: string) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { accessToken: string };
  return payload.accessToken;
};

const getMembershipOrg = async (baseUrl: string, token: string) => {
  const response = await fetch(`${baseUrl}/me/memberships`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Array<{
    organization: { id: string };
  }>;
  return payload[0].organization.id;
};

const getMembershipOrgs = async (baseUrl: string, token: string) => {
  const response = await fetch(`${baseUrl}/me/memberships`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as Array<{
    organization: { id: string };
  }>;
  return payload.map((item) => item.organization.id);
};

test("GET /health returns ok", async () => {
  const { server, baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, { status: "ok" });
  server.close();
});

test("Org guard returns 401 when missing token", async () => {
  const { server, baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/org/ping`, {
    headers: { "X-Org-Id": "b6c3a7d8-2b7f-4b7e-9d7c-8c8a2ef8d5b4" }
  });
  assert.equal(response.status, 401);
  server.close();
});

test("Org guard returns 400 when missing org header", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-missing-header@example.com");
  const response = await fetch(`${baseUrl}/org/ping`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 400);
  server.close();
});

test("Org guard returns 403 for non-member org", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-forbidden@example.com");
  const response = await fetch(`${baseUrl}/org/ping`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": "1b7e0f52-4c66-4b60-9d1f-1bd3140d7d1c"
    }
  });
  assert.equal(response.status, 403);
  server.close();
});

test("Org guard allows member access", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-allowed@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);
  const response = await fetch(`${baseUrl}/org/ping`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": orgId
    }
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.organizationId, orgId);
  server.close();
});

test("GET /microtasks/feed returns offered and open tasks for active org", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-microtasks-list@example.com");
  const orgIds = await getMembershipOrgs(baseUrl, token);
  const [primaryOrgId, secondaryOrgId] = orgIds;

  const primaryResponse = await fetch(
    `${baseUrl}/microtasks/feed`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": primaryOrgId
      }
    }
  );
  assert.equal(primaryResponse.status, 200);
  const primaryPayload = (await primaryResponse.json()) as {
    offered: Array<{ id: string }>;
    open: Array<{ id: string }>;
  };

  // Due to our deterministic seed data, primaryOrg for this user should have 1 offered task and 2 open tasks
  assert.equal(primaryPayload.offered.length, 1);
  assert.equal(primaryPayload.open.length, 2);

  const secondaryResponse = await fetch(
    `${baseUrl}/microtasks/feed`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": secondaryOrgId
      }
    }
  );
  assert.equal(secondaryResponse.status, 200);
  const secondaryPayload = (await secondaryResponse.json()) as {
    offered: Array<{ id: string }>;
    open: Array<{ id: string }>;
  };
  assert.ok(secondaryPayload.offered.length >= 0);
  assert.ok(secondaryPayload.open.length > 0);
  assert.notEqual(primaryPayload.open[0].id, secondaryPayload.open[0].id);
  server.close();
});

test("GET /microtasks/feed enforces org membership", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-microtasks-forbidden@example.com");
  const response = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": "89b8f645-6405-48b0-9b3b-3cf2abf4f44b"
    }
  });
  assert.equal(response.status, 403);
  server.close();
});

test("GET /microtasks/:id hides other org microtasks", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-microtasks-detail@example.com");
  const orgIds = await getMembershipOrgs(baseUrl, token);
  const [primaryOrgId, secondaryOrgId] = orgIds;

  const listResponse = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": primaryOrgId
    }
  });
  assert.equal(listResponse.status, 200);
  const listPayload = (await listResponse.json()) as {
    offered: Array<{ id: string }>;
    open: Array<{ id: string }>;
  };
  const microTaskId = listPayload.open[0].id;

  const detailResponse = await fetch(
    `${baseUrl}/microtasks/${microTaskId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": primaryOrgId
      }
    }
  );
  assert.equal(detailResponse.status, 200);

  const forbiddenDetailResponse = await fetch(
    `${baseUrl}/microtasks/${microTaskId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": secondaryOrgId
      }
    }
  );
  assert.equal(forbiddenDetailResponse.status, 404);
  server.close();
});

test("GET /microtasks/:id returns 404 for missing id", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-microtasks-404@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const response = await fetch(
    `${baseUrl}/microtasks/0e6f8f87-9d02-4da1-8b2f-1a3a55f4dd67`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": orgId
      }
    }
  );
  assert.equal(response.status, 404);
  server.close();
});

test("POST /microtasks/:id/assign assigns an OPEN task", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-assign@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const listResponse = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  const listPayload = (await listResponse.json()) as any;
  const microTaskId = listPayload.open[0].id;

  const assignResponse = await fetch(`${baseUrl}/microtasks/${microTaskId}/assign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(assignResponse.status, 200);
  const assignPayload = (await assignResponse.json()) as any;
  assert.equal(assignPayload.status, "ASSIGNED");

  // Verify second assign fails
  const assignFailResponse = await fetch(`${baseUrl}/microtasks/${microTaskId}/assign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(assignFailResponse.status, 409);

  server.close();
});

test("POST /microtasks/:id/complete completes an ASSIGNED task", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-complete@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const listResponse = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  const listPayload = (await listResponse.json()) as any;
  // Use index 1 to avoid stepping on index 0 across tests as store is memory global right now
  const microTaskId = listPayload.open[1].id;

  // Complete before assign should fail
  const completeFail1 = await fetch(`${baseUrl}/microtasks/${microTaskId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(completeFail1.status, 409);

  await fetch(`${baseUrl}/microtasks/${microTaskId}/assign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });

  const completeResponse = await fetch(`${baseUrl}/microtasks/${microTaskId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(completeResponse.status, 200);
  const completePayload = (await completeResponse.json()) as any;
  assert.equal(completePayload.status, "DONE");

  server.close();
});

test("POST /microtasks/:id/offer/accept works as expected", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-offer@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const listResponse = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  const listPayload = (await listResponse.json()) as any;
  const offerId = listPayload.offered[0].id;

  const acceptResponse = await fetch(`${baseUrl}/microtasks/${offerId}/offer/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(acceptResponse.status, 200);

  server.close();
});

test("GET /me/microtasks returns assigned tasks", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-my-tasks@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const listResponse = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  const listPayload = (await listResponse.json()) as any;
  const taskId = listPayload.open[2]?.id ?? listPayload.open[0].id;

  // Assign it
  await fetch(`${baseUrl}/microtasks/${taskId}/assign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });

  const myTasksResponse = await fetch(`${baseUrl}/me/microtasks`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(myTasksResponse.status, 200);
  const myTasksPayload = (await myTasksResponse.json()) as any[];
  assert.ok(myTasksPayload.length >= 1);

  server.close();
});

test("POST /tasks creates a project if ADMIN", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-create-task@example.com");
  const orgId = await getMembershipOrg(baseUrl, token); // default is ADMIN in Primary org

  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": orgId,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Neues Projekt",
      description: "Projektbeschreibung",
      category: "VERANSTALTUNG"
    })
  });
  assert.equal(response.status, 201);
  const payload = (await response.json()) as any;
  assert.ok(payload.id);

  server.close();
});

test("POST /tasks fails if MEMBER", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-create-task-member@example.com");
  const orgIds = await getMembershipOrgs(baseUrl, token);
  const secondaryOrgId = orgIds[1]; // default is MEMBER in Secondary org

  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": secondaryOrgId,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Neues Projekt",
      category: "VERANSTALTUNG"
    })
  });
  assert.equal(response.status, 403);

  server.close();
});

test("POST /tasks/:taskId/microtasks creates a microtask if ADMIN", async () => {
  const { server, baseUrl } = await startServer();
  // We use test-create-task@example.com again to leverage the same primary org if we want, but tests are isolated DB-wise if we don't clear.
  // Actually, they aren't isolated db-wise, we just create a unique login user per test.
  const token = await loginUser(baseUrl, "test-create-microtask@example.com");
  const orgId = await getMembershipOrg(baseUrl, token); // ADMIN

  // Create task first
  const taskResponse = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Projekt 1" })
  });
  const taskPayload = (await taskResponse.json()) as any;
  const taskId = taskPayload.id;

  // Create microtask
  const microTaskResponse = await fetch(`${baseUrl}/tasks/${taskId}/microtasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": orgId,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Neue Teilaufgabe",
      impactReason: "Sehr wichtig",
      estimatedDuration: "10 Min"
    })
  });

  assert.equal(microTaskResponse.status, 201);
  const microTaskPayload = (await microTaskResponse.json()) as any;
  assert.ok(microTaskPayload.id);

  server.close();
});

test("GET /org/leaderboard returns sorted memberships", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-leaderboard@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const response = await fetch(`${baseUrl}/org/leaderboard`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });

  assert.equal(response.status, 200);
  const payload = (await response.json()) as any[];
  assert.ok(Array.isArray(payload));
  if (payload.length > 0) {
    assert.ok(payload[0].strikeScore !== undefined);
  }

  server.close();
});

test("Completing a task increments strikeScore when ENABLE_GAMIFICATION is true", async () => {
  process.env.ENABLE_GAMIFICATION = "true";
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-gamification@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  // Capture original score
  const membersResponse = await fetch(`${baseUrl}/me/memberships`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const membersPayload = (await membersResponse.json()) as any[];
  const initialScore = membersPayload.find((m: any) => m.organization.id === orgId).strikeScore;

  // Find a task to complete
  const listResponse = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  const listPayload = (await listResponse.json()) as any;
  const microTaskId = listPayload.open[0].id;
  const rewardPoints = listPayload.open[0].rewardPoints ?? 10;

  // Assign and Complete
  await fetch(`${baseUrl}/microtasks/${microTaskId}/assign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  const completeResponse = await fetch(`${baseUrl}/microtasks/${microTaskId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(completeResponse.status, 200);

  // Verify new score
  const newMembersResponse = await fetch(`${baseUrl}/me/memberships`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const newMembersPayload = (await newMembersResponse.json()) as any[];
  const newScore = newMembersPayload.find((m: any) => m.organization.id === orgId).strikeScore;

  assert.equal(newScore, initialScore + rewardPoints);
  process.env.ENABLE_GAMIFICATION = undefined; // reset
  server.close();
});

test("POST /microtasks/:id/queue/join and /leave function correctly", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-queue-join@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const listResponse = await fetch(`${baseUrl}/microtasks/feed`, {
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  const listPayload = (await listResponse.json()) as any;
  const microTaskId = listPayload.open[0].id;

  const joinResponse = await fetch(`${baseUrl}/microtasks/${microTaskId}/queue/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  if (joinResponse.status !== 200) {
    throw new Error(`Join failed: ${await joinResponse.text()}`);
  }
  const joinPayload = await joinResponse.json() as any;
  assert.equal(joinPayload.status, "QUEUED");

  // Join again should fail with 409
  const joinAgainResponse = await fetch(`${baseUrl}/microtasks/${microTaskId}/queue/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(joinAgainResponse.status, 409);

  // Leave queue
  const leaveResponse = await fetch(`${baseUrl}/microtasks/${microTaskId}/queue/leave`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId }
  });
  assert.equal(leaveResponse.status, 200);

  server.close();
});

test("POST /microtasks/:id/unassign passes task to the next in queue", async () => {
  const { server, baseUrl } = await startServer();
  const ownerToken = await loginUser(baseUrl, "test-queue-owner@example.com");
  const orgId = await getMembershipOrg(baseUrl, ownerToken);

  const taskResp = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ownerToken}`, "X-Org-Id": orgId, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Queue Test Project" })
  });
  const { id: taskId } = await taskResp.json() as any;

  const microTaskResp = await fetch(`${baseUrl}/tasks/${taskId}/microtasks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ownerToken}`, "X-Org-Id": orgId, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Queue MicroTask" })
  });
  const { id: microTaskId } = await microTaskResp.json() as any;

  // Owner assigns it
  const assignResp = await fetch(`${baseUrl}/microtasks/${microTaskId}/assign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ownerToken}`, "X-Org-Id": orgId }
  });
  if (assignResp.status !== 200) throw new Error(`Assign failed: ${await assignResp.text()}`);

  // Owner joins the queue
  const joinResp = await fetch(`${baseUrl}/microtasks/${microTaskId}/queue/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ownerToken}`, "X-Org-Id": orgId }
  });
  if (joinResp.status !== 200) throw new Error(`Join failed: ${await joinResp.text()}`);

  // Owner unassigns
  const unassignResp = await fetch(`${baseUrl}/microtasks/${microTaskId}/unassign`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ownerToken}`, "X-Org-Id": orgId }
  });
  assert.equal(unassignResp.status, 200, `Unassign failed`);
  const unassignPayload = await unassignResp.json() as any;

  // Verify Owner took over again
  const meResp = await fetch(`${baseUrl}/me`, { headers: { Authorization: `Bearer ${ownerToken}` } });
  const mePayload = await meResp.json() as any;

  assert.equal(unassignPayload.status, "ASSIGNED");
  assert.equal(unassignPayload.assignedUserId, mePayload.id);

  server.close();
});

test("POST /ai/split-task returns generated microtasks (with mock fallback)", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-ai-admin@example.com");
  const orgId = await getMembershipOrg(baseUrl, token);

  const response = await fetch(`${baseUrl}/ai/split-task`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Org-Id": orgId, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Plane ein Sommerfest" })
  });

  assert.equal(response.status, 200, "Split task API failed");
  const payload = await response.json() as any;
  assert.ok(payload.microTasks !== undefined);
  assert.ok(payload.microTasks.length > 0);

  if (!process.env.OPENAI_API_KEY) {
    assert.equal(payload.microTasks[0].title, "Mock Task 1 (Auto-Split)");
  }

  server.close();
});

test("PUT /me/profile updates extended user profile fields", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-profile-update@example.com");

  const updateResponse = await fetch(`${baseUrl}/me/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "Jane Doe",
      age: 28,
      gender: "female",
      department: "Marketing",
      interests: "Design, Social Media",
      qualifications: "B.A. Arts",
      hasDriversLicense: true,
      helpContext: "Likes to help with creative tasks.",
      weeklyTimeBudgetMinutes: 120
    })
  });

  assert.equal(updateResponse.status, 200, "Update profile API failed");
  const payload = await updateResponse.json() as any;
  assert.equal(payload.displayName, "Jane Doe");
  assert.equal(payload.age, 28);
  assert.equal(payload.gender, "female");
  assert.equal(payload.weeklyTimeBudgetMinutes, 120);

  // Verify fetch me returns it too
  const meResponse = await fetch(`${baseUrl}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const mePayload = await meResponse.json() as any;
  assert.equal(mePayload.age, 28);
  assert.equal(mePayload.department, "Marketing");

  server.close();
});
