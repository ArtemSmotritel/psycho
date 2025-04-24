import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Edit } from "lucide-react";
import { SessionForm } from "@/components/SessionForm";
import { useCurrentSession } from "~/hooks/useCurrentSession";

export default function Session() {
  const session = useCurrentSession();
  const isFutureSession = session?.date ? new Date(session.date) > new Date() : false;

  return (
    <>
      <div className="mb-8">
        <Card>
          <CardContent className="px-3">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium">Google Meet</h3>
                  {session?.googleMeetLink ? (
                    <a
                      href={session.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Join Meeting
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Google Meet link is absent
                    </p>
                  )}
                </div>
              </div>
              {isFutureSession && (
                <SessionForm
                  mode="edit"
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Session
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
            </div>
          </CardContent>
        </Card>
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
              <div className="flex justify-between items-center">
                <CardTitle>Notes</CardTitle>
                <Button>Add Note</Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Notes list will go here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recommendations</CardTitle>
                <Button>Add Recommendation</Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Recommendations list will go here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impressions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Client Impressions</CardTitle>
                <Button>Add Impression</Button>
              </div>
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