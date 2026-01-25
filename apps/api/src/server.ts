import { createServer, IncomingMessage, ServerResponse } from "http";
import { z } from "zod";
import { createAccessToken, verifyAccessToken } from "./auth";
import {
  createUser,
  findMembership,
  getOrganizationById,
  getUserByEmail,
  getUserById,
  listMembershipsForUser,
  seedUserMemberships
} from "./store";

const loginBodySchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).optional()
});

const orgHeaderSchema = z.string().uuid();

const jsonResponse = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown
) => {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
};

const errorResponse = (
  response: ServerResponse,
  statusCode: number,
  message: string,
  code?: string
) => jsonResponse(response, statusCode, { message, code });

const parseJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  const payload = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(payload);
};

const isPublicPath = (pathname: string) =>
  pathname === "/health" || pathname.startsWith("/auth/");

const isOrgGuardedPath = (pathname: string) =>
  !isPublicPath(pathname) &&
  pathname !== "/me" &&
  pathname !== "/me/memberships";

const extractBearerToken = (request: IncomingMessage) => {
  const header = request.headers.authorization;
  if (!header) {
    return null;
  }
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }
  return token;
};

const authenticateRequest = (request: IncomingMessage) => {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }
  return getUserById(payload.userId) ?? null;
};

const getOrgContext = (request: IncomingMessage, userId: string) => {
  const header = request.headers["x-org-id"];
  if (typeof header !== "string") {
    return { error: "missing" as const };
  }
  const parsed = orgHeaderSchema.safeParse(header);
  if (!parsed.success) {
    return { error: "invalid" as const };
  }
  const membership = findMembership(userId, parsed.data);
  if (!membership || membership.status !== "ACTIVE") {
    return { error: "forbidden" as const };
  }
  return {
    orgId: parsed.data,
    role: membership.role
  };
};

const handleLogin = async (request: IncomingMessage, response: ServerResponse) => {
  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return errorResponse(response, 400, "Invalid JSON payload", "INVALID_JSON");
  }

  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(response, 400, "Invalid login payload", "INVALID_BODY");
  }

  const { email, displayName } = parsed.data;
  let user = getUserByEmail(email);
  if (!user) {
    user = createUser(email, displayName);
  }
  seedUserMemberships(user);
  const accessToken = createAccessToken(user.id);
  return jsonResponse(response, 200, { accessToken });
};

const handleMe = (response: ServerResponse, userId: string) => {
  const user = getUserById(userId);
  if (!user) {
    return errorResponse(response, 404, "User not found", "USER_NOT_FOUND");
  }
  return jsonResponse(response, 200, {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  });
};

const handleMemberships = (response: ServerResponse, userId: string) => {
  const memberships = listMembershipsForUser(userId).map((membership) => {
    const organization = getOrganizationById(membership.organizationId);
    return {
      organization: organization
        ? { id: organization.id, name: organization.name }
        : { id: membership.organizationId, name: "Unknown" },
      role: membership.role
    };
  });
  return jsonResponse(response, 200, memberships);
};

const handleOrgPing = (
  response: ServerResponse,
  orgId: string,
  role: string
) =>
  jsonResponse(response, 200, {
    status: "ok",
    organizationId: orgId,
    role
  });

export const createApiServer = () =>
  createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (method === "GET" && pathname === "/health") {
      return jsonResponse(response, 200, { status: "ok" });
    }

    if (method === "POST" && pathname === "/auth/login") {
      return handleLogin(request, response);
    }

    if (!isPublicPath(pathname)) {
      const user = authenticateRequest(request);
      if (!user) {
        return errorResponse(response, 401, "Unauthorized", "UNAUTHORIZED");
      }

      if (isOrgGuardedPath(pathname)) {
        const orgContext = getOrgContext(request, user.id);
        if (orgContext.error === "missing") {
          return errorResponse(
            response,
            400,
            "Missing X-Org-Id header",
            "MISSING_ORG_HEADER"
          );
        }
        if (orgContext.error === "invalid") {
          return errorResponse(
            response,
            400,
            "Invalid X-Org-Id header",
            "INVALID_ORG_HEADER"
          );
        }
        if (orgContext.error === "forbidden") {
          return errorResponse(
            response,
            403,
            "Forbidden",
            "FORBIDDEN"
          );
        }

        if (method === "GET" && pathname === "/org/ping") {
          return handleOrgPing(
            response,
            orgContext.orgId,
            orgContext.role
          );
        }
      }

      if (method === "GET" && pathname === "/me") {
        return handleMe(response, user.id);
      }

      if (method === "GET" && pathname === "/me/memberships") {
        return handleMemberships(response, user.id);
      }
    }

    return errorResponse(response, 404, "Not Found", "NOT_FOUND");
  });
