import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "react-router";
import { MessageSquare, Image as ImageIcon, Clock, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { fakeSessions } from "@/test-data/fakeSessions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

type ClientSessionsProps = {
  params: {
    clientId: string;
  };
};

type SessionCardProps = {
  session: typeof fakeSessions[0];
};

type SessionsListProps = {
  title: string;
  sessions: typeof fakeSessions;
};

const ITEMS_PER_PAGE = 4;

function SessionCard({ session }: SessionCardProps) {
  return (
    <Link 
      to={`/psychologist/sessions/${session.id}`}
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
                {format(session.date, "PPP p")}
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
                <MessageSquare className="h-4 w-4" />
                <span>{session.notesCount} notes</span>
              </div>
              <div className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                <span>{session.impressionsCount} impressions</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{session.recommendationsCount} recommendations</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SessionsList({ title, sessions }: SessionsListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSessions = sessions.slice(startIndex, endIndex);

  return (
    <div className="w-[450px]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold">{title}</h4>
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
          <SessionCard key={session.id} session={session} />
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
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SessionsList title="Finished Sessions" sessions={finishedSessions} />
        <SessionsList title="Upcoming Sessions" sessions={upcomingSessions} />
      </div>
    </div>
  );
} 