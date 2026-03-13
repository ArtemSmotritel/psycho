import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '~/contexts/auth-context'

export default function AuthCallback() {
    const { isLoading, isAuthenticated, setActiveRole } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoading) return

        if (!isAuthenticated) {
            navigate('/login')
            return
        }

        const intendedRole = sessionStorage.getItem('intended_role')
        sessionStorage.removeItem('intended_role')

        if (!intendedRole) {
            navigate('/login')
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
    }, [isLoading, isAuthenticated, navigate, setActiveRole])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Loading...</p>
        </div>
    )
}
