import { auth } from 'utils/auth'
import { UsersRepo } from '../features/users/repo'

interface UserOverrides {
    id?: string
    email?: string
    name?: string
    activeRole?: 'psycho' | 'client'
}

// Creates a user via testUtils and saves to DB.
// The user_role_rows AFTER INSERT trigger inserts the matching clients + psychologists rows.
// If `activeRole` is provided, sets the user's active_role after creation; otherwise
// leaves it as the column default (NULL) so role-selection-flow tests can exercise the null state.
export async function insertTestUser(overrides: UserOverrides = {}) {
    const { activeRole, ...rest } = overrides
    const ctx = await auth.$context
    const user = (ctx as any).test.createUser(rest)
    await (ctx as any).test.saveUser(user)
    if (activeRole !== undefined) {
        await UsersRepo.updateActiveRole(user.id, activeRole)
    }
    return user
}

// Returns RequestInit with a real better-auth session cookie for the given userId.
export async function asUser(userId: string, init: RequestInit = {}): Promise<RequestInit> {
    const ctx = await auth.$context
    const authHeaders: Headers = await (ctx as any).test.getAuthHeaders({ userId })
    return {
        ...init,
        headers: {
            ...Object.fromEntries(authHeaders.entries()),
            ...(init.headers as Record<string, string>),
        },
    }
}
