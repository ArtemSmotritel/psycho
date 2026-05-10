import { toast } from 'sonner'
import { Phone, MessageSquare, Instagram, Mail, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { ClientForm } from '~/components/ClientForm'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'
import { ContactItem } from '~/components/common/ContactItem'
import { useResource } from '~/hooks/useResource'
import { clientService } from '~/services/client.service'
import type { Client } from '~/models/client'
import { NotFound } from '~/components/common/NotFound'

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
