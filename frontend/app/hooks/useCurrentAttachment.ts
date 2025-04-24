import { useParams } from "react-router";
import type { AttachmentType } from "./useCurrentSession";

interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  text?: string;
  voiceFiles?: File[];
  imageFiles?: File[];
}

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