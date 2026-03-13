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
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table'
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { useState, useEffect, useCallback } from 'react'
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
import { DataTablePagination } from '@/components/DataTablePagination'
import { AddClientByEmailDialog } from '@/components/AddClientByEmailDialog'
import { clientService } from '~/services/client.service'
import type { Client } from '~/models/client'
import { ProtectedRoute } from '~/components/ProtectedRoute'

const columns: ColumnDef<Client>[] = [
    {
        id: 'index',
        header: '#',
        cell: ({ row }) => {
            return row.index + 1
        },
    },
    {
        accessorKey: 'name',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
    },
    {
        accessorKey: 'email',
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
    },
    {
        accessorKey: 'upcomingAppointment',
        header: 'Upcoming Appointment',
        cell: ({ row }) => {
            const val = row.getValue('upcomingAppointment') as string | null | undefined
            return val ?? '-'
        },
    },
    {
        accessorKey: 'lastAppointment',
        header: 'Last Appointment',
        cell: ({ row }) => {
            const val = row.getValue('lastAppointment') as string | null | undefined
            return val ?? '-'
        },
    },
    {
        accessorKey: 'appointmentsCount',
        header: 'Appointments Count',
        cell: ({ row }) => {
            const val = row.getValue('appointmentsCount') as number | undefined
            return val ?? '-'
        },
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
            const client = row.original
            const navigate = useNavigate()

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
                            onClick={() => navigate(`/psycho/clients/${client.id}`)}
                        >
                            View client profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() =>
                                navigate(`/psycho/clients/${client.id}/appointments`)
                            }
                        >
                            View appointment history
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]

export default function Clients() {
    const [data, setData] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    const fetchClients = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await clientService.getList()
            setData(res.data.clients)
        } catch {
            setError('Failed to load clients. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchClients()
    }, [fetchClients])

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

    return (
        <ProtectedRoute allowedRoles={['psychologist']}>
            <div className="container mx-auto p-4">
                <AppPageHeader text="Clients" />

                <div className="flex justify-between items-center mb-4">
                    <div />
                    <AddClientByEmailDialog
                        onSuccess={fetchClients}
                        trigger={<Button>Add Client</Button>}
                    />
                </div>

                {error && (
                    <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Loading clients...
                    </div>
                ) : (
                    <>
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
                                                No clients found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="mt-4">
                            <DataTablePagination table={table} />
                        </div>
                    </>
                )}
            </div>
        </ProtectedRoute>
    )
}
