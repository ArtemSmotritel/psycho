import { db } from 'config/db'

export const findUserById = async (id: any): Promise<object> => {
    const [user] = await db`SELECT * FROM "user" WHERE id = ${id}`
    return user
}

export const setActiveRole = async (userId: string, role: 'psycho' | 'client') => {
    const [user] =
        await db`UPDATE "user" SET active_role = ${role} WHERE id = ${userId} RETURNING *`
    return user
}
