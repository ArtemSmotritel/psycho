import { NotFoundError } from 'errors/index'
import type { User } from './models'
import { UsersRepo } from './repo'

export const UsersService = {
    async getById(id: string): Promise<User> {
        const user = await UsersRepo.findById(id)
        if (!user) throw new NotFoundError()
        return user
    },

    async setActiveRole(id: string, role: 'psycho' | 'client'): Promise<User> {
        const updated = await UsersRepo.updateActiveRole(id, role)
        if (!updated) throw new NotFoundError()
        return updated
    },
} as const
