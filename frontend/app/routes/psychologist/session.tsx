import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Session() {
  return (
    <>
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