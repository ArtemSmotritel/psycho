import type { SQL } from 'bun'
import { db } from 'config/db'
import type {
    Client,
    ClientContactFieldsUpdate,
    ClientSummary,
    PsychologistClientLink,
    PsychologistSummary,
} from './models'

const clientFullColumns = `
    c.user_id AS id,
    u.name,
    u.email,
    u.image,
    c.username,
    c.phone,
    c.telegram,
    c.instagram,
    u."createdAt" AS "registrationDate",
    (SELECT COUNT(*)::int FROM appointments WHERE client_id = c.user_id) AS "sessionsCount",
    (
        SELECT COUNT(*)::int
        FROM attachments a
        JOIN appointments ap ON ap.id = a.appointment_id
        WHERE ap.client_id = c.user_id AND a.type = 'impression'
    ) AS "impressionsCount",
    (
        SELECT COUNT(*)::int
        FROM attachments a
        JOIN appointments ap ON ap.id = a.appointment_id
        WHERE ap.client_id = c.user_id AND a.type = 'recommendation'
    ) AS "recommendationsCount",
    (
        SELECT json_build_object(
            'id', ap.id,
            'startTime', ap.start_time,
            'endTime', ap.end_time
        )
        FROM appointments ap
        WHERE ap.client_id = c.user_id
          AND ap.ended_at IS NOT NULL
        ORDER BY ap.start_time DESC
        LIMIT 1
    ) AS "lastAppointment",
    (
        SELECT json_build_object('id', ap.id, 'startTime', ap.start_time)
        FROM appointments ap
        WHERE ap.client_id = c.user_id
          AND ap.started_at IS NULL
          AND ap.start_time > NOW()
        ORDER BY ap.start_time ASC
        LIMIT 1
    ) AS "nextAppointment"
`

const clientBasicColumns = `c.user_id AS id, u.email, u.name, u.image`

export const ClientsRepo = {
    async findById(id: string): Promise<Client | null> {
        const [row] = await db`
            SELECT ${db.unsafe(clientFullColumns)}
            FROM clients c
            INNER JOIN "user" u ON u.id = c.user_id
            WHERE c.user_id = ${id}
        `
        return (row as Client) ?? null
    },

    async findByEmail(email: string): Promise<ClientSummary | null> {
        const [row] = await db`
            SELECT ${db.unsafe(clientBasicColumns)}
            FROM clients c
            INNER JOIN "user" u ON u.id = c.user_id
            WHERE u.email = ${email}
        `
        return (row as ClientSummary) ?? null
    },

    async listForPsycho(psychoId: string): Promise<ClientSummary[]> {
        const rows = await db`
            SELECT u.id, u.name, u.email, u.image
            FROM clients c
            INNER JOIN psychologist_clients pc
              ON pc.psycho_id = ${psychoId}
             AND pc.client_id = c.user_id
             AND pc.disconnected_at IS NULL
            INNER JOIN "user" u ON u.id = c.user_id
        `
        return rows as ClientSummary[]
    },

    async listPsychologistsForClient(clientId: string): Promise<PsychologistSummary[]> {
        const rows = await db`
            SELECT u.id, u.name, u.email, u.image
            FROM psychologist_clients pc
            INNER JOIN "user" u ON u.id = pc.psycho_id
            WHERE pc.client_id = ${clientId} AND pc.disconnected_at IS NULL
        `
        return rows as PsychologistSummary[]
    },

    async updateProfileFields(id: string, params: ClientContactFieldsUpdate): Promise<void> {
        await db`
            UPDATE clients
            SET
                username  = ${params.username !== undefined ? params.username : db.unsafe('username')},
                phone     = ${params.phone !== undefined ? params.phone : db.unsafe('phone')},
                telegram  = ${params.telegram !== undefined ? params.telegram : db.unsafe('telegram')},
                instagram = ${params.instagram !== undefined ? params.instagram : db.unsafe('instagram')}
            WHERE user_id = ${id}
        `
    },

    async updateUserName(id: string, name: string): Promise<void> {
        await db`UPDATE "user" SET name = ${name} WHERE id = ${id}`
    },

    async linkClientToPsycho(
        clientId: string,
        psychoId: string,
        executor: SQL = db,
    ): Promise<void> {
        await executor`
            INSERT INTO psychologist_clients (client_id, psycho_id, disconnected_at)
            VALUES (${clientId}, ${psychoId}, NULL)
            ON CONFLICT (client_id, psycho_id) DO UPDATE SET disconnected_at = NULL
        `
    },

    async findActiveLink(
        clientId: string,
        psychoId: string,
    ): Promise<PsychologistClientLink | null> {
        const [row] = await db`
            SELECT
                client_id        AS "clientId",
                psycho_id        AS "psychoId",
                disconnected_at  AS "disconnectedAt"
            FROM psychologist_clients
            WHERE client_id = ${clientId}
              AND psycho_id = ${psychoId}
              AND disconnected_at IS NULL
            LIMIT 1
        `
        return (row as PsychologistClientLink) ?? null
    },

    async isLinkedToPsycho(clientId: string, psychoId: string): Promise<boolean> {
        const [row] = await db`
            SELECT 1
            FROM psychologist_clients
            WHERE client_id = ${clientId}
              AND psycho_id = ${psychoId}
              AND disconnected_at IS NULL
        `
        return row !== undefined
    },

    async unlink(clientId: string, psychoId: string): Promise<void> {
        await db`
            UPDATE psychologist_clients
            SET disconnected_at = NOW()
            WHERE client_id = ${clientId}
              AND psycho_id = ${psychoId}
              AND disconnected_at IS NULL
        `
    },
} as const
