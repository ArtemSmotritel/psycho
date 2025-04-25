import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Mic, Image as ImageIcon, Trash2, FileText, ThumbsUp, User } from "lucide-react";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Link } from "react-router";
import { useCurrentAttachment } from "~/hooks/useCurrentAttachment";
import { AttachmentIcon } from "~/utils/componentUtils";

const getTypeLabel = (type: string) => {
  switch (type) {
    case "note":
      return "Note";
    case "recommendation":
      return "Recommendation";
    case "impression":
      return "Client Impression";
    default:
      return type;
  }
};

export default function SessionAttachment() {
  const attachment = useCurrentAttachment();

  const handleDeleteAttachment = () => {
    console.log("Deleting attachment:", attachment?.id);
    // TODO: Implement attachment deletion
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle>{attachment?.name}</CardTitle>
              {attachment?.type && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AttachmentIcon type={attachment.type} size="h-4 w-4" />
                  <span>{getTypeLabel(attachment.type)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link to="edit">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <ConfirmAction
                trigger={
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                }
                title="Delete Attachment"
                description="Are you sure you want to delete this attachment? This action cannot be undone."
                confirmText="Delete"
                onConfirm={handleDeleteAttachment}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {attachment?.text && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{attachment.text}</p>
              </div>
            )}

            {attachment?.voiceFiles && attachment.voiceFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Voice Recordings</h3>
                </div>
                <div className="space-y-2">
                  {attachment.voiceFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                      <audio controls className="flex-1">
                        <source src={URL.createObjectURL(file)} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attachment?.imageFiles && attachment.imageFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Images</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {attachment.imageFiles.map((file, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Attachment image ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:text-white hover:bg-white/20"
                          onClick={() => {
                            // TODO: Implement image preview
                            window.open(URL.createObjectURL(file), "_blank");
                          }}
                        >
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
} 