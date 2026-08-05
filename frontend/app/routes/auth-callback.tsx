import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '~/contexts/auth-context'
import { invitationService } from '~/services/invitation.service'

export default function AuthCallback() {
    const { isLoading, isAuthenticated, activeRole, setActiveRole } = useAuth()
    const navigate = useNavigate()
    const handledRef = useRef(false)

    useEffect(() => {
        if (isLoading) return
        if (handledRef.current) return

        if (!isAuthenticated) {
            navigate('/login')
            return
        }

        const invitationToken = sessionStorage.getItem('invitation_token')
        if (invitationToken) {
            handledRef.current = true
            sessionStorage.removeItem('invitation_token')
            sessionStorage.removeItem('intended_role')
            invitationService
                .accept(invitationToken)
                .then(() => setActiveRole('client'))
                .then(() => navigate('/client'))
                .catch(() => navigate('/login'))
            return
        }

        const intendedRole = sessionStorage.getItem('intended_role') as 'psycho' | 'client' | null
        sessionStorage.removeItem('intended_role')

        if (intendedRole === 'psycho' || intendedRole === 'client') {
            handledRef.current = true
            setActiveRole(intendedRole)
                .then(() => navigate(intendedRole === 'psycho' ? '/psycho' : '/client'))
                .catch(() => navigate('/login'))
            return
        }

        handledRef.current = true
        if (activeRole === 'psycho') {
            navigate('/psycho')
        } else if (activeRole === 'client') {
            navigate('/client')
        } else {
            navigate('/role-select')
        }
    }, [isLoading, isAuthenticated, activeRole, navigate, setActiveRole])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Loading...</p>
        </div>
    )
}
