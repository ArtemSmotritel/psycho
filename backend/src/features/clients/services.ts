import type { SQL } from 'bun'
import { BadRequestError, NotFoundError } from 'errors/index'
import type { Client } from './models'
import { ClientsRepo } from './repo'

export const ClientsService = {
    async getById(id: string): Promise<Client> {
        const client = await ClientsRepo.findById(id)
        if (!client) throw new NotFoundError()
        return client
    },

    async listForPsycho(psychoId: string): Promise<Client[]> {
        return ClientsRepo.listForPsycho(psychoId)
    },

    async updateProfile(
        id: string,
        params: {
            name?: string
            username?: string | null
            phone?: string | null
            telegram?: string | null
            instagram?: string | null
        },
    ): Promise<Client> {
        await ClientsRepo.updateProfileFields(id, params)
        if (params.name !== undefined) {
            await ClientsRepo.updateUserName(id, params.name)
        }
        const client = await ClientsRepo.findById(id)
        if (!client) throw new NotFoundError()
        return client
    },

    async linkByEmailToPsycho(psychoId: string, email: string): Promise<Client> {
        const client = await ClientsRepo.findByEmail(email)
        if (!client) {
            throw new BadRequestError(
                'No account found for this email. Ask your client to register first.',
                'ClientNotFound',
            )
        }

        const alreadyLinked = await ClientsRepo.isLinkedToPsycho(client.id, psychoId)
        if (alreadyLinked) {
            throw new BadRequestError('This client is already in your list.', 'AlreadyLinked')
        }

        await ClientsRepo.linkClientToPsycho(client.id, psychoId)
        return client
    },

    async unlinkForPsycho(clientId: string, psychoId: string): Promise<void> {
        const link = await ClientsRepo.findActiveLink(clientId, psychoId)
        if (!link) throw new NotFoundError()
        await ClientsRepo.unlink(clientId, psychoId)
    },

    async createUserClient(userId: string): Promise<void> {
        await ClientsRepo.insertClientRow(userId)
    },

    async linkClientToPsycho(clientId: string, psychoId: string, executor?: SQL): Promise<void> {
        await ClientsRepo.linkClientToPsycho(clientId, psychoId, executor)
    },

    async unlinkClientFromPsycho(clientId: string, psychoId: string): Promise<void> {
        await ClientsRepo.unlink(clientId, psychoId)
    },
} as const
