import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Edit, FileText, ThumbsUp, User, Trash2, LogIn } from "lucide-react";
import { SessionForm } from "@/components/SessionForm";
import { AttachmentForm } from "@/components/AttachmentForm";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ActionsSection, ActionItem } from "@/components/ActionsSection";
import { useCurrentSession } from "~/hooks/useCurrentSession";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import type { Attachment } from "~/hooks/useCurrentSession";

interface AttachmentProps {
  attachment: Attachment;
  sessionId: string;
  clientId: string;
}

function Attachment({ attachment, sessionId, clientId }: AttachmentProps) {
  return (
    <Link
      to={`/psychologist/clients/${clientId}/sessions/${sessionId}/attachment/${attachment.id}`}
      className="block p-4 rounded-lg border hover:bg-accent/50 transition-colors"
    >
      <h3 className="font-medium">{attachment.name}</h3>
      {attachment.text && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {attachment.text}
        </p>
      )}
    </Link>
  );
}

interface SessionTabContentProps {
  title: string;
  attachments: Attachment[];
  sessionId: string;
  clientId: string;
}

function SessionTabContent({ title, attachments, sessionId, clientId }: SessionTabContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {attachments.map((attachment) => (
            <Attachment
              key={attachment.id}
              attachment={attachment}
              sessionId={sessionId}
              clientId={clientId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Session() {
  const session = useCurrentSession();
  const isFutureSession = session?.date ? new Date(session.date) > new Date() : false;
  
  // Check if session is currently active (within 1 hour of start time)
  const isSessionActive = session?.date ? (() => {
    const sessionStart = new Date(session.date);
    const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000); // 1 hour after start
    const now = new Date();
    return now >= sessionStart && now <= sessionEnd;
  })() : false;
  const areJoinComponentsHighlighted = isSessionActive && !!session?.googleMeetLink;

  const handleDeleteSession = () => {
    console.log("Deleting session:", session?.id);
    // TODO: Implement session deletion
  };

  if (!session) return null;

  return (
    <>
      <div className="mb-8">
        <Card>
          <CardContent className="px-3">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  areJoinComponentsHighlighted ? "bg-green-100" : "bg-primary/10"
                )}>
                  <Video className={cn(
                    "h-6 w-6",
                    areJoinComponentsHighlighted ? "text-green-600" : "text-primary"
                  )} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium">Google Meet</h3>
                  {session?.googleMeetLink ? (
                    <a
                      href={session.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                    >
                      {session.googleMeetLink}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Google Meet link is absent
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ActionsSection title="Actions">
        <AttachmentForm
          type="note"
          trigger={
            <ActionItem
              icon={<FileText className="h-6 w-6" />}
              label="Create Note"
            />
          }
          onSubmit={(values) => {
            console.log("Creating note:", values);
            // TODO: Implement note creation
          }}
        />

        <AttachmentForm
          type="recommendation"
          trigger={
            <ActionItem
              icon={<ThumbsUp className="h-6 w-6" />}
              label="Create Recommendation"
            />
          }
          onSubmit={(values) => {
            console.log("Creating recommendation:", values);
            // TODO: Implement recommendation creation
          }}
        />

        <AttachmentForm
          type="impression"
          trigger={
            <ActionItem
              icon={<User className="h-6 w-6" />}
              label="Create Impression"
            />
          }
          onSubmit={(values) => {
            console.log("Creating impression:", values);
            // TODO: Implement impression creation
          }}
        />

        {isFutureSession && (
          <SessionForm
            mode="edit"
            trigger={
              <ActionItem
                icon={<Edit className="h-6 w-6" />}
                label="Edit Session"
              />
            }
            initialData={{
              startTime: session?.date ? new Date(session.date) : undefined,
              clientId: session?.clientId,
            }}
            onSubmit={(values) => {
              console.log("Updating session:", values);
              // TODO: Implement session update
            }}
          />
        )}

        {session?.googleMeetLink && (
          <ActionItem
            icon={<LogIn className="h-6 w-6" />}
            label="Join Session"
            variant={isSessionActive ? "default" : "outline"}
            className={areJoinComponentsHighlighted ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            href={session.googleMeetLink}
            disabled={!areJoinComponentsHighlighted}
            subtext={isSessionActive ? "Session is active" : undefined}
          />
        )}

        <ActionItem
          icon={<User className="h-6 w-6" />}
          label="Visit Client Profile"
          to={`/psychologist/clients/${session?.clientId}`}
        />

        <ConfirmAction
          trigger={
            <ActionItem
              icon={<Trash2 className="h-6 w-6" />}
              label="Delete Session"
              variant="outline"
              className="text-destructive hover:text-destructive"
            />
          }
          title="Delete Session"
          description="Are you sure you want to delete this session? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDeleteSession}
        />
      </ActionsSection>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="impressions">Client Impressions</TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <SessionTabContent
            title="Notes"
            attachments={session.notes}
            sessionId={session.id}
            clientId={session.clientId}
          />
        </TabsContent>

        <TabsContent value="recommendations">
          <SessionTabContent
            title="Recommendations"
            attachments={session.recommendations}
            sessionId={session.id}
            clientId={session.clientId}
          />
        </TabsContent>

        <TabsContent value="impressions">
          <SessionTabContent
            title="Client Impressions"
            attachments={session.impressions}
            sessionId={session.id}
            clientId={session.clientId}
          />
        </TabsContent>
      </Tabs>
    </>
  );
} 