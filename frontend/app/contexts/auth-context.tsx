import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '~/models/user'
import { auth } from '~/services/auth.service'
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
            return
        }

        setIsFetchingUser(true)
        userService
            .getMe()
            .then((res) => {
                const data = res.data
                setUser({
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    image: session.user.image ?? null,
                    activeRole: data.active_role,
                })
            })
            .catch(() => {
                setUser(null)
            })
            .finally(() => {
                setIsFetchingUser(false)
            })
    }, [isPending, session])

    const logout = async () => {
        await auth.signOut()
        setUser(null)
    }

    const setActiveRole = async (role: 'psycho' | 'client') => {
        const res = await userService.setActiveRole(role)
        const data = res.data
        setUser((prev) =>
            prev
                ? {
                      ...prev,
                      activeRole: data.active_role,
                  }
                : null,
        )
    }

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
