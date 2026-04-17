import { db } from 'config/db'
import type { Client } from './models'

export const findClientById = async (id: string): Promise<Client | null> => {
    const [client] = await db`
        SELECT
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
                SELECT json_build_object('id', ap.id, 'startTime', ap.start_time)
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
        FROM clients c
        INNER JOIN "user" u ON u.id = c.user_id
        WHERE c.user_id = ${id}
    `
    return client ?? null
}

export const updateClient = async (
    id: string,
    params: {
        name?: string
        username?: string | null
        phone?: string | null
        telegram?: string | null
        instagram?: string | null
    },
): Promise<void> => {
    await db`
        UPDATE clients
        SET
            username  = ${params.username !== undefined ? params.username : db.unsafe('username')},
            phone     = ${params.phone !== undefined ? params.phone : db.unsafe('phone')},
            telegram  = ${params.telegram !== undefined ? params.telegram : db.unsafe('telegram')},
            instagram = ${params.instagram !== undefined ? params.instagram : db.unsafe('instagram')}
        WHERE user_id = ${id}
    `

    if (params.name !== undefined) {
        await db`UPDATE "user" SET name = ${params.name} WHERE id = ${id}`
    }
}

export const findClients = async (params: any): Promise<Client[]> => {
    return await db`SELECT u.id, u.name, u.email, u.image
          FROM clients c
          INNER JOIN psychologist_clients pc ON pc.psycho_id = ${params.psychoId} AND pc.client_id = c.user_id AND pc.disconnected_at IS NULL
          INNER JOIN "user" u ON u.id = c.user_id`
}

export const createUserClient = async (userId: string) => {
    const res = await db`INSERT INTO clients (user_id) VALUES (${userId})`
    return res
}

export const linkClientToPsycho = async (clientId: string, psychoId: string) => {
    return await db`INSERT INTO psychologist_clients (client_id, psycho_id) VALUES (${clientId}, ${psychoId})`
}

export const createClientForPsycho = async (psychoId: string) => {
    const res = await db`INSERT INTO clients (user_id) VALUES (${psychoId})`
    return res
}

export const findClientByEmail = async (email: string): Promise<Client | null> => {
    const [client] = await db`SELECT c.user_id AS id, u.email, u.name, u.image
          FROM clients c
          INNER JOIN "user" u ON u.id = c.user_id
          WHERE u.email = ${email}`
    return client ?? null
}

export const isClientLinkedToPsycho = async (
    clientId: string,
    psychoId: string,
): Promise<boolean> => {
    const [row] =
        await db`SELECT 1 FROM psychologist_clients WHERE client_id = ${clientId} AND psycho_id = ${psychoId} AND disconnected_at IS NULL`
    return row !== undefined
}

export const findClientPsychoRelationship = async (
    clientId: string,
    psychoId: string,
): Promise<Record<string, unknown> | undefined> => {
    const [row] =
        await db`SELECT * FROM psychologist_clients WHERE client_id = ${clientId} AND psycho_id = ${psychoId} AND disconnected_at IS NULL LIMIT 1`
    return row
}

export const unlinkClientFromPsycho = async (clientId: string, psychoId: string): Promise<void> => {
    await db`UPDATE psychologist_clients SET disconnected_at = NOW() WHERE client_id = ${clientId} AND psycho_id = ${psychoId} AND disconnected_at IS NULL`
}

export const findPsychologistsForClient = async (
    clientId: string,
): Promise<{ id: string; name: string; email: string; image: string | null }[]> => {
    return await db`
        SELECT u.id, u.name, u.email, u.image
        FROM psychologist_clients pc
        INNER JOIN "user" u ON u.id = pc.psycho_id
        WHERE pc.client_id = ${clientId} AND pc.disconnected_at IS NULL
    `
}
