import { Link, useNavigate } from 'react-router'
import {
    Sidebar,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
} from '../components/ui/sidebar'
import { useSidebarItems } from '../hooks/useSidebarItems'
import { useAuth } from '../contexts/auth-context'
import { useHasActiveAppointment } from '../hooks/useHasActiveAppointment'
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip'
import { ArrowLeftRight, LogOut } from 'lucide-react'

export function AppSidebar() {
    const sidebarItems = useSidebarItems()
    const { activeRole, setActiveRole, isAuthenticated, logout } = useAuth()
    const { hasActiveAppointment } = useHasActiveAppointment()
    const navigate = useNavigate()

    const otherRole = activeRole === 'psycho' ? 'client' : 'psycho'
    const otherRoleLabel = activeRole === 'psycho' ? 'Switch to Client' : 'Switch to Psychologist'

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleRoleSwitch = async () => {
        if (hasActiveAppointment || !activeRole) return
        await setActiveRole(otherRole)
        if (otherRole === 'psycho') {
            navigate('/psycho')
        } else {
            navigate('/client')
        }
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarContent>
                <SidebarMenu>
                    {sidebarItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={item.href === location.pathname}>
                                <Link to={item.href}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            {isAuthenticated && (
                <SidebarFooter>
                    <SidebarMenu>
                        {activeRole && (
                            <SidebarMenuItem>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SidebarMenuButton
                                            disabled={hasActiveAppointment}
                                            onClick={handleRoleSwitch}
                                        >
                                            <ArrowLeftRight />
                                            <span>{otherRoleLabel}</span>
                                        </SidebarMenuButton>
                                    </TooltipTrigger>
                                    {hasActiveAppointment && (
                                        <TooltipContent>
                                            End your active appointment before switching roles.
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive">
                                <LogOut />
                                <span>Log out</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            )}
        </Sidebar>
    )
}
