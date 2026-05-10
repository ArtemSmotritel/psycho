import { Outlet } from 'react-router'
import { SidebarProvider, SidebarInset } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/AppSidebar'
import { ProtectedRoute } from '~/components/common/ProtectedRoute'

interface RoleLayoutProps {
    role: 'client' | 'psycho'
}

export function RoleLayout({ role }: RoleLayoutProps) {
    return (
        <ProtectedRoute allowedRoles={[role]}>
            <SidebarProvider>
                <div className="flex h-screen w-full">
                    <AppSidebar />
                    <SidebarInset>
                        <Outlet />
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ProtectedRoute>
    )
}
