import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppPageHeader } from "~/components/AppPageHeader";

export default function Sessions() {
  return (
    <div className="container mx-auto p-4">
      <AppPageHeader text="Sessions" />
      <div className="flex justify-between items-center mb-4">
        <Button>Schedule Session</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Time</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Recommendations</TableHead>
                <TableHead>Impressions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Session rows will go here */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 