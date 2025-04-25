import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  response: z.string().min(1, "Response is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface CompleteImpressionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export function CompleteImpressionForm({
  isOpen,
  onClose,
  onSubmit,
}: CompleteImpressionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      response: "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Impression</DialogTitle>
          <DialogDescription>
            Please provide your response to complete this impression.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="response" className="text-sm font-medium">
              Response
            </label>
            <Textarea
              id="response"
              placeholder="Enter your response..."
              {...form.register("response")}
            />
            {form.formState.errors.response && (
              <p className="text-sm text-destructive">
                {form.formState.errors.response.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Complete</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 