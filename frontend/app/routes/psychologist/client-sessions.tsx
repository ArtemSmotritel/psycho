import { AppPageHeader } from "~/components/AppPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

type ClientSessionsProps = {
  params: {
    clientId: string;
  };
};

export default function ClientSessions({ params }: ClientSessionsProps) {
  const navigate = useNavigate();
  
  // This would be replaced with actual data fetching
  const sessions = [
    {
      id: "1",
      date: new Date(2024, 3, 18, 15, 0),
      duration: 60,
      notes: "Initial consultation and assessment",
    },
    {
      id: "2",
      date: new Date(2024, 3, 11, 15, 0),
      duration: 45,
      notes: "Follow-up session focusing on anxiety management",
    },
    {
      id: "3",
      date: new Date(2024, 3, 4, 15, 0),
      duration: 60,
      notes: "Progress review and new coping strategies",
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <AppPageHeader text="Session History" />
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{format(session.date, "PPP p")}</span>
                <span className="text-sm text-muted-foreground">
                  {session.duration} minutes
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 