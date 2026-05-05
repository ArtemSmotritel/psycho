import { useAuth } from '~/contexts/auth-context'

export function useRoleGuard(allowedRoles: Array<'psycho' | 'client'>) {
    const { user, isAuthenticated, activeRole } = useAuth()

    const canAccess = isAuthenticated && !!activeRole && allowedRoles.includes(activeRole)

    return {
        canAccess,
        userRole: activeRole,
        activeRole,
        user,
    }
}
