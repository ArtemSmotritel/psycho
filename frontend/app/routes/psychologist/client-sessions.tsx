import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router";
import { MessageSquare, Image as ImageIcon, Clock, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { fakeSessions } from "@/test-data/fakeSessions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import type { Session } from "~/models/session";
import { AttachmentIcon } from "~/utils/componentUtils";
import { getSessionName } from "~/utils/utils";

type ClientSessionsProps = {
  params: {
    clientId: string;
  };
};

type SessionCardProps = {
  session: Session;
  clientId: string;
};

type SessionsListProps = {
  title: string;
  sessions: Session[];
  clientId: string;
  oldestFirst: boolean;
};

const ITEMS_PER_PAGE = 4;

function SessionCard({ session, clientId }: SessionCardProps) {
  return (
    <Link 
      to={`/psychologist/clients/${clientId}/sessions/${session.id}`}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors max-w-lg">
        <CardHeader className="max-w-lg">
          <div className="flex sm:items-center sm:flex-row flex-col sm:justify-between items-start">
            <div className="flex items-center gap-2">
              {session.isFinished ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-yellow-500" />
              )}
              <CardTitle className="text-lg">
                {getSessionName(session)}
              </CardTitle>
            </div>
            {session.duration && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{session.duration} minutes</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {session.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {session.description}
              </p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground sm:flex-row flex-col">
              <div className="flex items-center gap-1">
                <AttachmentIcon size="h-4 w-4" type="note" />
                <span>{session.notesCount} notes</span>
              </div>
              <div className="flex items-center gap-1">
              <AttachmentIcon size="h-4 w-4" type="impression" />
                <span>{session.impressionsCount} impressions</span>
              </div>
              <div className="flex items-center gap-1">
              <AttachmentIcon size="h-4 w-4" type="recommendation" />
                <span>{session.recommendationsCount} recommendations</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SessionsList({ title, sessions, clientId, oldestFirst }: SessionsListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAscending, setIsAscending] = useState(oldestFirst);
  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  
  const sortedSessions = [...sessions].sort((a, b) => {
    return isAscending 
      ? a.date.getTime() - b.date.getTime()
      : b.date.getTime() - a.date.getTime();
  });
  
  const currentSessions = sortedSessions.slice(startIndex, endIndex);

  const handleOrderChange = (checked: boolean) => {
    setIsAscending(checked);
    setCurrentPage(0); // Reset to first page when changing order
  };

  return (
    <div className="w-[450px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-semibold">{title}</h4>
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
      <div className="space-y-4 min-h-[300px]">
        {currentSessions.map((session) => (
          <SessionCard key={session.id} session={session} clientId={clientId} />
        ))}
      </div>
    </div>
  );
}

export default function ClientSessions({ params }: ClientSessionsProps) {  
  const sessions = fakeSessions;
  const finishedSessions = sessions.filter(s => s.isFinished);
  const upcomingSessions = sessions.filter(s => !s.isFinished);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
      <SessionsList title="Finished Sessions" sessions={finishedSessions} clientId={params.clientId} oldestFirst={false} />
      <SessionsList title="Upcoming Sessions" sessions={upcomingSessions} clientId={params.clientId} oldestFirst={true} />
    </div>
  );
} 