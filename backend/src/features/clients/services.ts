import { db } from 'config/db'
import type { Client } from './models'

export const findClientById = async (id: any): Promise<object> => {
    const [client] = await db`SELECT * FROM clients WHERE id = ${id}`
    return client
}

export const findClients = async (params: any): Promise<Client[]> => {
    return await db`SELECT c.*, u.* from clients c
          INNER JOIN psychologist_clients pc ON pc.psycho_id = ${params.psychoId} AND pc.client_id = c.id
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

export const findClientByEmail = async (email: string): Promise<Client> => {
    const [client] =
        await db`SELECT c.* FROM clients c INNER JOIN "user" u on u.id = c.user_id WHERE u.email = ${email}`
    return client
}
