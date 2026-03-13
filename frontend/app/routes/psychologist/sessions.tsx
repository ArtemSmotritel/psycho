import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { AppPageHeader } from '~/components/AppPageHeader'
import type { ColumnDef, ColumnFiltersState, SortingState, FilterFn } from '@tanstack/react-table'
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { isToday, formatISO, format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router'
import { SessionForm } from '@/components/SessionForm'
import { DataTablePagination } from '@/components/DataTablePagination'
import type { AppointmentWithClient } from '~/models/appointment'
import { ProtectedRoute } from '~/components/ProtectedRoute'
import { appointmentService } from '~/services/appointment.service'

export default function Sessions() {
    const navigate = useNavigate()

    const [data, setData] = useState<AppointmentWithClient[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    const [isCreating, setIsCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const fetchAppointments = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await appointmentService.getAllForPsycho()
            setData(res.data.appointments)
        } catch {
            setError('Failed to load appointments. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAppointments()
    }, [])

    const todayFilterFn: FilterFn<AppointmentWithClient> = (row, columnId) => {
        const value = row.getValue(columnId) as string
        return isToday(new Date(value))
    }

    const columns: ColumnDef<AppointmentWithClient>[] = [
        {
            id: 'index',
            header: '#',
            cell: ({ row }) => {
                return row.index + 1
            },
        },
        {
            accessorKey: 'startTime',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Start Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const startTime = row.getValue('startTime') as string
                return format(new Date(startTime), 'PPP HH:mm')
            },
            filterFn: todayFilterFn,
        },
        {
            accessorKey: 'endTime',
            header: 'End Time',
            cell: ({ row }) => {
                const endTime = row.getValue('endTime') as string
                return format(new Date(endTime), 'HH:mm')
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
        },
        {
            accessorKey: 'clientName',
            header: 'Client',
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const appointment = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() =>
                                    navigate(
                                        `/psycho/clients/${appointment.clientId}/appointments/${appointment.id}`,
                                    )
                                }
                            >
                                View appointment details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => navigate(`/psycho/clients/${appointment.clientId}`)}
                            >
                                View client profile
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const handleAddSession = async (values: any) => {
        if (!values.clientId) return
        setIsCreating(true)
        setCreateError(null)
        try {
            await appointmentService.create(values.clientId, {
                startTime: formatISO(values.startTime),
                endTime: formatISO(values.endTime),
                generateGoogleMeet: values.generateGoogleMeet ?? false,
            })
            await fetchAppointments()
        } catch {
            setCreateError('Failed to schedule appointment. Please try again.')
        } finally {
            setIsCreating(false)
        }
    }

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        state: {
            sorting,
            columnFilters,
        },
    })

    const handleShowOnlyToday = (checked: boolean) => {
        if (checked) {
            setColumnFilters([{ id: 'startTime', value: true }])
        } else {
            setColumnFilters([])
        }
    }

    if (isLoading) {
        return <p className="text-muted-foreground">Loading appointments...</p>
    }

    if (error) {
        return <p className="text-destructive">{error}</p>
    }

    return (
        <ProtectedRoute allowedRoles={['psychologist']}>
            <div className="container mx-auto p-4">
                <AppPageHeader text="Appointments" />

                {createError && <p className="text-sm text-destructive mb-2">{createError}</p>}

                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="showOnlyToday"
                                checked={columnFilters.some((filter) => filter.id === 'startTime')}
                                onCheckedChange={handleShowOnlyToday}
                            />
                            <label
                                htmlFor="showOnlyToday"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Show only appointments today
                            </label>
                        </div>
                    </div>
                    <SessionForm
                        mode="add"
                        trigger={
                            <Button disabled={isCreating}>
                                {isCreating ? 'Scheduling...' : 'Schedule Appointment'}
                            </Button>
                        }
                        onSubmit={handleAddSession}
                    />
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && 'selected'}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No appointments found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4">
                    <DataTablePagination table={table} />
                </div>
            </div>
        </ProtectedRoute>
    )
}
