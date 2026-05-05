import {
    HomeIcon,
    UsersIcon,
    CalendarIcon,
    ImageIcon,
    UserIcon,
    MailIcon,
    ActivityIcon,
} from 'lucide-react'
import { useRoleGuard } from './useRoleGuard'
import { routes } from '~/lib/routes'

export type SidebarItem = {
    title: string
    icon: typeof HomeIcon
    href: string
    availableTo: 'client' | 'psychologist'
}

export function useSidebarItems(): SidebarItem[] {
    const { userRole } = useRoleGuard(['client', 'psychologist'])

    const allItems: SidebarItem[] = [
        {
            title: 'Dashboard',
            icon: HomeIcon,
            href: routes.psycho.root,
            availableTo: 'psychologist',
        },
        {
            title: 'Dashboard',
            icon: HomeIcon,
            href: routes.client.root,
            availableTo: 'client',
        },
        {
            title: 'Clients',
            icon: UsersIcon,
            href: routes.psycho.clients,
            availableTo: 'psychologist',
        },
        {
            title: 'Invitations',
            icon: MailIcon,
            href: routes.psycho.invitations,
            availableTo: 'psychologist',
        },
        {
            title: 'Sessions',
            icon: CalendarIcon,
            href: routes.psycho.appointments,
            availableTo: 'psychologist',
        },
        {
            title: 'Associative Images',
            icon: ImageIcon,
            href: routes.psycho.associativeImages,
            availableTo: 'psychologist',
        },
        {
            title: 'My Profile',
            icon: UserIcon,
            href: routes.me,
            availableTo: 'client',
        },
        {
            title: 'Appointments',
            icon: CalendarIcon,
            href: routes.client.appointments,
            availableTo: 'client',
        },
        {
            title: 'Progress',
            icon: ActivityIcon,
            href: routes.client.progress,
            availableTo: 'client',
        },
    ]

    return allItems.filter((item) => item.availableTo === userRole)
}
