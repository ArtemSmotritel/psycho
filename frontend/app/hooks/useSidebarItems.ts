import { HomeIcon, UsersIcon, CalendarIcon, ImageIcon, UserIcon } from 'lucide-react'
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
            title: 'Clients',
            icon: UsersIcon,
            href: '/psycho/clients',
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
    ]

    return allItems.filter((item) => item.availableTo === userRole)
}
