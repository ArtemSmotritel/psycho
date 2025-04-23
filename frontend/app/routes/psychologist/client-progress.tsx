import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, MessageSquare, Image as ImageIcon } from "lucide-react";

type ClientProgressProps = {
  params: {
    clientId: string;
  };
};

// Fake data for testing
const fakeProgressData = {
  sessions: [
    {
      id: "1",
      date: new Date(2024, 3, 1),
      notes: [
        { id: "1", text: "Initial assessment completed" },
        { id: "2", text: "Client shows interest in cognitive therapy" },
      ],
      impressions: [
        { id: "1", text: "Felt comfortable discussing personal issues" },
        { id: "2", text: "Expressed interest in continuing therapy" },
      ],
      recommendations: [
        { id: "1", text: "Practice mindfulness exercises daily" },
        { id: "2", text: "Keep a mood journal" },
      ],
    },
    {
      id: "2",
      date: new Date(2024, 3, 8),
      notes: [
        { id: "3", text: "Discussed childhood experiences" },
        { id: "4", text: "Identified patterns in behavior" },
      ],
      impressions: [
        { id: "3", text: "Showed improvement in self-awareness" },
        { id: "4", text: "More open to discussing difficult topics" },
      ],
      recommendations: [
        { id: "3", text: "Try progressive muscle relaxation" },
        { id: "4", text: "Read recommended book on cognitive therapy" },
      ],
    },
    {
      id: "3",
      date: new Date(2024, 3, 15),
      notes: [
        { id: "5", text: "Reviewed progress on recommendations" },
        { id: "6", text: "Introduced new coping strategies" },
      ],
      impressions: [
        { id: "5", text: "Implementing recommendations effectively" },
        { id: "6", text: "Showing signs of reduced anxiety" },
      ],
      recommendations: [
        { id: "5", text: "Continue with current exercises" },
        { id: "6", text: "Start exposure therapy exercises" },
      ],
    },
  ],
};

export default function ClientProgress({ params }: ClientProgressProps) {
  return (
    <>
      <h4 className="text-lg font-semibold mb-4">Client Progress</h4>
      <div className="mt-6 space-y-8">
        {fakeProgressData.sessions.map((session, index) => (
          <div key={session.id} className="relative">
            {/* Timeline line */}
            {index < fakeProgressData.sessions.length - 1 && (
              <div className="absolute left-4 top-8 h-full w-0.5 bg-border" />
            )}
            
            <div className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>

              <Card className="flex-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Session {index + 1}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {format(session.date, "PPP")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-medium">Notes</h3>
                    <ul className="space-y-1">
                      {session.notes.map((note) => (
                        <li key={note.id} className="flex items-start gap-2">
                          <MessageSquare className="mt-1 h-4 w-4 text-muted-foreground" />
                          <span>{note.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-medium">Impressions</h3>
                    <ul className="space-y-1">
                      {session.impressions.map((impression) => (
                        <li key={impression.id} className="flex items-start gap-2">
                          <ImageIcon className="mt-1 h-4 w-4 text-muted-foreground" />
                          <span>{impression.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-medium">Recommendations</h3>
                    <ul className="space-y-1">
                      {session.recommendations.map((recommendation) => (
                        <li key={recommendation.id} className="flex items-start gap-2">
                          <MessageSquare className="mt-1 h-4 w-4 text-muted-foreground" />
                          <span>{recommendation.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 