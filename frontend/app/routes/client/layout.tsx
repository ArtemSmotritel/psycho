import { Outlet } from 'react-router'
import { SidebarProvider, SidebarInset } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/AppSidebar'
import { ProtectedRoute } from '~/components/ProtectedRoute'

export default function ClientLayout() {
    return (
        <ProtectedRoute allowedRoles={['client']}>
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
