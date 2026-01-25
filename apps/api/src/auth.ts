import { createHmac } from "crypto";
import { z } from "zod";

const tokenPayloadSchema = z.object({
  userId: z.string().uuid(),
  exp: z.number()
});

type TokenPayload = z.infer<typeof tokenPayloadSchema>;

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const getSecret = () => process.env.AUTH_SECRET ?? "dev-secret";

const sign = (value: string) =>
  createHmac("sha256", getSecret()).update(value).digest("base64url");

export const createAccessToken = (userId: string): string => {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload: TokenPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS
  };
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${header}.${payloadEncoded}`);
  return `${header}.${payloadEncoded}.${signature}`;
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const expectedSignature = sign(`${header}.${payload}`);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    const parsed = tokenPayloadSchema.safeParse(decodedPayload);
    if (!parsed.success) {
      return null;
    }
    if (parsed.data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};
