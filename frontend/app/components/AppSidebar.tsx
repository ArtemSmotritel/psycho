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
import { ConfirmAction } from '../components/ConfirmAction'
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
                                {hasActiveAppointment ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <SidebarMenuButton disabled>
                                                <ArrowLeftRight />
                                                <span>{otherRoleLabel}</span>
                                            </SidebarMenuButton>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            End your active appointment before switching roles.
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <ConfirmAction
                                        trigger={
                                            <SidebarMenuButton>
                                                <ArrowLeftRight />
                                                <span>{otherRoleLabel}</span>
                                            </SidebarMenuButton>
                                        }
                                        title={otherRoleLabel}
                                        description={`You will be switched to the ${otherRole} mode. You can switch back at any time.`}
                                        confirmText="Switch"
                                        onConfirm={handleRoleSwitch}
                                    />
                                )}
                            </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                            <ConfirmAction
                                trigger={
                                    <SidebarMenuButton className="text-destructive hover:text-destructive">
                                        <LogOut />
                                        <span>Log out</span>
                                    </SidebarMenuButton>
                                }
                                title="Log out"
                                description="Are you sure you want to log out?"
                                confirmText="Log out"
                                onConfirm={handleLogout}
                            />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            )}
        </Sidebar>
    )
}
