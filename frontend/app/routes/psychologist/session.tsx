import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Edit, FileText, ThumbsUp, User, Trash2, LogIn } from "lucide-react";
import { SessionForm } from "@/components/SessionForm";
import { AttachmentForm } from "@/components/AttachmentForm";
import { ConfirmAction } from "@/components/ConfirmAction";
import { useCurrentSession } from "~/hooks/useCurrentSession";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

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

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <AttachmentForm
            type="note"
            trigger={
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <FileText className="h-6 w-6" />
                <span>Create Note</span>
              </Button>
            }
            onSubmit={(values) => {
              console.log("Creating note:", values);
              // TODO: Implement note creation
            }}
          />

          <AttachmentForm
            type="recommendation"
            trigger={
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <ThumbsUp className="h-6 w-6" />
                <span>Create Recommendation</span>
              </Button>
            }
            onSubmit={(values) => {
              console.log("Creating recommendation:", values);
              // TODO: Implement recommendation creation
            }}
          />

          <AttachmentForm
            type="impression"
            trigger={
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <User className="h-6 w-6" />
                <span>Create Impression</span>
              </Button>
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
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                >
                  <Edit className="h-6 w-6" />
                  <span>Edit Session</span>
                </Button>
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
            <Button
              disabled={!areJoinComponentsHighlighted}
              variant={isSessionActive ? "default" : "outline"}
              className={cn(
                "h-24 flex flex-col items-center justify-center gap-2",
                areJoinComponentsHighlighted && "bg-green-600 hover:bg-green-700 text-white"
              )}
              onClick={() => window.open(session.googleMeetLink, "_blank")}
            >
              <LogIn className="h-6 w-6" />
              <span>Join Session</span>
              {isSessionActive && (
                <span className="text-xs text-green-100">Session is active</span>
              )}
            </Button>
          )}

          <Link to={`/psychologist/clients/${session?.clientId}`}>
            <Button
              variant="outline"
              className="h-24 w-full flex flex-col items-center justify-center gap-2"
            >
              <User className="h-6 w-6" />
              <span>Visit Client Profile</span>
            </Button>
          </Link>

          <ConfirmAction
            trigger={
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-6 w-6" />
                <span>Delete Session</span>
              </Button>
            }
            title="Delete Session"
            description="Are you sure you want to delete this session? This action cannot be undone."
            confirmText="Delete"
            onConfirm={handleDeleteSession}
          />
        </div>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="impressions">Client Impressions</TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Notes list will go here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Recommendations list will go here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impressions">
          <Card>
            <CardHeader>
              <CardTitle>Client Impressions</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Impressions list will go here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
} 