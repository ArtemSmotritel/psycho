import { useAuth } from '~/contexts/auth-context'

export function useRoleGuard(allowedRoles: Array<'psychologist' | 'client'>) {
    const { user, isAuthenticated, activeRole } = useAuth()

    // Map activeRole ('psycho'/'client') to the UserRole values ('psychologist'/'client')
    const mappedRole: 'psychologist' | 'client' | null =
        activeRole === 'psycho' ? 'psychologist' : activeRole === 'client' ? 'client' : null

    const canAccess = isAuthenticated && !!mappedRole && allowedRoles.includes(mappedRole)

    return {
        canAccess,
        userRole: mappedRole,
        activeRole,
        user,
    }
}
