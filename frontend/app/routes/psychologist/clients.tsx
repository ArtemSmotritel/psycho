import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppPageHeader } from "~/components/AppPageHeader";
import type { ColumnDef } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { format } from "date-fns";

type Client = {
  id: string;
  username: string;
  name: string;
  upcomingSession: Date | null;
  lastSession: Date | null;
  sessionsCount: number;
};

const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "upcomingSession",
    header: "Upcoming Session",
    cell: ({ row }) => {
      const date = row.getValue("upcomingSession") as Date | null;
      return date ? format(date, "PPP p") : "-";
    },
  },
  {
    accessorKey: "lastSession",
    header: "Last Session",
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
    upcomingSession: new Date(2024, 3, 25, 14, 30),
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
];

export default function Clients() {
  const [data] = useState<Client[]>(fakeClients);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="container mx-auto p-4">
      <AppPageHeader text="Clients" />
      
      <div className="flex justify-between items-center mb-4">
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