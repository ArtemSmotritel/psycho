import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '~/models/user'
import { auth } from '~/services/auth.service'
import { setApiRole } from '~/services/api'
import { userService } from '~/services/user.service'

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
    const [user, setUser] = useState<User | null>(null)
    const [isFetchingUser, setIsFetchingUser] = useState(false)

    useEffect(() => {
        if (isPending) return

        if (!session) {
            setUser(null)
            setApiRole(null)
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
            .catch(() => {
                setUser(null)
                setApiRole(null)
            })
            .finally(() => {
                setIsFetchingUser(false)
            })
    }, [isPending, session])

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

    const isLoading = isPending || isFetchingUser
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
