import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppPageHeader } from "~/components/AppPageHeader";
import type { ColumnDef, ColumnFiltersState, SortingState, FilterFn } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { format, isToday } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router";
import { ClientForm } from "@/components/ClientForm";
import { DataTablePagination } from "@/components/DataTablePagination";
import { fakeClients, type Client } from "@/test-data/fakeClients";

const todayFilterFn: FilterFn<Client> = (row, columnId) => {
  const date = row.getValue(columnId) as Date | null;
  return date ? isToday(date) : false;
};

const columns: ColumnDef<Client>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => {
      return row.index + 1;
    },
  },
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "upcomingSession",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Upcoming Session
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("upcomingSession") as Date | null;
      return date ? format(date, "PPP p") : "-";
    },
    filterFn: todayFilterFn,
  },
  {
    accessorKey: "lastSession",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Session
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("lastSession") as Date | null;
      return date ? format(date, "PPP p") : "-";
    },
  },
  {
    accessorKey: "sessionsCount",
    header: "Sessions Count",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const client = row.original;
      const navigate = useNavigate();

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
            <DropdownMenuItem onClick={() => navigate(`/psychologist/clients/${client.id}`)}>
              View client profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/psychologist/clients/${client.id}/sessions`)}>
              View session history
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function Clients() {
  const [data] = useState<Client[]>(fakeClients);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const handleAddClient = (values: any) => {
    console.log("Adding client:", values);
    // TODO: Implement actual client addition
  };

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
  });

  const handleShowOnlyToday = (checked: boolean) => {
    if (checked) {
      setColumnFilters([{ id: "upcomingSession", value: true }]);
    } else {
      setColumnFilters([]);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <AppPageHeader text="Clients" />

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showOnlyToday"
              checked={columnFilters.some(filter => filter.id === "upcomingSession")}
              onCheckedChange={handleShowOnlyToday}
            />
            <label
              htmlFor="showOnlyToday"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show only clients with a session today
            </label>
          </div>
        </div>
        <ClientForm
          mode="add"
          trigger={<Button>Add Client</Button>}
          onSubmit={handleAddClient}
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
                        header.getContext()
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
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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
    </div>
  );
} 