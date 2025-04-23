import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppPageHeader } from "~/components/AppPageHeader";
import type { ColumnDef, ColumnFiltersState, SortingState, FilterFn } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { format, isToday } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown } from "lucide-react";

type Client = {
  id: string;
  username: string;
  name: string;
  upcomingSession: Date | null;
  lastSession: Date | null;
  sessionsCount: number;
};

const todayFilterFn: FilterFn<Client> = (row, columnId) => {
  const date = row.getValue(columnId) as Date | null;
  return date ? isToday(date) : false;
};

const columns: ColumnDef<Client>[] = [
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
];

// Fake data
const fakeClients: Client[] = [
  {
    id: "1",
    username: "john_doe",
    name: "John Doe",
    upcomingSession: new Date(), // Today
    lastSession: new Date(2024, 3, 18, 15, 0),
    sessionsCount: 5,
  },
  {
    id: "2",
    username: "jane_smith",
    name: "Jane Smith",
    upcomingSession: new Date(2024, 3, 26, 10, 0),
    lastSession: new Date(2024, 3, 19, 11, 0),
    sessionsCount: 3,
  },
  {
    id: "3",
    username: "bob_wilson",
    name: "Bob Wilson",
    upcomingSession: null,
    lastSession: new Date(2024, 3, 20, 16, 0),
    sessionsCount: 2,
  },
  {
    id: "4",
    username: "alice_johnson",
    name: "Alice Johnson",
    upcomingSession: new Date(2024, 3, 23, 12, 0),
    lastSession: new Date(2024, 3, 21, 14, 0),
    sessionsCount: 4,
  },
];

export default function Clients() {
  const [data] = useState<Client[]>(fakeClients);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
        <Button>Add Client</Button>
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
    </div>
  );
} 