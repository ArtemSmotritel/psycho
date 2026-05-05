import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '~/contexts/auth-context'
import { routes } from '~/lib/routes'

interface ProtectedRouteProps {
    children: React.ReactNode
    allowedRoles?: Array<'psychologist' | 'client'>
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isLoading, isAuthenticated, activeRole } = useAuth()
    const location = useLocation()

    const mappedRole: 'psychologist' | 'client' | null =
        activeRole === 'psycho' ? 'psychologist' : activeRole === 'client' ? 'client' : null

    const isWrongRole =
        !isLoading &&
        isAuthenticated &&
        !!allowedRoles &&
        (!mappedRole || !allowedRoles.includes(mappedRole))

    useEffect(() => {
        if (isWrongRole) {
            const expected = allowedRoles![0]
            toast.warning(
                `This page is only accessible to ${expected}s. Change your role in the sidebar to access the page.`,
            )
        }
    }, [isWrongRole])

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (!isAuthenticated) {
        return <Navigate to={routes.login} state={{ from: location }} replace />
    }

    if (isWrongRole) {
        return <Navigate to={routes.login} replace />
    }

    return <>{children}</>
}
