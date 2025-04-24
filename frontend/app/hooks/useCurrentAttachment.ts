import { useParams } from "react-router";
import type { Attachment } from "~/models/session";

export function useCurrentAttachment(): Attachment | null {
  const { attachmentId } = useParams();
  
  // TODO: Replace with actual API call
  return {
    id: attachmentId || "",
    name: "Sample Attachment",
    type: "note",
    text: "Sample description",
    voiceFiles: [],
    imageFiles: [],
  };
} 