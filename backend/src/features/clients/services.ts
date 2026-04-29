import type { SQL } from 'bun'
import { BadRequestError, NotFoundError } from 'errors/index'
import type { Client, ClientProfileUpdate, ClientSummary } from './models'
import { ClientsRepo } from './repo'

export const ClientsService = {
    async getById(id: string): Promise<Client> {
        const client = await ClientsRepo.findById(id)
        if (!client) throw new NotFoundError()
        return client
    },

    async listForPsycho(psychoId: string): Promise<ClientSummary[]> {
        return ClientsRepo.listForPsycho(psychoId)
    },

    async updateProfile(id: string, params: ClientProfileUpdate): Promise<Client> {
        const { name, ...contactFields } = params
        await ClientsRepo.updateProfileFields(id, contactFields)
        if (name !== undefined) {
            await ClientsRepo.updateUserName(id, name)
        }
        const client = await ClientsRepo.findById(id)
        if (!client) throw new NotFoundError()
        return client
    },

    async linkByEmailToPsycho(psychoId: string, email: string): Promise<ClientSummary> {
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

    async linkClientToPsycho(clientId: string, psychoId: string, executor?: SQL): Promise<void> {
        await ClientsRepo.linkClientToPsycho(clientId, psychoId, executor)
    },

    async unlinkClientFromPsycho(clientId: string, psychoId: string): Promise<void> {
        await ClientsRepo.unlink(clientId, psychoId)
    },
} as const
