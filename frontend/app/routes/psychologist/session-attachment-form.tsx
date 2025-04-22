import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SessionAttachmentForm() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Attachment</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <Input id="name" required />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <Textarea id="description" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Voice Recordings (max 3)
              </label>
              <div className="space-y-2">
                {/* Voice recorder component will go here */}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Images (max 9)
              </label>
              <div className="space-y-2">
                {/* Image upload component will go here */}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline">Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 