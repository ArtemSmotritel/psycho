import { auth } from 'utils/auth'

interface UserOverrides {
    id?: string
    email?: string
    name?: string
}

// Creates a user via testUtils and saves to DB.
// databaseHooks.user.create.after fires automatically, inserting clients + psychologists rows.
export async function insertTestUser(overrides: UserOverrides = {}) {
    const ctx = await auth.$context
    const user = (ctx as any).test.createUser(overrides)
    await (ctx as any).test.saveUser(user)
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
