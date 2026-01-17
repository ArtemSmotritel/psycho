import { db } from 'config/db'

export const createPsycho = async (userId: string) => {
    const res = await db`INSERT INTO psychologists (user_id) VALUES (${userId})`
    return res
}
