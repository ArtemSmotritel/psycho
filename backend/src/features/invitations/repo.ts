import type { SQL } from 'bun'
import { db } from 'config/db'
import type { Invitation } from './models'

const columns = `id, psychologist_id AS "psychologistId", invited_email AS "invitedEmail", token, status, created_at AS "createdAt"`

export const InvitationsRepo = {
    async findById(id: string): Promise<Invitation | null> {
        const [row] = await db`SELECT ${db.unsafe(columns)} FROM invitations WHERE id = ${id}`
        return (row as Invitation) ?? null
    },

    async findByToken(token: string): Promise<Invitation | null> {
        const [row] = await db`SELECT ${db.unsafe(columns)} FROM invitations WHERE token = ${token}`
        return (row as Invitation) ?? null
    },

    async findPendingByPsychoAndEmail(
        psychoId: string,
        normalizedEmail: string,
    ): Promise<Invitation | null> {
        const [row] = await db`
            SELECT ${db.unsafe(columns)}
            FROM invitations
            WHERE psychologist_id = ${psychoId}
              AND LOWER(invited_email) = ${normalizedEmail}
              AND status = 'pending'
        `
        return (row as Invitation) ?? null
    },

    async listPendingByPsycho(psychoId: string): Promise<Invitation[]> {
        const rows = await db`
            SELECT ${db.unsafe(columns)}
            FROM invitations
            WHERE psychologist_id = ${psychoId}
              AND status = 'pending'
            ORDER BY created_at DESC
        `
        return rows as Invitation[]
    },

    async insert(
        psychoId: string,
        normalizedEmail: string,
        executor: SQL = db,
    ): Promise<Invitation> {
        const [row] = await executor`
            INSERT INTO invitations (psychologist_id, invited_email)
            VALUES (${psychoId}, ${normalizedEmail})
            RETURNING ${db.unsafe(columns)}
        `
        return row as Invitation
    },

    async markAccepted(id: string, executor: SQL = db): Promise<void> {
        await executor`UPDATE invitations SET status = 'accepted' WHERE id = ${id}`
    },

    async deleteById(id: string): Promise<void> {
        await db`DELETE FROM invitations WHERE id = ${id}`
    },
} as const
