import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Mic, Image as ImageIcon, Square } from "lucide-react";
import { useReactMediaRecorder } from "react-media-recorder";

const MAX_VOICE_FILES = 3;
const MAX_IMAGE_FILES = 9;

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  text: z.string().optional(),
  voiceFiles: z.array(z.any()).max(MAX_VOICE_FILES, {
    message: `Maximum ${MAX_VOICE_FILES} voice recordings allowed`,
  }),
  imageFiles: z.array(z.any()).max(MAX_IMAGE_FILES, {
    message: `Maximum ${MAX_IMAGE_FILES} images allowed`,
  }),
});

type FormValues = z.infer<typeof formSchema>;

type AttachmentType = "note" | "recommendation" | "impression";

interface AttachmentFormProps {
  type: AttachmentType;
  trigger: React.ReactNode;
  initialData?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
}

export function AttachmentForm({ type, trigger, initialData, onSubmit }: AttachmentFormProps) {
  const [open, setOpen] = useState(false);
  const [voiceFiles, setVoiceFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const {
    status,
    startRecording,
    stopRecording,
    clearBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl, blob) => {
      if (blob) {
        const file = new File([blob], `recording-${Date.now()}.wav`, { type: "audio/wav" });
        setVoiceFiles([...voiceFiles, file]);
        clearBlobUrl();
      }
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      text: "",
      voiceFiles: [],
      imageFiles: [],
      ...initialData,
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit(values);
    setOpen(false);
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > MAX_IMAGE_FILES) {
      form.setError("imageFiles", {
        type: "manual",
        message: `Maximum ${MAX_IMAGE_FILES} images allowed`,
      });
      return;
    }
    setImageFiles([...imageFiles, ...files]);
  };

  const handleStartRecording = () => {
    if (voiceFiles.length >= MAX_VOICE_FILES) {
      form.setError("voiceFiles", {
        type: "manual",
        message: `Maximum ${MAX_VOICE_FILES} voice recordings allowed`,
      });
      return;
    }
    startRecording();
  };

  const getTypeTitle = (type: AttachmentType) => {
    switch (type) {
      case "note":
        return "Note";
      case "recommendation":
        return "Recommendation";
      case "impression":
        return "Client Impression";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create {getTypeTitle(type)}</DialogTitle>
          <DialogDescription>
            Add a new {type.toLowerCase()} with optional text, voice recordings, and images.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`Enter ${type} name...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Enter ${type} text...`}
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={status === "recording" ? "destructive" : "outline"}
                    className="flex items-center gap-2"
                    onClick={status === "recording" ? stopRecording : handleStartRecording}
                    disabled={voiceFiles.length >= MAX_VOICE_FILES && status !== "recording"}
                  >
                    {status === "recording" ? (
                      <>
                        <Square className="h-4 w-4" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  {status === "recording" && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm text-muted-foreground">Recording...</span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {voiceFiles.length}/{MAX_VOICE_FILES} recordings
                </span>
              </div>
              {form.formState.errors.voiceFiles && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.voiceFiles.message}
                </p>
              )}

              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => document.getElementById("image-input")?.click()}
                  disabled={imageFiles.length >= MAX_IMAGE_FILES}
                >
                  <ImageIcon className="h-4 w-4" />
                  Upload Images
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                    multiple
                  />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {imageFiles.length}/{MAX_IMAGE_FILES} images
                </span>
              </div>
              {form.formState.errors.imageFiles && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.imageFiles.message}
                </p>
              )}
            </div>

            {voiceFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Voice Recordings</h4>
                <div className="space-y-2">
                  {voiceFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <audio controls src={URL.createObjectURL(file)} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVoiceFiles(voiceFiles.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {imageFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Images</h4>
                <div className="grid grid-cols-3 gap-2">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Uploaded image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          setImageFiles(imageFiles.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create {getTypeTitle(type)}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 