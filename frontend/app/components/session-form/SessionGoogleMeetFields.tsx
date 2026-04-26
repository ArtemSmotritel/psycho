import type { Control, FieldPath } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { SessionFormValues } from './schema'

interface GoogleMeetCheckboxProps {
    control: Control<SessionFormValues>
    name: Extract<FieldPath<SessionFormValues>, 'generateGoogleMeet' | 'rescheduleGoogleMeet'>
    label: string
    description: string
}

function GoogleMeetCheckbox({ control, name, label, description }: GoogleMeetCheckboxProps) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>{label}</FormLabel>
                        <FormDescription>{description}</FormDescription>
                    </div>
                </FormItem>
            )}
        />
    )
}

interface SessionGoogleMeetFieldsProps {
    control: Control<SessionFormValues>
    mode: 'add' | 'edit'
    hasExistingMeetLink: boolean
}

export function SessionGoogleMeetFields({
    control,
    mode,
    hasExistingMeetLink,
}: SessionGoogleMeetFieldsProps) {
    return (
        <>
            {mode === 'add' ? (
                <GoogleMeetCheckbox
                    control={control}
                    name="generateGoogleMeet"
                    label="Generate Google Meet link"
                    description="A meeting link will be automatically generated and sent to the client"
                />
            ) : hasExistingMeetLink ? (
                <GoogleMeetCheckbox
                    control={control}
                    name="rescheduleGoogleMeet"
                    label="Reschedule Google Meet to new times"
                    description="The existing Google Meet event will be updated to match the new appointment time."
                />
            ) : (
                <GoogleMeetCheckbox
                    control={control}
                    name="generateGoogleMeet"
                    label="Generate Google Meet link"
                    description="A new Google Meet link will be generated for the updated appointment time."
                />
            )}

            {mode === 'edit' && (
                <FormField
                    control={control}
                    name="googleMeetLink"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Google Meet Link (optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://meet.google.com/..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </>
    )
}
