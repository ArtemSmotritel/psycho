import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientDashboard() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Client Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Next session details will go here */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Recent recommendations list will go here */}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Session history timeline will go here */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Impressions list will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 