import { Button } from "@/components/ui/button";
import { Edit, Mic, Image as ImageIcon, Trash2, User, ArrowRight, CheckCircle, MessageSquare } from "lucide-react";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Link, useParams } from "react-router";
import { useCurrentAttachment } from "~/hooks/useCurrentAttachment";
import { AttachmentIcon } from "~/utils/componentUtils";
import { ActionsSection, ActionItem } from "@/components/ActionsSection";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
  const { clientId, sessionId } = useParams();

  if (!attachment) {
    return <div>Attachment not found</div>;
  }

  const handleDeleteAttachment = () => {
    console.log("Deleting attachment:", attachment.id);
    // TODO: Implement attachment deletion
  };

  const handleRespond = () => {
    console.log("Responding to impression:", attachment.id);
    // TODO: Implement response functionality
  };

  const handleComplete = () => {
    console.log("Completing impression:", attachment.id);
    // TODO: Implement completion functionality
  };

  const getFileUrl = (file: File | string) => {
    if (typeof file === 'string') {
      return file;
    }
    return URL.createObjectURL(file);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center gap-4">
        <AttachmentIcon type={attachment.type} size="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">{attachment.name}</h1>
          <p className="text-sm text-muted-foreground">{getTypeLabel(attachment.type)}</p>
        </div>
      </div>

      <ActionsSection title="Actions">
        <Link to="edit">
          <ActionItem
            icon={<Edit className="h-6" />}
            label="Edit Attachment"
          />
        </Link>

        <Link to={`/psychologist/clients/${clientId}`}>
          <ActionItem
            icon={<User className="h-6" />}
            label="Open Client Profile"
          />
        </Link>

        <Link to={`/psychologist/clients/${clientId}/sessions/${sessionId}`}>
          <ActionItem
            icon={<ArrowRight className="h-6" />}
            label="Open Session"
          />
        </Link>

        {attachment.type === "impression" && (
          <>
            <ActionItem
              icon={<MessageSquare className="h-6" />}
              label="Respond"
              onClick={handleRespond}
            />
            <ActionItem
              icon={<CheckCircle className="h-6" />}
              label="Complete"
              onClick={handleComplete}
            />
          </>
        )}

        <ConfirmAction
          trigger={
            <ActionItem
              icon={<Trash2 className="h-6" />}
              label="Delete Attachment"
              variant="outline"
              className="text-destructive hover:text-destructive"
            />
          }
          title="Delete Attachment"
          description="Are you sure you want to delete this attachment? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDeleteAttachment}
        />
      </ActionsSection>

      <div className="space-y-8">
        {attachment.text && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{attachment.text}</p>
          </div>
        )}

        {attachment.voiceFiles && attachment.voiceFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              <h3 className="text-lg font-medium">Voice Recordings</h3>
            </div>
            <div className="space-y-2">
              {attachment.voiceFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                  <audio controls className="flex-1">
                    <source src={getFileUrl(file)} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ))}
            </div>
          </div>
        )}

        {attachment.imageFiles && attachment.imageFiles.length > 0 && (
          <div className="space-y-4 px-10">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              <h3 className="text-lg font-medium">Images</h3>
            </div>
            <Carousel className="w-full md:max-w-3xl lg:max-w-5xl max-w-xs" opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-1">
                {attachment.imageFiles.map((file, index) => (
                  <CarouselItem key={index} className="sm:basis-1/1 md:basis-1/2 lg:basis-1/3">
                    <div className="relative group aspect-square p-2">
                      <img
                        src={getFileUrl(file)}
                        alt={`Attachment image ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:text-white hover:bg-white/20"
                          onClick={() => {
                            window.open(getFileUrl(file), "_blank");
                          }}
                        >
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        )}
      </div>
    </div>
  );
} 