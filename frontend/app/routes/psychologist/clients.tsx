import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppPageHeader } from "~/components/AppPageHeader";

export default function Clients() {
  return (
    <div className="container mx-auto p-4">
      <AppPageHeader text="Clients" />

      <div className="flex justify-between items-center mb-4">
        <Button>Add Client</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Upcoming Session</TableHead>
                <TableHead>Last Session</TableHead>
                <TableHead>Sessions Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Client rows will go here */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 