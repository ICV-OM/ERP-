import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_CA_CERT: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  APP_ORIGIN: z.string().url(),
  COOKIE_SECURE: z.enum(["true", "false"]).default("true"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(8)
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_CA_CERT: process.env.DATABASE_CA_CERT,
  SESSION_SECRET: process.env.SESSION_SECRET,
  APP_ORIGIN: process.env.APP_ORIGIN,
  COOKIE_SECURE: process.env.COOKIE_SECURE ?? "true",
  SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS ?? "8"
});
