import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppPageHeader } from "~/components/AppPageHeader";
import type { ColumnDef, ColumnFiltersState, SortingState, FilterFn } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { isToday } from "date-fns";
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
import { SessionForm } from "@/components/SessionForm";
import { DataTablePagination } from "@/components/DataTablePagination";
import { fakeSessions } from "@/test-data/fakeSessions";
import { getSessionName } from "~/utils/utils";
import type { Session } from "~/models/session";
import { ProtectedRoute } from "~/components/ProtectedRoute";

const todayFilterFn: FilterFn<Session> = (row, columnId) => {
  const date = row.getValue(columnId) as Date | null;
  return date ? isToday(date) : false;
};

const columns: ColumnDef<Session>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => {
      return row.index + 1;
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Start Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("date") as Date;
      return getSessionName({ date });
    },
    filterFn: todayFilterFn,
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as { id: string }[];
      return notes.length;
    },
  },
  {
    accessorKey: "recommendations",
    header: "Recommendations",
    cell: ({ row }) => {
      const recommendations = row.getValue("recommendations") as { id: string }[];
      return recommendations.length;
    },
  },
  {
    accessorKey: "impressions",
    header: "Impressions",
    cell: ({ row }) => {
      const impressions = row.getValue("impressions") as { id: string }[];
      return impressions.length;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const session = row.original;
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
            <DropdownMenuItem onClick={() => navigate(`/psychologist/clients/${session.clientId}/sessions/${session.id}`)}>
              View session details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/psychologist/clients/${session.clientId}`)}>
              View client profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function Sessions() {
  const [data] = useState<Session[]>(fakeSessions);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const handleAddSession = (values: any) => {
    console.log("Adding session:", values);
    // TODO: Implement actual session addition
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
      setColumnFilters([{ id: "date", value: true }]);
    } else {
      setColumnFilters([]);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['psychologist']}>
      <div className="container mx-auto p-4">
      <AppPageHeader text="Sessions" />

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showOnlyToday"
              checked={columnFilters.some(filter => filter.id === "date")}
              onCheckedChange={handleShowOnlyToday}
            />
            <label
              htmlFor="showOnlyToday"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show only sessions today
            </label>
          </div>
        </div>
        <SessionForm
          mode="add"
          trigger={<Button>Schedule Session</Button>}
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
                  No sessions found.
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
  );
} 