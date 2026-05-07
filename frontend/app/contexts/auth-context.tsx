import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { User } from '~/models/user'
import { auth } from '~/services/auth.service'
import { API_UNAUTHORIZED_EVENT, apiEvents, setApiRole } from '~/services/api'
import { userService } from '~/services/user.service'
import { logIfNotProd } from '~/utils/logger'

interface AuthContextType {
    user: User | null
    isLoading: boolean
    logout: () => Promise<void>
    isAuthenticated: boolean
    activeRole: 'psycho' | 'client' | null
    setActiveRole: (role: 'psycho' | 'client') => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = auth.useSession()
    const navigate = useNavigate()
    const [user, setUser] = useState<User | null>(null)
    const [isFetchingUser, setIsFetchingUser] = useState(false)
    const [authResolved, setAuthResolved] = useState(false)
    const userRef = useRef<User | null>(null)
    const handledUnauthorizedRef = useRef(false)

    useEffect(() => {
        userRef.current = user
        if (user) {
            handledUnauthorizedRef.current = false
        }
    }, [user])

    useEffect(() => {
        if (isPending) return

        if (!session) {
            setUser(null)
            setApiRole(null)
            setAuthResolved(true)
            return
        }

        setIsFetchingUser(true)
        userService
            .getMe()
            .then((res) => {
                const data = res.data
                const resolvedRole = data.active_role as 'psycho' | 'client' | null
                setApiRole(resolvedRole)
                setUser({
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    image: session.user.image ?? null,
                    activeRole: data.active_role,
                } as User)
            })
            .catch((err) => {
                logIfNotProd('[auth] getMe failed', err)
                setUser(null)
                setApiRole(null)
            })
            .finally(() => {
                setIsFetchingUser(false)
                setAuthResolved(true)
            })
    }, [isPending, session])

    useEffect(() => {
        const handleUnauthorized = () => {
            if (!userRef.current || handledUnauthorizedRef.current) return
            handledUnauthorizedRef.current = true
            auth.signOut().catch((err) => logIfNotProd('[auth] signOut failed', err))
            setUser(null)
            setApiRole(null)
            toast.error('Your session has expired. Please log in again.')
            navigate('/login')
        }
        apiEvents.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized)
        return () => apiEvents.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized)
    }, [navigate])

    const logout = useCallback(async () => {
        await auth.signOut()
        setUser(null)
        setApiRole(null)
    }, [])

    const setActiveRole = useCallback(async (role: 'psycho' | 'client') => {
        const res = await userService.setActiveRole(role)
        const data = res.data
        setApiRole(data.active_role as 'psycho' | 'client' | null)
        setUser((prev) =>
            prev
                ? {
                      ...prev,
                      activeRole: data.active_role,
                  }
                : null,
        )
    }, [])

    const isLoading = isPending || isFetchingUser || (!!session && !authResolved)
    const activeRole = user?.activeRole ?? null

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                logout,
                isAuthenticated: !!session,
                activeRole,
                setActiveRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
