import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { auth } from '~/services/auth.service'

export default function AuthCallback() {
    const { data: session, isPending } = auth.useSession()
    const navigate = useNavigate()

    useEffect(() => {
        if (isPending) return

        if (!session) {
            navigate('/login')
            return
        }

        const intendedRole = sessionStorage.getItem('intended_role')
        sessionStorage.removeItem('intended_role')

        if (!intendedRole) {
            navigate('/login')
            return
        }

        if (intendedRole === 'psycho') {
            navigate('/psycho')
        } else if (intendedRole === 'client') {
            navigate('/client')
        } else {
            navigate('/login')
        }
    }, [isPending, session, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Loading...</p>
        </div>
    )
}
