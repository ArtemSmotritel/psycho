import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionAttachment() {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Attachment Details</CardTitle>
            <Button>Edit</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Name</h3>
              <p>Attachment Name</p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Description</h3>
              <p>Attachment description goes here...</p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Voice Recordings</h3>
              <div className="space-y-2">
                {/* Voice recordings list will go here */}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium">Images</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Image gallery will go here */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
} 