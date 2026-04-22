import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { useCurrentClient } from '~/hooks/useCurrentClient'
import { clientService } from '~/services/client.service'
import type { Client } from '~/models/client'
import {
    PingConflictDialog,
    PingConflictError,
    type PingConflict,
} from '@/components/PingConflictDialog'

const formSchema = z
    .object({
        startTime: z.date().refine((date) => {
            return date > new Date()
        }, 'Please select a future date and time'),
        endTime: z.date(),
        clientId: z.string().min(1, 'Please select a client'),
        generateGoogleMeet: z.boolean().default(true).optional(),
        rescheduleGoogleMeet: z.boolean().default(false).optional(),
        googleMeetLink: z.string().optional(),
        fromRequestId: z.string().optional(),
    })
    .refine((data) => data.endTime > data.startTime, {
        message: 'End time must be after start time',
        path: ['endTime'],
    })

type FormValues = z.infer<typeof formSchema>

export type SessionFormSubmit = (
    values: FormValues,
    options: { acknowledgePingConflict: boolean },
) => Promise<void> | void

interface SessionFormProps {
    mode: 'add' | 'edit'
    trigger: React.ReactNode
    initialData?: Partial<FormValues>
    onSubmit: SessionFormSubmit
    isLoading?: boolean
}

export function SessionForm({ mode, trigger, initialData, onSubmit, isLoading }: SessionFormProps) {
    const [open, setOpen] = useState(false)
    const [clientOpen, setClientOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [clients, setClients] = useState<Client[]>([])
    const [pingConflict, setPingConflict] = useState<PingConflict[] | null>(null)
    const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
    const currentClient = useCurrentClient()

    useEffect(() => {
        clientService
            .getList()
            .then((res) => {
                setClients(res.data.clients)
            })
            .catch(() => {
                setClients([])
            })
    }, [])

    const defaultStart = (() => {
        const d = new Date()
        d.setMinutes(0, 0, 0)
        d.setHours(d.getHours() + 1)
        return d
    })()
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            startTime: defaultStart,
            endTime: defaultEnd,
            clientId: currentClient?.id || '',
            generateGoogleMeet: true,
            ...initialData,
        },
    })

    async function runSubmit(values: FormValues, acknowledge: boolean) {
        try {
            await onSubmit(values, { acknowledgePingConflict: acknowledge })
            setOpen(false)
            setPingConflict(null)
            setPendingValues(null)
        } catch (err) {
            if (err instanceof PingConflictError) {
                setPingConflict(err.conflictingPings)
                setPendingValues(values)
                return
            }
            setOpen(false)
            setPingConflict(null)
            setPendingValues(null)
        }
    }

    function handleSubmit(values: FormValues) {
        void runSubmit(values, false)
    }

    function handlePingConflictConfirm() {
        if (!pendingValues) {
            setPingConflict(null)
            return
        }
        setPingConflict(null)
        void runSubmit(pendingValues, true)
    }

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(searchValue.toLowerCase()),
    )

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {mode === 'add' ? 'Schedule New Appointment' : 'Edit Appointment'}
                        </DialogTitle>
                        <DialogDescription>
                            {mode === 'add'
                                ? 'Schedule a new appointment with your client'
                                : 'Update appointment details'}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="startTime"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Start Time</FormLabel>
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
                                                            value={
                                                                field.value
                                                                    ? format(field.value, 'HH:mm')
                                                                    : ''
                                                            }
                                                            onChange={(e) => {
                                                                const [hours, minutes] =
                                                                    e.target.value.split(':')
                                                                if (hours && minutes) {
                                                                    const newDate = new Date(
                                                                        field.value || new Date(),
                                                                    )
                                                                    newDate.setHours(
                                                                        parseInt(hours, 10),
                                                                    )
                                                                    newDate.setMinutes(
                                                                        parseInt(minutes, 10),
                                                                    )
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

                            <FormField
                                control={form.control}
                                name="endTime"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>End Time</FormLabel>
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
                                                            value={
                                                                field.value
                                                                    ? format(field.value, 'HH:mm')
                                                                    : ''
                                                            }
                                                            onChange={(e) => {
                                                                const [hours, minutes] =
                                                                    e.target.value.split(':')
                                                                if (hours && minutes) {
                                                                    const newDate = new Date(
                                                                        field.value || new Date(),
                                                                    )
                                                                    newDate.setHours(
                                                                        parseInt(hours, 10),
                                                                    )
                                                                    newDate.setMinutes(
                                                                        parseInt(minutes, 10),
                                                                    )
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

                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Client</FormLabel>
                                        <Popover open={clientOpen} onOpenChange={setClientOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={clientOpen}
                                                        className={cn(
                                                            'w-full justify-between',
                                                            !field.value && 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {field.value
                                                            ? clients.find(
                                                                  (client) =>
                                                                      client.id === field.value,
                                                              )?.name
                                                            : 'Select client...'}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput
                                                        placeholder="Search client..."
                                                        value={searchValue}
                                                        onValueChange={setSearchValue}
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            No client found.
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredClients.map((client) => (
                                                                <CommandItem
                                                                    key={client.id}
                                                                    value={client.name}
                                                                    onSelect={(_currentValue) => {
                                                                        form.setValue(
                                                                            'clientId',
                                                                            client.id,
                                                                        )
                                                                        setClientOpen(false)
                                                                        setSearchValue('')
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 h-4 w-4',
                                                                            field.value ===
                                                                                client.id
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0',
                                                                        )}
                                                                    />
                                                                    {client.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {mode === 'add' ? (
                                <FormField
                                    control={form.control}
                                    name="generateGoogleMeet"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Generate Google Meet link</FormLabel>
                                                <FormDescription>
                                                    A meeting link will be automatically generated
                                                    and sent to the client
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            ) : initialData?.googleMeetLink ? (
                                <FormField
                                    control={form.control}
                                    name="rescheduleGoogleMeet"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Reschedule Google Meet to new times
                                                </FormLabel>
                                                <FormDescription>
                                                    The existing Google Meet event will be updated
                                                    to match the new appointment time.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="generateGoogleMeet"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Generate Google Meet link</FormLabel>
                                                <FormDescription>
                                                    A new Google Meet link will be generated for the
                                                    updated appointment time.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            )}

                            {mode === 'edit' && (
                                <FormField
                                    control={form.control}
                                    name="googleMeetLink"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Google Meet Link (optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="https://meet.google.com/..."
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="flex justify-end space-x-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading
                                        ? 'Saving…'
                                        : mode === 'add'
                                          ? 'Schedule Appointment'
                                          : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            <PingConflictDialog
                open={pingConflict !== null}
                onOpenChange={(next) => {
                    if (!next) {
                        setPingConflict(null)
                        setPendingValues(null)
                    }
                }}
                conflictingPings={pingConflict ?? []}
                onConfirm={handlePingConflictConfirm}
            />
        </>
    )
}
