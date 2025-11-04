import { sql } from "bun";
import { db } from "config/db";
import type { SessionCreateInput, SessionEntity } from "models/session";

type DbRow = {
  id: string;
  client_id: string;
  scheduled_at: string;
  google_meet_link: string | null;
  description: string | null;
  duration_min: number | null;
  is_finished: boolean;
  notes_count: number;
  recommendations_count: number;
  impressions_count: number;
};

function mapRowToEntity(row: DbRow): SessionEntity {
  return {
    id: row.id,
    clientId: row.client_id,
    date: new Date(row.scheduled_at).toISOString(),
    googleMeetLink: row.google_meet_link ?? undefined,
    notes: [],
    recommendations: [],
    impressions: [],
    notesCount: Number(row.notes_count ?? 0),
    recommendationsCount: Number(row.recommendations_count ?? 0),
    impressionsCount: Number(row.impressions_count ?? 0),
    isFinished: Boolean(row.is_finished),
    duration: row.duration_min != null ? String(row.duration_min) : undefined,
    description: row.description ?? undefined,
  };
}

export async function createSession(input: SessionCreateInput): Promise<SessionEntity> {
  const dto = {
    client_id: input.clientId,
    scheduled_at: new Date(input.date),
    google_meet_link: input.googleMeetLink ?? null,
    description: input.description ?? null,
    duration_min: input.duration ?? null,
  };

  const [row] = await db`
    INSERT INTO "client-sessions" ${sql(dto)}
    RETURNING 
      id,
      client_id,
      scheduled_at,
      google_meet_link,
      description,
      duration_min,
      is_finished,
      notes_count,
      recommendations_count,
      impressions_count
  ` as unknown as DbRow[];

  if (!row) throw new Error("Failed to create session: no row returned");
  return mapRowToEntity(row);
}
