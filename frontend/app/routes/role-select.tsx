import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useAuth } from '~/contexts/auth-context'

export default function RoleSelect() {
    const { user, isLoading, activeRole, setActiveRole } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoading) return

        if (!user) {
            navigate('/login')
            return
        }

        if (activeRole === 'psycho') {
            navigate('/psycho/clients')
            return
        }

        if (activeRole === 'client') {
            navigate('/client')
            return
        }
    }, [isLoading, user, activeRole, navigate])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading...</p>
            </div>
        )
    }

    if (!user || activeRole !== null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Redirecting...</p>
            </div>
        )
    }

    async function handleSelectRole(role: 'psycho' | 'client') {
        await setActiveRole(role)
        if (role === 'psycho') {
            navigate('/psycho/clients')
        } else {
            navigate('/client')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-[480px] space-y-6">
                <h1 className="text-3xl font-bold text-center text-gray-900">
                    How will you use Helpsycho?
                </h1>
                <div className="grid grid-cols-2 gap-4">
                    <Card
                        className="cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition-colors"
                        onClick={() => handleSelectRole('psycho')}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg text-center">Psychologist</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 text-center">
                                Manage your clients and appointment calendar.
                            </p>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition-colors"
                        onClick={() => handleSelectRole('client')}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg text-center">Client</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 text-center">
                                View your appointments and connect with your psychologist.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
