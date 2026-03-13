import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '~/contexts/auth-context'

export default function AuthCallback() {
    const { isLoading, isAuthenticated, activeRole, setActiveRole } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoading) return

        if (!isAuthenticated) {
            navigate('/login')
            return
        }

        if (activeRole === 'psycho') {
            navigate('/psycho')
        } else if (activeRole === 'client') {
            navigate('/client')
        } else {
            navigate('/login')
        }

        const intendedRole = sessionStorage.getItem('intended_role')
        sessionStorage.removeItem('intended_role')

        if (!intendedRole) {
            navigate('/role-select')
            return
        }

        setActiveRole(intendedRole as 'psycho' | 'client').then(() => {
            if (intendedRole === 'psycho') {
                navigate('/psycho')
            } else if (intendedRole === 'client') {
                navigate('/client')
            } else {
                navigate('/login')
            }
        })
    }, [isLoading, isAuthenticated, activeRole, navigate, setActiveRole])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Loading...</p>
        </div>
    )
}
