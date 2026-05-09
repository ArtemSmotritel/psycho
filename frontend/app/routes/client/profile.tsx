import { toast } from 'sonner'
import { Phone, MessageSquare, Instagram, Mail, Edit, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { ClientForm } from '~/components/ClientForm'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'
import { useResource } from '~/hooks/useResource'
import { clientService } from '~/services/client.service'
import type { Client } from '~/models/client'
import { Link } from 'react-router'
import { NotFound } from '~/components/common/NotFound'

interface ContactItemProps {
    icon: React.ReactNode
    label: string
    value?: string | null
    type?: 'telegram' | 'instagram' | 'phone'
}

function ContactItem({ icon, label, value, type }: ContactItemProps) {
    const displayValue = value || '-'

    const getLink = () => {
        if (!value) return null
        switch (type) {
            case 'telegram': {
                const username = value.startsWith('@') ? value.slice(1) : value
                return `https://t.me/${username}`
            }
            case 'instagram': {
                const username = value.startsWith('@') ? value.slice(1) : value
                return `https://instagram.com/${username}`
            }
            case 'phone':
                return `tel:${value.replace(/\s+/g, '')}`
            default:
                return null
        }
    }

    const link = getLink()

    const copyToClipboard = () => {
        if (!value) return
        navigator.clipboard.writeText(value)
        toast.success(`${label} copied to clipboard.`)
    }

    return (
        <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center space-x-2">
                {icon}
                <span className="font-medium">{label}:</span>
            </div>
            <div className="flex items-center space-x-1">
                {link ? (
                    <Link to={link} className="hover:underline">
                        {displayValue}
                    </Link>
                ) : (
                    <span>{displayValue}</span>
                )}
                {value && (
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}

export default function ClientProfile() {
    const {
        data: client,
        isLoading,
        error,
        refetch: fetchProfile,
    } = useResource<Client>(
        () => clientService.getMeForClient().then((res) => res.data.client),
        [],
        { errorMessage: 'Failed to load profile.' },
    )

    if (isLoading) {
        return (
            <PageContainer>
                <AppPageHeader text="My Profile" />
                <p>Loading profile...</p>
            </PageContainer>
        )
    }

    if (error || !client) {
        return (
            <PageContainer>
                <AppPageHeader text="My Profile" />
                <NotFound title={error ?? 'Profile not found.'} />
            </PageContainer>
        )
    }

    const handleEdit = async (values: any) => {
        try {
            await clientService.updateMeForClient(values)
            toast.success('Profile updated.')
            fetchProfile()
        } catch {
            toast.error('Failed to update profile. Please try again.')
        }
    }

    return (
        <PageContainer>
            <AppPageHeader text="My Profile" />
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Account</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="font-medium">Name:</span> {client.name}
                        </div>
                        <div>
                            <span className="font-medium">Email:</span> {client.email}
                        </div>
                        {client.username && (
                            <div>
                                <span className="font-medium">Username:</span> {client.username}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ContactItem
                            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                            label="Phone"
                            value={client.phone}
                            type="phone"
                        />
                        <ContactItem
                            icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                            label="Telegram"
                            value={client.telegram}
                            type="telegram"
                        />
                        <ContactItem
                            icon={<Instagram className="h-4 w-4 text-muted-foreground" />}
                            label="Instagram"
                            value={client.instagram}
                            type="instagram"
                        />
                        <ContactItem
                            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                            label="Email"
                            value={client.email}
                        />
                    </CardContent>
                </Card>
            </div>

            <ActionsSection title="Actions">
                <ClientForm
                    mode="edit"
                    trigger={
                        <ActionItem icon={<Edit className="h-6 w-6" />} label="Edit Profile" />
                    }
                    initialData={{
                        username: client.username ?? undefined,
                        name: client.name,
                        email: client.email,
                        phone: client.phone ?? undefined,
                        telegram: client.telegram ?? undefined,
                        instagram: client.instagram ?? undefined,
                    }}
                    onSubmit={handleEdit}
                />
            </ActionsSection>
        </PageContainer>
    )
}
