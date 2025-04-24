import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { getSessionName } from "~/utils";
import type { Session, AttachmentType } from "~/models/session";

type ClientProgressProps = {
  params: {
    clientId: string;
  };
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
              {getSessionName(session)}
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
const fakeProgressData: { sessions: Session[] } = {
  sessions: [
    {
      id: "1",
      date: new Date(2024, 3, 1),
      clientId: "1",
      googleMeetLink: "https://meet.google.com/abc-def-ghi",
      notes: [
        { id: "1", name: "Initial Assessment", type: "note" as AttachmentType, text: "Initial assessment completed" },
        { id: "2", name: "Therapy Interest", type: "note" as AttachmentType, text: "Client shows interest in cognitive therapy" },
      ],
      impressions: [
        { id: "1", name: "First Impression", type: "impression" as AttachmentType, text: "Felt comfortable discussing personal issues" },
        { id: "2", name: "Therapy Interest", type: "impression" as AttachmentType, text: "Expressed interest in continuing therapy" },
      ],
      recommendations: [
        { id: "1", name: "Mindfulness Practice", type: "recommendation" as AttachmentType, text: "Practice mindfulness exercises daily" },
        { id: "2", name: "Mood Journal", type: "recommendation" as AttachmentType, text: "Keep a mood journal" },
      ],
      notesCount: 2,
      recommendationsCount: 2,
      impressionsCount: 2,
    },
    {
      id: "2",
      date: new Date(2024, 3, 8),
      clientId: "1",
      googleMeetLink: "https://meet.google.com/jkl-mno-pqr",
      notes: [
        { id: "3", name: "Childhood Discussion", type: "note" as AttachmentType, text: "Discussed childhood experiences" },
        { id: "4", name: "Behavior Patterns", type: "note" as AttachmentType, text: "Identified patterns in behavior" },
      ],
      impressions: [
        { id: "3", name: "Self-Awareness", type: "impression" as AttachmentType, text: "Showed improvement in self-awareness" },
        { id: "4", name: "Openness", type: "impression" as AttachmentType, text: "More open to discussing difficult topics" },
      ],
      recommendations: [
        { id: "3", name: "Muscle Relaxation", type: "recommendation" as AttachmentType, text: "Try progressive muscle relaxation" },
        { id: "4", name: "Reading Assignment", type: "recommendation" as AttachmentType, text: "Read recommended book on cognitive therapy" },
      ],
      notesCount: 2,
      recommendationsCount: 2,
      impressionsCount: 2,
    },
    {
      id: "3",
      date: new Date(2024, 3, 15),
      clientId: "1",
      googleMeetLink: "https://meet.google.com/stu-vwx-yz",
      notes: [
        { id: "5", name: "Progress Review", type: "note" as AttachmentType, text: "Reviewed progress on recommendations" },
        { id: "6", name: "New Strategies", type: "note" as AttachmentType, text: "Introduced new coping strategies" },
      ],
      impressions: [
        { id: "5", name: "Implementation", type: "impression" as AttachmentType, text: "Implementing recommendations effectively" },
        { id: "6", name: "Anxiety Reduction", type: "impression" as AttachmentType, text: "Showing signs of reduced anxiety" },
      ],
      recommendations: [
        { id: "5", name: "Continue Exercises", type: "recommendation" as AttachmentType, text: "Continue with current exercises" },
        { id: "6", name: "Exposure Therapy", type: "recommendation" as AttachmentType, text: "Start exposure therapy exercises" },
      ],
      notesCount: 2,
      recommendationsCount: 2,
      impressionsCount: 2,
    },
    {
      id: "4",
      date: new Date(2024, 3, 22),
      clientId: "1",
      googleMeetLink: "https://meet.google.com/123-456-789",
      notes: [
        { id: "7", name: "Progress Discussion", type: "note" as AttachmentType, text: "Discussed progress and future goals" },
        { id: "8", name: "Follow-up Setup", type: "note" as AttachmentType, text: "Set up a follow-up appointment" },
      ],
      impressions: [
        { id: "7", name: "Optimism", type: "impression" as AttachmentType, text: "Feeling optimistic about progress" },
        { id: "8", name: "Continuation", type: "impression" as AttachmentType, text: "Ready to continue therapy" },
      ],
      recommendations: [
        { id: "7", name: "Follow-up Session", type: "recommendation" as AttachmentType, text: "Schedule a follow-up session" },
        { id: "8", name: "Progress Review", type: "recommendation" as AttachmentType, text: "Review progress and adjust goals" },
      ],
      notesCount: 2,
      recommendationsCount: 2,
      impressionsCount: 2,
    },
    {
      id: "5",
      date: new Date(2024, 3, 29),
      clientId: "1",
      googleMeetLink: "https://meet.google.com/987-654-321",
      notes: [
        { id: "9", name: "Progress Discussion", type: "note" as AttachmentType, text: "Discussed progress and future goals" },
        { id: "10", name: "Follow-up Setup", type: "note" as AttachmentType, text: "Set up a follow-up appointment" },
      ],
      impressions: [
        { id: "9", name: "Optimism", type: "impression" as AttachmentType, text: "Feeling optimistic about progress" },
        { id: "10", name: "Continuation", type: "impression" as AttachmentType, text: "Ready to continue therapy" },
      ],
      recommendations: [
        { id: "9", name: "Follow-up Session", type: "recommendation" as AttachmentType, text: "Schedule a follow-up session" },
        { id: "10", name: "Progress Review", type: "recommendation" as AttachmentType, text: "Review progress and adjust goals" },
      ],
      notesCount: 2,
      recommendationsCount: 2,
      impressionsCount: 2,
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