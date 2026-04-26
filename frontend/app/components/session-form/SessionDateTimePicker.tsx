import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { Control, FieldPath } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { SessionFormValues } from './schema'

interface SessionDateTimePickerProps {
    control: Control<SessionFormValues>
    name: Extract<FieldPath<SessionFormValues>, 'startTime' | 'endTime'>
    label: string
}

export function SessionDateTimePicker({ control, name, label }: SessionDateTimePickerProps) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>{label}</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={'outline'}
                                    className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground',
                                    )}
                                >
                                    {field.value ? (
                                        format(field.value, 'PPP HH:mm')
                                    ) : (
                                        <span>Pick a date and time</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <div className="flex flex-col space-y-4 p-4">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="time"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={field.value ? format(field.value, 'HH:mm') : ''}
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':')
                                            if (hours && minutes) {
                                                const newDate = new Date(field.value || new Date())
                                                newDate.setHours(parseInt(hours, 10))
                                                newDate.setMinutes(parseInt(minutes, 10))
                                                field.onChange(newDate)
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}
