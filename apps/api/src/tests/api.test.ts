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

test("GET /microtasks returns only tasks for active org", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-microtasks-list@example.com");
  const orgIds = await getMembershipOrgs(baseUrl, token);
  const [primaryOrgId, secondaryOrgId] = orgIds;

  const primaryResponse = await fetch(
    `${baseUrl}/microtasks?status=OPEN`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": primaryOrgId
      }
    }
  );
  assert.equal(primaryResponse.status, 200);
  const primaryPayload = (await primaryResponse.json()) as Array<{
    id: string;
  }>;
  assert.ok(primaryPayload.length > 0);

  const secondaryResponse = await fetch(
    `${baseUrl}/microtasks?status=OPEN`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Org-Id": secondaryOrgId
      }
    }
  );
  assert.equal(secondaryResponse.status, 200);
  const secondaryPayload = (await secondaryResponse.json()) as Array<{
    id: string;
  }>;
  assert.ok(secondaryPayload.length > 0);
  assert.notEqual(primaryPayload[0].id, secondaryPayload[0].id);
  server.close();
});

test("GET /microtasks enforces org membership", async () => {
  const { server, baseUrl } = await startServer();
  const token = await loginUser(baseUrl, "test-microtasks-forbidden@example.com");
  const response = await fetch(`${baseUrl}/microtasks`, {
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

  const listResponse = await fetch(`${baseUrl}/microtasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Org-Id": primaryOrgId
    }
  });
  assert.equal(listResponse.status, 200);
  const listPayload = (await listResponse.json()) as Array<{
    id: string;
  }>;
  const microTaskId = listPayload[0].id;

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
