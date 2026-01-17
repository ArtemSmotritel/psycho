import { db } from 'config/db'

export const findClientById = async (id: any): Promise<object> => {
    const [client] = await db`SELECT * FROM clients WHERE id = ${id}`
    return client
}

export const findClients = async (params: any): Promise<object> => {
    const clients = await db`SELECT c.*, u.* from clients c
          INNER JOIN psychologist_clients pc ON pc.psycho_id = ${params.psychoId} AND pc.client_id = c.id
          INNER JOIN "user" u ON u.id = c.user_id`
    return clients
}

export const createClient = async (userId: string) => {
    const res = await db`INSERT INTO clients (user_id) VALUES (${userId})`
    return res
}

export const findClientByEmail = async (email: string): Promise<object> => {
    const [client] =
        await db`SELECT c.* FROM clients c INNER JOIN "user" u on u.id = c.user_id WHERE u.email = ${email}`
    return client
}
