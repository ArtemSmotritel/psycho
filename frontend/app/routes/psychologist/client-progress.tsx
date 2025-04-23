import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, MessageSquare, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

type ClientProgressProps = {
  params: {
    clientId: string;
  };
};

type Session = {
  id: string;
  date: Date;
  notes: Array<{ id: string; text: string }>;
  impressions: Array<{ id: string; text: string }>;
  recommendations: Array<{ id: string; text: string }>;
};

type SessionInTimelineProps = {
  session: Session;
  index: number;
  startIndex: number;
  clientId: string;
  isLastSession: boolean;
};

function SessionInTimeline({ session, index, startIndex, clientId, isLastSession }: SessionInTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLastSession && (
        <div className="absolute left-4 top-8 h-full w-0.5 bg-border" />
      )}

      <div className="relative flex gap-4">
        {/* Timeline dot */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Calendar className="h-4 w-4 text-primary-foreground" />
        </div>

        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Link
              to={`/psychologist/clients/${clientId}/sessions/${session.id}`}
              className="text-sm font-medium hover:underline"
            >
              Session {startIndex + index + 1}
            </Link>
            <div className="text-sm text-muted-foreground">
              {format(session.date, "PPP")}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium">Impressions</h3>
              <ul className="space-y-1">
                {session.impressions.map((impression) => (
                  <li key={impression.id} className="flex items-start gap-2">
                    <ImageIcon className="mt-1 h-4 w-4 text-muted-foreground" />
                    <Link
                      to={`/psychologist/clients/${clientId}/sessions/${session.id}/attachment/${impression.id}`}
                      className="hover:underline"
                    >
                      {impression.text}
                    </Link>
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
                    <Link
                      to={`/psychologist/clients/${clientId}/sessions/${session.id}/attachment/${recommendation.id}`}
                      className="hover:underline"
                    >
                      {recommendation.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
    {
      id: "4",
      date: new Date(2024, 3, 22),
      notes: [
        { id: "7", text: "Discussed progress and future goals" },
        { id: "8", text: "Set up a follow-up appointment" },
      ],
      impressions: [
        { id: "7", text: "Feeling optimistic about progress" },
        { id: "8", text: "Ready to continue therapy" },
      ],
      recommendations: [
        { id: "7", text: "Schedule a follow-up session" },
        { id: "8", text: "Review progress and adjust goals" },
      ],
    },
    {
      id: "5",
      date: new Date(2024, 3, 29),
      notes: [
        { id: "9", text: "Discussed progress and future goals" },
        { id: "10", text: "Set up a follow-up appointment" },
      ],
      impressions: [
        { id: "9", text: "Feeling optimistic about progress" },
        { id: "10", text: "Ready to continue therapy" },
      ],
      recommendations: [
        { id: "9", text: "Schedule a follow-up session" },
        { id: "10", text: "Review progress and adjust goals" },
      ],
    },
  ],
};

const ITEMS_PER_PAGE = 3;

export default function ClientProgress({ params }: ClientProgressProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAscending, setIsAscending] = useState(true);
  
  const sortedSessions = [...fakeProgressData.sessions].sort((a, b) => {
    return isAscending 
      ? a.date.getTime() - b.date.getTime()
      : b.date.getTime() - a.date.getTime();
  });

  const totalPages = Math.ceil(sortedSessions.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSessions = sortedSessions.slice(startIndex, endIndex);

  const handleOrderChange = (checked: boolean) => {
    setIsAscending(checked);
    setCurrentPage(0); // Reset to first page when changing order
  };

  return (
    <div className="w-[450px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Client Progress</h3>
          <div className="flex items-center gap-2">
            <Switch
              id="session-order"
              checked={isAscending}
              onCheckedChange={handleOrderChange}
            />
            <label htmlFor="session-order" className="text-sm text-muted-foreground">
              {isAscending ? "Oldest First" : "Newest First"}
            </label>
          </div>
        </div>
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink>
                {currentPage + 1} / {totalPages}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      <div className="mt-6 space-y-8">
        {currentSessions.map((session, index) => {
          const isLastSession = (index + 1 + ITEMS_PER_PAGE * currentPage) >= sortedSessions.length;
          return (
            <SessionInTimeline
              key={session.id}
              session={session}
              index={index}
              startIndex={startIndex}
              clientId={params.clientId}
              isLastSession={isLastSession}
            />
          );
        })}
      </div>
    </div>
  );
} 