import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssociativeImages() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Associative Images</h1>
        <Button>Add Image</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Image cards will go here */}
        <Card>
          <CardHeader>
            <CardTitle>Image Name</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Image preview and controls will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 