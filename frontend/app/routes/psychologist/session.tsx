import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Edit, User, Trash2, LogIn, ArrowRight } from "lucide-react";
import { SessionForm } from "@/components/SessionForm";
import { AttachmentForm } from "@/components/AttachmentForm";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ActionsSection, ActionItem } from "@/components/ActionsSection";
import { useCurrentSession } from "~/hooks/useCurrentSession";
import { Link } from "react-router";
import { type Attachment, type Session } from "~/models/session";
import { isSessionActive, isSessionMoreThanDayOld } from "~/utils";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { Button } from "~/components/ui/button";
import { AttachmentIcon } from "~/utils/componentUtils";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

interface AttachmentProps {
  attachment: Attachment;
  sessionId: string;
  clientId: string;
}

const Attachment = ({ attachment, sessionId, clientId }: AttachmentProps) => {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-5 w-full">
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
          <AttachmentIcon type={attachment.type} />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{attachment.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {attachment.type}
          </p>
        </div>
      </div>
      <Button variant="outline" asChild className="w-[200px]">
        <Link
          to={`/psychologist/clients/${clientId}/sessions/${sessionId}/attachment/${attachment.id}`}
        >
          <span>View {attachment.type}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
};

interface SessionTabContentProps {
  title: string;
  attachments: Attachment[];
  sessionId: string;
  clientId: string;
}

function SessionTabContent({ title, attachments, sessionId, clientId }: SessionTabContentProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col">
        <Separator />
        {attachments.map((attachment) => (
          <React.Fragment key={attachment.id}>
            <Attachment
              attachment={attachment}
              sessionId={sessionId}
              clientId={clientId}
            />
            <Separator />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

interface GoogleMeetLinkProps {
  session: Session;
  isMoreThanDayOld: boolean;
}

function GoogleMeetLink({ session, isMoreThanDayOld }: GoogleMeetLinkProps) {
  if (!session) {
    return null;
  }

  if (isMoreThanDayOld) {
    return (
      <p className="text-sm text-muted-foreground">
        Session is more than 1 day old
      </p>
    );
  }

  if (!session.googleMeetLink) {
    return (
      <p className="text-sm text-muted-foreground">
        Google Meet link is absent
      </p>
    );
  }
  
  return (
    <Link
      to={session.googleMeetLink}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary underline"
    >
      {session?.googleMeetLink}
    </Link>
  );
}

export default function Session() {
  const session = useCurrentSession();
  const isFutureSession = session?.date ? new Date(session.date) > new Date() : false;
  
  // Check if session is currently active (within 1 hour of start time)
  const isCurrentlyActive = session ? isSessionActive(session) : false;
  const isMoreThanDayOld = session?.date ? isSessionMoreThanDayOld(session.date) : false;
  const areJoinComponentsHighlighted = isCurrentlyActive && !!session?.googleMeetLink && !isMoreThanDayOld;

  const handleDeleteSession = () => {
    console.log("Deleting session:", session?.id);
    // TODO: Implement session deletion
  };

  if (!session) return null;

  return (
    <>
      <Alert className="mb-4">
        <Video className={areJoinComponentsHighlighted ? "text-green-600" : "text-primary"} />
        <AlertTitle>Google Meet</AlertTitle>
        <AlertDescription>
          <GoogleMeetLink 
              session={session} 
              isMoreThanDayOld={isMoreThanDayOld} 
            />
        </AlertDescription>
      </Alert>

      <ActionsSection title="Actions">
        <AttachmentForm
          type="note"
          trigger={
            <ActionItem
              icon={<AttachmentIcon type="note" />}
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
              icon={<AttachmentIcon type="recommendation" />}
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
              icon={<AttachmentIcon type="impression" />}
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
                icon={<Edit className="h-6" />}
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
            icon={<LogIn className="h-6" />}
            label="Join Session"
            variant={isCurrentlyActive ? "default" : "outline"}
            className={areJoinComponentsHighlighted ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            href={session.googleMeetLink}
            disabled={!areJoinComponentsHighlighted}
            subtext={isCurrentlyActive ? "Session is active" : isMoreThanDayOld ? "Session is more than 1 day old" : undefined}
          />
        )}

        <ActionItem
          icon={<User className="h-6" />}
          label="Visit Client Profile"
          to={`/psychologist/clients/${session?.clientId}`}
        />

        <ConfirmAction
          trigger={
            <ActionItem
              icon={<Trash2 className="h-6" />}
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

      <h2 className="text-lg font-semibold mb-2">Attachments</h2>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
          <TabsTrigger value="recommendations" className="flex-1">Recommendations</TabsTrigger>
          <TabsTrigger value="impressions" className="flex-1">Client Impressions</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="w-full">
          <SessionTabContent
            title="Notes"
            attachments={session.notes}
            sessionId={session.id}
            clientId={session.clientId}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="w-full">
          <SessionTabContent
            title="Recommendations"
            attachments={session.recommendations}
            sessionId={session.id}
            clientId={session.clientId}
          />
        </TabsContent>

        <TabsContent value="impressions" className="w-full">
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