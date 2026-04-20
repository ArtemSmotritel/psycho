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
            href: '/psycho',
            availableTo: 'psychologist',
        },
        {
            title: 'Dashboard',
            icon: HomeIcon,
            href: '/client',
            availableTo: 'client',
        },
        {
            title: 'Clients',
            icon: UsersIcon,
            href: '/psycho/clients',
            availableTo: 'psychologist',
        },
        {
            title: 'Invitations',
            icon: MailIcon,
            href: '/psycho/invitations',
            availableTo: 'psychologist',
        },
        {
            title: 'Sessions',
            icon: CalendarIcon,
            href: '/psycho/appointments',
            availableTo: 'psychologist',
        },
        {
            title: 'Associative Images',
            icon: ImageIcon,
            href: '/psycho/associative-images',
            availableTo: 'psychologist',
        },
        {
            title: 'My Profile',
            icon: UserIcon,
            href: '/me',
            availableTo: 'client',
        },
        {
            title: 'Appointments',
            icon: CalendarIcon,
            href: '/client/appointments',
            availableTo: 'client',
        },
        {
            title: 'Progress',
            icon: ActivityIcon,
            href: '/client/progress',
            availableTo: 'client',
        },
    ]

    return allItems.filter((item) => item.availableTo === userRole)
}
