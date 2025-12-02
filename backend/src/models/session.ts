import Elysia, { t } from "elysia";

// API input for creating a session
export const SessionCreateSchema = t.Object({
  clientId: t.String({ format: "uuid", error: "clientId must be a UUID" }),
  // ISO 8601 string; using string for transport, parsed to Date server-side
  date: t.String({ format: "date-time", error: "date must be an ISO date-time" }),
  googleMeetLink: t.Optional(
    t.String({ format: "uri", error: "googleMeetLink must be a valid URI" }),
  ),
  description: t.Optional(t.String({ maxLength: 2000 })),
  // minutes, stored as integer, surfaced as string to match FE type
  duration: t.Optional(t.Integer({ minimum: 1, maximum: 8 * 60 })),
});

// API entity returned to clients
export const SessionEntitySchema = t.Object({
  id: t.String({ format: "uuid" }),
  clientId: t.String({ format: "uuid" }),
  date: t.String({ format: "date-time" }),
  googleMeetLink: t.Optional(t.String({ format: "uri" })),
  notes: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      type: t.Union([
        t.Literal("note"),
        t.Literal("recommendation"),
        t.Literal("impression"),
      ]),
      text: t.Optional(t.String()),
      voiceFiles: t.Optional(t.Array(t.String())),
      imageFiles: t.Optional(t.Array(t.String())),
    }),
  ),
  recommendations: t.Array(
    t.Object({ id: t.String(), name: t.String(), type: t.Literal("recommendation") }),
  ),
  impressions: t.Array(
    t.Object({ id: t.String(), name: t.String(), type: t.Literal("impression") }),
  ),
  notesCount: t.Integer({ minimum: 0 }),
  recommendationsCount: t.Integer({ minimum: 0 }),
  impressionsCount: t.Integer({ minimum: 0 }),
  isFinished: t.Boolean(),
  duration: t.Optional(t.String()),
  description: t.Optional(t.String()),
});

// Register named models for reuse across routes
export const sessionModel = new Elysia({ name: "model:session" }).model({
  "session.create": SessionCreateSchema,
  "session.entity": SessionEntitySchema,
});

export type SessionCreateInput = typeof SessionCreateSchema.static;
export type SessionEntity = typeof SessionEntitySchema.static;
