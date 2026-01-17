import { db } from 'config/db'

export const findUserById = async (id: any): Promise<object> => {
    const [user] = await db`SELECT * FROM user WHERE id = ${id}`
    return user
}
