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
    availableTo: 'client' | 'psycho'
}

export function useSidebarItems(): SidebarItem[] {
    const { userRole } = useRoleGuard(['client', 'psycho'])

    const allItems: SidebarItem[] = [
        {
            title: 'Dashboard',
            icon: HomeIcon,
            href: routes.psycho.root,
            availableTo: 'psycho',
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
            availableTo: 'psycho',
        },
        {
            title: 'Invitations',
            icon: MailIcon,
            href: routes.psycho.invitations,
            availableTo: 'psycho',
        },
        {
            title: 'Sessions',
            icon: CalendarIcon,
            href: routes.psycho.appointments,
            availableTo: 'psycho',
        },
        {
            title: 'Associative Images',
            icon: ImageIcon,
            href: routes.psycho.associativeImages,
            availableTo: 'psycho',
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
