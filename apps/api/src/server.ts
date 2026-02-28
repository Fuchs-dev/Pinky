import { createServer, IncomingMessage, ServerResponse } from "http";
import { z } from "zod";
import { createAccessToken, verifyAccessToken } from "./auth";
import {
  createUser,
  ensureSeedMicroTasksForUser,
  findMembership,
  getOrganizationById,
  getTaskById,
  getUserByEmail,
  getUserById,
  getMicroTaskById,
  listMembershipsForUser,
  listMicroTasksForOrganization,
  listTaskOffersForUser,
  seedUserMemberships,
  acceptTaskOffer,
  rejectTaskOffer,
  assignMicroTask,
  completeMicroTask,
  listMyMicroTasks,
  createTask,
  createMicroTask,
  getLeaderboard,
  joinQueue,
  leaveQueue,
  unassignTask,
  listMembershipsForOrganization,
  updateUserProfile,
  getUserCompletedTaskTimeThisMonth,
  getOrganizationAverageCompletedTimeThisMonth,
  ensureCalendarToken,
  getUserByCalendarToken,
  getAssignedMicroTasksForUserGlobally,
  parseDurationMinutes,
  checkQueueTimeouts
} from "./store";
import { generateMicroTasksFromPrompt } from "./ai";
import { appEvents } from "./events";

const sseConnections = new Map<string, Set<ServerResponse>>();

appEvents.on("pushNotification", ({ userId, event, payload }) => {
  const userConns = sseConnections.get(userId);
  if (userConns) {
    const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    userConns.forEach((res) => res.write(dataString));
  }
});

appEvents.on("pushNotificationRole", async ({ organizationId, role, event, payload }) => {
  const members = await listMembershipsForOrganization(organizationId);
  const targetUsers = members.filter(m => m.role === role);
  const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

  targetUsers.forEach(u => {
    const userConns = sseConnections.get(u.userId);
    if (userConns) {
      userConns.forEach(res => res.write(dataString));
    }
  });
});

setInterval(() => {
  checkQueueTimeouts().catch(console.error);
}, 60 * 1000);

const loginBodySchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).optional()
});

const updateProfileBodySchema = z.object({
  displayName: z.string().min(1).optional(),
  age: z.number().int().min(0).optional(),
  gender: z.enum(["female", "male", "diverse", "preferNotToSay"]).optional(),
  department: z.string().optional(),
  interests: z.string().optional(),
  qualifications: z.string().optional(),
  hasDriversLicense: z.boolean().optional(),
  helpContext: z.string().optional(),
  weeklyTimeBudgetMinutes: z.number().int().min(0).optional()
});

const orgHeaderSchema = z.string().uuid();
const microTaskIdSchema = z.string().uuid();
const taskIdSchema = z.string().uuid();

const createTaskBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional()
});

const splitTaskBodySchema = z.object({
  prompt: z.string().min(1)
});

const createMicroTaskBodySchema = z.object({
  title: z.string().min(1),
  description_how: z.string().optional(),
  impactReason: z.string().optional(),
  location: z.string().optional(),
  contactPerson: z.string().optional(),
  estimatedDuration: z.string().optional(),
  attachments: z.string().optional(),
  assignedUserId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
  rewardPoints: z.number().int().min(0).optional()
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-org-id",
};

const jsonResponse = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown
) => {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    ...corsHeaders
  });
  response.end(body);
};

const errorResponse = (
  response: ServerResponse,
  statusCode: number,
  message: string,
  code?: string
) => jsonResponse(response, statusCode, { message, code });

const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

const generateICS = (microTasks: any[]): string => {
  const events = microTasks.map((t) => {
    let dtstart = "";
    let dtend = "";
    if (t.dueAt) {
      const start = new Date(t.dueAt);
      const minutes = t.estimatedDuration ? parseDurationMinutes(t.estimatedDuration) : 60;
      const end = new Date(start.getTime() + (minutes || 60) * 60000);
      dtstart = `DTSTART:${formatICSDate(start)}\n`;
      dtend = `DTEND:${formatICSDate(end)}\n`;
    } else {
      const start = new Date();
      start.setHours(start.getHours() + 24);
      const end = new Date(start.getTime() + 60 * 60000);
      dtstart = `DTSTART:${formatICSDate(start)}\n`;
      dtend = `DTEND:${formatICSDate(end)}\n`;
    }

    const description = (t.descriptionHow || t.title).replace(/\n/g, "\\n");
    const locationStr = t.location ? `LOCATION:${t.location}\n` : "";

    return `BEGIN:VEVENT\nUID:${t.id}\nDTSTAMP:${formatICSDate(new Date())}\n${dtstart}${dtend}SUMMARY:${t.title}\nDESCRIPTION:${description}\n${locationStr}BEGIN:VALARM\nTRIGGER:-PT1H\nACTION:DISPLAY\nDESCRIPTION:Reminder\nEND:VALARM\nEND:VEVENT`;
  });

  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Pinky//DE\n${events.join("\n")}\nEND:VCALENDAR`;
};

const parseJsonBody = async (request: IncomingMessage) => {
  const chunks: any[] = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  const payload = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(payload);
};

const isPublicPath = (pathname: string) =>
  pathname === "/health" || pathname.startsWith("/auth/") || pathname.startsWith("/calendar/");

const isOrgGuardedPath = (pathname: string) =>
  !isPublicPath(pathname) &&
  pathname !== "/me" &&
  pathname !== "/me/profile" &&
  pathname !== "/me/memberships";

const extractBearerToken = (request: IncomingMessage) => {
  const header = request.headers.authorization;
  if (header) {
    const [type, token] = header.split(" ");
    if (type === "Bearer" && token) {
      return token;
    }
  }
  const url = new URL(request.url ?? "/", "http://localhost");
  const tokenQuery = url.searchParams.get("token");
  if (tokenQuery) {
    return tokenQuery;
  }
  return null;
};

const authenticateRequest = async (request: IncomingMessage) => {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }
  return await getUserById(payload.userId) ?? null;
};

const getOrgContext = async (request: IncomingMessage, userId: string) => {
  const header = request.headers["x-org-id"];
  if (typeof header !== "string") {
    return { error: "missing" as const };
  }
  const parsed = orgHeaderSchema.safeParse(header);
  if (!parsed.success) {
    return { error: "invalid" as const };
  }
  const membership = await findMembership(userId, parsed.data);
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
  let user = await getUserByEmail(email);
  if (!user) {
    user = await createUser(email, displayName);
  }
  await seedUserMemberships(user);
  await ensureSeedMicroTasksForUser(user.id);
  const accessToken = createAccessToken(user.id);
  return jsonResponse(response, 200, { accessToken });
};

const handleMe = async (response: ServerResponse, userId: string) => {
  const user = await getUserById(userId);
  if (!user) {
    return errorResponse(response, 404, "User not found", "USER_NOT_FOUND");
  }
  return jsonResponse(response, 200, {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    age: user.age,
    gender: user.gender,
    department: user.department,
    interests: user.interests,
    qualifications: user.qualifications,
    hasDriversLicense: user.hasDriversLicense,
    helpContext: user.helpContext,
    weeklyTimeBudgetMinutes: user.weeklyTimeBudgetMinutes,
    calendarFeedToken: await ensureCalendarToken(user.id)
  });
};

const handleUpdateProfile = async (request: IncomingMessage, response: ServerResponse, userId: string) => {
  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return errorResponse(response, 400, "Invalid JSON payload", "INVALID_JSON");
  }

  const parsed = updateProfileBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(response, 400, "Invalid profile payload", "INVALID_BODY");
  }

  try {
    const updated = await updateUserProfile(userId, parsed.data);
    return jsonResponse(response, 200, {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      age: updated.age,
      gender: updated.gender,
      department: updated.department,
      interests: updated.interests,
      qualifications: updated.qualifications,
      hasDriversLicense: updated.hasDriversLicense,
      helpContext: updated.helpContext,
      weeklyTimeBudgetMinutes: updated.weeklyTimeBudgetMinutes
    });
  } catch (err: any) {
    return errorResponse(response, 404, err.message, "NOT_FOUND");
  }
};

const handleMemberships = async (response: ServerResponse, userId: string) => {
  const rawMemberships = await listMembershipsForUser(userId);
  const memberships = await Promise.all(rawMemberships.map(async (membership) => {
    const organization = await getOrganizationById(membership.organizationId);
    return {
      organization: organization
        ? { id: organization.id, name: organization.name }
        : { id: membership.organizationId, name: "Unknown" },
      role: membership.role,
      strikeScore: membership.strikeScore
    };
  }));
  return jsonResponse(response, 200, memberships);
};

const handleMicroTaskFeed = async (
  response: ServerResponse,
  orgId: string,
  userId: string
) => {
  const allMicroTasks = await listMicroTasksForOrganization(orgId);
  const microTasks = allMicroTasks.filter(t => t.status === "OPEN" || t.status === "ASSIGNED");
  const offers = await listTaskOffersForUser(userId);
  const suggestedOffers = offers.filter((o) => o.status === "SUGGESTED");
  const offeredIds = new Set(suggestedOffers.map(o => o.microTaskId));

  const offered: any[] = [];
  const open: any[] = [];

  for (const microTask of microTasks) {
    const task = await getTaskById(microTask.taskId);
    const payload = {
      id: microTask.id,
      title: microTask.title,
      status: microTask.status,
      task: task ? { id: task.id, title: task.title } : null,
      timeframe: microTask.dueAt ?? null,
      location: microTask.location ?? null,
      rewardPoints: microTask.rewardPoints
    };

    if (offeredIds.has(microTask.id)) {
      offered.push(payload);
    } else {
      open.push(payload);
    }
  }

  return jsonResponse(response, 200, { offered, open });
};

const handleMicroTaskDetail = async (
  response: ServerResponse,
  orgId: string,
  microTaskId: string
) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) {
    return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");
  }
  const microTask = await getMicroTaskById(parsedId.data);
  if (!microTask || microTask.organizationId !== orgId) {
    return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
  }
  const task = await getTaskById(microTask.taskId);
  return jsonResponse(response, 200, {
    id: microTask.id,
    title: microTask.title,
    description_how: microTask.descriptionHow ?? null,
    location: microTask.location ?? null,
    contactPerson: microTask.contactPerson ?? null,
    estimatedDuration: microTask.estimatedDuration ?? null,
    attachments: microTask.attachments ?? null,
    impactReason: microTask.impactReason ?? null,
    rewardPoints: microTask.rewardPoints,
    status: microTask.status,
    task: task ? { id: task.id, title: task.title } : null,
    dueAt: microTask.dueAt ?? null,
    createdAt: microTask.createdAt
  });
};

const handleAcceptOffer = async (response: ServerResponse, orgId: string, userId: string, microTaskId: string) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");

  const microTask = await getMicroTaskById(parsedId.data);
  if (!microTask) return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
  if (microTask.organizationId !== orgId) return errorResponse(response, 404, "MicroTask not found in org", "NOT_FOUND");

  try {
    await acceptTaskOffer(microTask.id, userId);
    return jsonResponse(response, 200, {
      id: microTask.id,
      status: "ASSIGNED",
      assignedUserId: userId
    });
  } catch (error: any) {
    if (error.message.includes("not found")) return errorResponse(response, 404, error.message, "NOT_FOUND");
    return errorResponse(response, 409, error.message, "CONFLICT");
  }
};

const handleRejectOffer = async (response: ServerResponse, orgId: string, userId: string, microTaskId: string) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");

  const microTask = await getMicroTaskById(parsedId.data);
  if (!microTask) return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
  if (microTask.organizationId !== orgId) return errorResponse(response, 404, "MicroTask not found in org", "NOT_FOUND");

  try {
    const offer = await rejectTaskOffer(microTask.id, userId);
    return jsonResponse(response, 200, {
      id: microTask.id,
      offerStatus: offer.status
    });
  } catch (error: any) {
    if (error.message.includes("not found")) return errorResponse(response, 404, error.message, "NOT_FOUND");
    return errorResponse(response, 409, error.message, "CONFLICT");
  }
};

const handleAssignTask = async (response: ServerResponse, orgId: string, userId: string, microTaskId: string) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");

  const microTask = await getMicroTaskById(parsedId.data);
  if (!microTask) return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
  if (microTask.organizationId !== orgId) return errorResponse(response, 404, "MicroTask not found in org", "NOT_FOUND");

  try {
    const assignedTask = await assignMicroTask(microTask.id, userId);
    return jsonResponse(response, 200, {
      id: assignedTask.id,
      status: assignedTask.status,
      assignedUserId: assignedTask.assignedUserId
    });
  } catch (error: any) {
    if (error.message.includes("not found")) return errorResponse(response, 404, error.message, "NOT_FOUND");
    return errorResponse(response, 409, error.message, "CONFLICT");
  }
};

const handleCompleteTask = async (response: ServerResponse, orgId: string, userId: string, microTaskId: string) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");

  const microTask = await getMicroTaskById(parsedId.data);
  if (!microTask) return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
  if (microTask.organizationId !== orgId) return errorResponse(response, 404, "MicroTask not found in org", "NOT_FOUND");

  try {
    const completedTask = await completeMicroTask(microTask.id, userId);
    return jsonResponse(response, 200, {
      id: completedTask.id,
      status: completedTask.status
    });
  } catch (error: any) {
    if (error.message.includes("Not assigned to user")) return errorResponse(response, 403, error.message, "FORBIDDEN");
    if (error.message.includes("not found")) return errorResponse(response, 404, error.message, "NOT_FOUND");
    return errorResponse(response, 409, error.message, "CONFLICT");
  }
};

const handleJoinQueue = async (response: ServerResponse, orgId: string, userId: string, microTaskId: string) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");

  const microTask = await getMicroTaskById(parsedId.data);
  if (!microTask) return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
  if (microTask.organizationId !== orgId) return errorResponse(response, 404, "MicroTask not found in org", "NOT_FOUND");

  try {
    const intent = await joinQueue(microTask.id, userId);
    return jsonResponse(response, 200, intent);
  } catch (error: any) {
    if (error.message.includes("User already in queue")) return errorResponse(response, 409, error.message, "CONFLICT");
    return errorResponse(response, 400, error.message, "BAD_REQUEST");
  }
};

const handleLeaveQueue = async (response: ServerResponse, orgId: string, userId: string, microTaskId: string) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");

  try {
    await leaveQueue(parsedId.data, userId);
    return jsonResponse(response, 200, { status: "withdrawn" });
  } catch (error: any) {
    return errorResponse(response, 400, error.message, "BAD_REQUEST");
  }
};

const handleUnassignTask = async (response: ServerResponse, orgId: string, userId: string, microTaskId: string) => {
  const parsedId = microTaskIdSchema.safeParse(microTaskId);
  if (!parsedId.success) return errorResponse(response, 400, "Invalid microtask id", "INVALID_ID");

  const microTask = await getMicroTaskById(parsedId.data);
  if (!microTask) return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
  if (microTask.organizationId !== orgId) return errorResponse(response, 404, "MicroTask not found in org", "NOT_FOUND");

  try {
    const updatedTask = await unassignTask(microTask.id, userId);
    return jsonResponse(response, 200, {
      id: updatedTask.id,
      status: updatedTask.status,
      assignedUserId: updatedTask.assignedUserId
    });
  } catch (error: any) {
    if (error.message.includes("Not assigned to user")) return errorResponse(response, 403, error.message, "FORBIDDEN");
    return errorResponse(response, 409, error.message, "CONFLICT");
  }
};

const handleCreateTask = async (request: IncomingMessage, response: ServerResponse, orgId: string, role: string) => {
  if (role !== "ADMIN" && role !== "ORGANIZER") {
    return errorResponse(response, 403, "Insufficient permissions to create tasks", "FORBIDDEN_ROLE");
  }
  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return errorResponse(response, 400, "Invalid JSON payload", "INVALID_JSON");
  }
  const parsed = createTaskBodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(response, 400, "Invalid payload", "INVALID_BODY");

  const task = await createTask(orgId, parsed.data.title, parsed.data.description, parsed.data.category);
  return jsonResponse(response, 201, { id: task.id });
};

const handleSplitTask = async (request: IncomingMessage, response: ServerResponse, orgId: string, role: string) => {
  if (role !== "ADMIN" && role !== "ORGANIZER") {
    return errorResponse(response, 403, "Insufficient permissions to use AI splitting", "FORBIDDEN_ROLE");
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return errorResponse(response, 400, "Invalid JSON payload", "INVALID_JSON");
  }

  const parsed = splitTaskBodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(response, 400, "Invalid payload", "INVALID_BODY");

  try {
    const rawMembers = await listMembershipsForOrganization(orgId);
    const orgAvgTimeThisMonth = await getOrganizationAverageCompletedTimeThisMonth(orgId);

    // Anonymize/Pseudonymize data for the AI
    const anonymizedUsers = await Promise.all(rawMembers.map(async (m, i) => {
      const completedTimeThisMonth = await getUserCompletedTaskTimeThisMonth(m.userId, orgId);
      return {
        alias: `Person_${i + 1}`,
        role: m.role,
        weeklyTimeBudgetMinutes: m.weeklyTimeBudgetMinutes ?? 0,
        completedTimeThisMonth,
        originalId: m.userId
      };
    }));

    // Generate tasks via LLM
    const generatedTasks = await generateMicroTasksFromPrompt(parsed.data.prompt, anonymizedUsers, orgAvgTimeThisMonth);

    // Map aliases back to real IDs
    const mappedTasks = generatedTasks.map((t: any) => {
      const match = anonymizedUsers.find(u => u.alias === t.suggestedAssigneeAlias);
      return {
        title: t.title,
        description_how: t.description_how,
        location: t.location,
        estimatedDuration: t.estimatedDuration,
        rewardPoints: t.rewardPoints,
        impactReason: t.impactReason,
        suggestedAssigneeId: match ? match.originalId : null
      };
    });

    return jsonResponse(response, 200, { microTasks: mappedTasks });
  } catch (error: any) {
    console.error("AI Split Error:", error);
    return errorResponse(response, 500, "Failed to generate tasks", "AI_ERROR");
  }
};

const handleCreateMicroTask = async (request: IncomingMessage, response: ServerResponse, orgId: string, role: string, taskId: string) => {
  if (role !== "ADMIN" && role !== "ORGANIZER") {
    return errorResponse(response, 403, "Insufficient permissions to create microtasks", "FORBIDDEN_ROLE");
  }
  const parsedTaskId = taskIdSchema.safeParse(taskId);
  if (!parsedTaskId.success) return errorResponse(response, 400, "Invalid task id", "INVALID_ID");

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return errorResponse(response, 400, "Invalid JSON payload", "INVALID_JSON");
  }
  const parsed = createMicroTaskBodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(response, 400, "Invalid payload", "INVALID_BODY");

  try {
    const microTask = await createMicroTask({
      organizationId: orgId,
      taskId: parsedTaskId.data,
      ...parsed.data
    });
    return jsonResponse(response, 201, { id: microTask.id });
  } catch (error: any) {
    if (error.message.includes("not found")) return errorResponse(response, 404, error.message, "NOT_FOUND");
    return errorResponse(response, 400, error.message, "BAD_REQUEST");
  }
};

const handleMyMicroTasks = async (response: ServerResponse, orgId: string, userId: string) => {
  const myTasks = await listMyMicroTasks(orgId, userId);
  const payload = await Promise.all(myTasks.map(async (microTask) => {
    const task = await getTaskById(microTask.taskId);
    return {
      id: microTask.id,
      title: microTask.title,
      status: microTask.status,
      task: task ? { id: task.id, title: task.title } : null,
      timeframe: microTask.dueAt ?? null,
      location: microTask.location ?? null,
      rewardPoints: microTask.rewardPoints
    };
  }));
  return jsonResponse(response, 200, payload);
};

const handleLeaderboard = async (response: ServerResponse, orgId: string) => {
  const leaderboard = await getLeaderboard(orgId);
  return jsonResponse(response, 200, leaderboard);
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
    try {
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", "http://localhost");
      const pathname = url.pathname;

      if (method === "OPTIONS") {
        response.writeHead(204, corsHeaders);
        response.end();
        return;
      }

      if (method === "GET" && pathname === "/health") {
        return jsonResponse(response, 200, { status: "ok" });
      }

      if (method === "POST" && pathname === "/auth/login") {
        return await handleLogin(request, response);
      }

      if (method === "GET" && pathname.startsWith("/calendar/") && pathname.endsWith(".ics")) {
        const token = pathname.replace("/calendar/", "").replace(".ics", "");
        const user = await getUserByCalendarToken(token);
        if (!user) {
          return errorResponse(response, 404, "Invalid calendar feed token", "NOT_FOUND");
        }
        const tasks = await getAssignedMicroTasksForUserGlobally(user.id);
        const icsContent = generateICS(tasks);
        response.writeHead(200, {
          "Content-Type": "text/calendar",
          "Content-Length": Buffer.byteLength(icsContent).toString(),
          ...corsHeaders
        });
        response.end(icsContent);
        return;
      }

      if (!isPublicPath(pathname)) {
        const user = await authenticateRequest(request);
        if (!user) {
          return errorResponse(response, 401, "Unauthorized", "UNAUTHORIZED");
        }

        if (isOrgGuardedPath(pathname)) {
          const orgContext = await getOrgContext(request, user.id);
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

          if (method === "GET" && pathname === "/org/leaderboard") {
            return await handleLeaderboard(
              response,
              orgContext.orgId
            );
          }

          if (method === "GET" && pathname === "/notifications/stream") {
            response.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              ...corsHeaders
            });
            response.write(`data: {"type": "connected"}\n\n`);

            let userConns = sseConnections.get(user.id);
            if (!userConns) {
              userConns = new Set();
              sseConnections.set(user.id, userConns);
            }
            userConns.add(response);

            request.on("close", () => {
              userConns.delete(response);
              if (userConns.size === 0) {
                sseConnections.delete(user.id);
              }
            });
            return;
          }

          if (method === "GET" && pathname === "/microtasks/feed") {
            return await handleMicroTaskFeed(
              response,
              orgContext.orgId,
              user.id
            );
          }

          if (method === "GET" && pathname === "/me/microtasks") {
            return await handleMyMicroTasks(
              response,
              orgContext.orgId,
              user.id
            );
          }

          if (method === "GET" && pathname.startsWith("/microtasks/") && pathname.endsWith("/download.ics")) {
            const parts = pathname.split("/");
            if (parts.length === 4) {
              const microTaskId = parts[2];
              const microTask = await getMicroTaskById(microTaskId);
              if (!microTask || microTask.organizationId !== orgContext.orgId) {
                return errorResponse(response, 404, "MicroTask not found", "NOT_FOUND");
              }
              const icsContent = generateICS([microTask]);
              response.writeHead(200, {
                "Content-Type": "text/calendar",
                "Content-Length": Buffer.byteLength(icsContent).toString(),
                ...corsHeaders
              });
              response.end(icsContent);
              return;
            }
          }

          if (method === "GET" && pathname.startsWith("/microtasks/")) {
            const microTaskId = pathname.replace("/microtasks/", "");
            return await handleMicroTaskDetail(response, orgContext.orgId, microTaskId);
          }

          if (method === "POST" && pathname === "/tasks") {
            return await handleCreateTask(request, response, orgContext.orgId, orgContext.role);
          }

          if (method === "POST" && pathname.startsWith("/tasks/") && pathname.endsWith("/microtasks")) {
            const parts = pathname.split("/");
            if (parts.length === 4) {
              const taskId = parts[2];
              return await handleCreateMicroTask(request, response, orgContext.orgId, orgContext.role, taskId);
            }
          }

          if (method === "POST" && pathname === "/ai/split-task") {
            return await handleSplitTask(request, response, orgContext.orgId, orgContext.role);
          }

          if (method === "POST" && pathname.startsWith("/microtasks/")) {
            const parts = pathname.split("/");
            if (parts.length === 5 && parts[3] === "offer" && parts[4] === "accept") {
              const microTaskId = parts[2];
              return await handleAcceptOffer(response, orgContext.orgId, user.id, microTaskId);
            }
            if (parts.length === 5 && parts[3] === "offer" && parts[4] === "reject") {
              const microTaskId = parts[2];
              return await handleRejectOffer(response, orgContext.orgId, user.id, microTaskId);
            }
            if (parts.length === 4 && parts[3] === "assign") {
              const microTaskId = parts[2];
              return await handleAssignTask(response, orgContext.orgId, user.id, microTaskId);
            }
            if (parts.length === 4 && parts[3] === "complete") {
              const microTaskId = parts[2];
              return await handleCompleteTask(response, orgContext.orgId, user.id, microTaskId);
            }
            if (parts.length === 4 && parts[3] === "unassign") {
              const microTaskId = parts[2];
              return await handleUnassignTask(response, orgContext.orgId, user.id, microTaskId);
            }
            if (parts.length === 5 && parts[3] === "queue" && parts[4] === "join") {
              const microTaskId = parts[2];
              return await handleJoinQueue(response, orgContext.orgId, user.id, microTaskId);
            }
            if (parts.length === 5 && parts[3] === "queue" && parts[4] === "leave") {
              const microTaskId = parts[2];
              return await handleLeaveQueue(response, orgContext.orgId, user.id, microTaskId);
            }
          }
        }

        if (method === "GET" && pathname === "/me") {
          return await handleMe(response, user.id);
        }

        if (method === "PUT" && pathname === "/me/profile") {
          return await handleUpdateProfile(request, response, user.id);
        }

        if (method === "GET" && pathname === "/me/memberships") {
          return await handleMemberships(response, user.id);
        }
      }

      return errorResponse(response, 404, "Not Found", "NOT_FOUND");
    } catch (err: any) {
      console.error(err);
      return errorResponse(response, 500, "Internal Server Error", "INTERNAL_ERROR");
    }
  });
