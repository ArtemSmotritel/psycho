import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Client } from '~/models/client'
import type { SessionFormValues } from './schema'

interface SessionClientSelectorProps {
    form: UseFormReturn<SessionFormValues>
    clients: Client[]
}

export function SessionClientSelector({ form, clients }: SessionClientSelectorProps) {
    const [clientOpen, setClientOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(searchValue.toLowerCase()),
    )

    return (
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
                                        ? clients.find((client) => client.id === field.value)?.name
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
                                    <CommandEmpty>No client found.</CommandEmpty>
                                    <CommandGroup>
                                        {filteredClients.map((client) => (
                                            <CommandItem
                                                key={client.id}
                                                value={client.name}
                                                onSelect={(_currentValue) => {
                                                    form.setValue('clientId', client.id)
                                                    setClientOpen(false)
                                                    setSearchValue('')
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        field.value === client.id
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
    )
}
