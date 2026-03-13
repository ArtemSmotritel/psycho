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
import { Button } from '../components/ui/button'

export function AppSidebar() {
    const sidebarItems = useSidebarItems()
    const { activeRole, setActiveRole, isAuthenticated } = useAuth()
    const { hasActiveAppointment } = useHasActiveAppointment()
    const navigate = useNavigate()

    const otherRole = activeRole === 'psycho' ? 'client' : 'psycho'
    const otherRoleLabel = activeRole === 'psycho' ? 'Switch to Client' : 'Switch to Psychologist'
    const currentRoleLabel =
        activeRole === 'psycho' ? 'Psychologist' : activeRole === 'client' ? 'Client' : null

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
            {isAuthenticated && activeRole && (
                <SidebarFooter>
                    <div className="px-2 py-2">
                        {currentRoleLabel && (
                            <p className="text-xs text-muted-foreground mb-2">
                                Role: {currentRoleLabel}
                            </p>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="w-full">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        disabled={hasActiveAppointment}
                                        onClick={handleRoleSwitch}
                                    >
                                        {otherRoleLabel}
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            {hasActiveAppointment && (
                                <TooltipContent>
                                    End your active appointment before switching roles.
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                </SidebarFooter>
            )}
        </Sidebar>
    )
}
