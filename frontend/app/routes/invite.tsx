import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '~/contexts/auth-context'
import { invitationService } from '~/services/invitation.service'
import { auth } from '~/services/auth.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function InvitePage() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const { isLoading, isAuthenticated, setActiveRole } = useAuth()
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const [accepting, setAccepting] = useState(false)

    useEffect(() => {
        if (!token) {
            setError('Invalid invitation link. No token provided.')
            return
        }

        if (isLoading) return

        if (isAuthenticated) {
            // User is logged in — accept the invitation directly
            setAccepting(true)
            invitationService
                .accept(token)
                .then(() => setActiveRole('client'))
                .then(() => navigate('/client'))
                .catch((err: any) => {
                    const message =
                        err?.response?.data?.message ||
                        'Failed to accept invitation. Please try again.'
                    setError(message)
                    setAccepting(false)
                })
        } else {
            // User is not logged in — save token and redirect to Google OAuth
            sessionStorage.setItem('invitation_token', token)
            sessionStorage.setItem('intended_role', 'client')
            auth.signIn.social({
                provider: 'google',
                callbackURL: `${import.meta.env.VITE_FRONTEND_URL}/auth/callback`,
            })
        }
    }, [token, isLoading, isAuthenticated, setActiveRole, navigate])

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-[420px]">
                    <CardHeader>
                        <CardTitle>Invalid Link</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            This invitation link is invalid. Please ask your psychologist to send
                            you a new one.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-[420px]">
                    <CardHeader>
                        <CardTitle>Invitation Error</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <Button variant="outline" onClick={() => navigate('/login')}>
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">
                {accepting ? 'Accepting invitation...' : 'Redirecting to sign in...'}
            </p>
        </div>
    )
}
