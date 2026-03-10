import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { auth } from '~/services/auth.service'

type Role = 'psycho' | 'client'

export default function LoginChoice() {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [isRedirecting, setIsRedirecting] = useState(false)

    async function handleContinue() {
        if (!selectedRole) return

        sessionStorage.setItem('intended_role', selectedRole)
        setIsRedirecting(true)

        if (selectedRole === 'psycho') {
            await auth.signIn.social({
                provider: 'google',
                callbackURL: '/auth/callback',
                scopes: ['https://www.googleapis.com/auth/calendar.events'],
            })
        } else {
            await auth.signIn.social({
                provider: 'google',
                callbackURL: '/auth/callback',
            })
        }
    }

    if (isRedirecting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-[480px] space-y-6">
                <h1 className="text-3xl font-bold text-center text-gray-900">
                    Sign in to Helpsycho
                </h1>

                <div className="grid grid-cols-2 gap-4">
                    <Card
                        className={`cursor-pointer border-2 transition-colors ${
                            selectedRole === 'psycho'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedRole('psycho')}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg text-center">
                                I&apos;m a Psychologist
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 text-center">
                                Access your client management dashboard and appointment calendar.
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        className={`cursor-pointer border-2 transition-colors ${
                            selectedRole === 'client'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedRole('client')}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg text-center">I&apos;m a Client</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 text-center">
                                View your appointments and connect with your psychologist.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Button
                    onClick={handleContinue}
                    disabled={!selectedRole}
                    className="w-full flex items-center justify-center space-x-2 text-base font-medium rounded-lg py-2.5 h-auto"
                >
                    Continue with Google
                </Button>
            </div>
        </div>
    )
}
