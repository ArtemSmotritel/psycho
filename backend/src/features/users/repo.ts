import { db } from 'config/db'
import type { User } from './models'

const columns = `id, email, name, active_role AS "activeRole"`

export const UsersRepo = {
    async findById(id: string): Promise<User | null> {
        const [row] = await db`SELECT ${db.unsafe(columns)} FROM "user" WHERE id = ${id}`
        return (row as User) ?? null
    },

    async findIdByEmail(normalizedEmail: string): Promise<string | null> {
        const [row] = await db`SELECT id FROM "user" WHERE LOWER(email) = ${normalizedEmail}`
        return row?.id ?? null
    },

    async updateActiveRole(id: string, role: 'psycho' | 'client'): Promise<User | null> {
        const [row] = await db`
            UPDATE "user"
            SET active_role = ${role}
            WHERE id = ${id}
            RETURNING ${db.unsafe(columns)}
        `
        return (row as User) ?? null
    },
} as const
