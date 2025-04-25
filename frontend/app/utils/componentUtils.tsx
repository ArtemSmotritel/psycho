import { FileText, Smile, ThumbsUp, User } from "lucide-react";
import type { AttachmentType } from "~/models/session";

// Icon mapping utilities
interface AttachmentIconProps {
  type: AttachmentType;
  size?: string;
}

export function AttachmentIcon({ type, size = "h-6 w-6" }: AttachmentIconProps) {
  switch (type) {
    case "note":
      return <FileText className={size} />;
    case "recommendation":
      return <ThumbsUp className={size} />;
    case "impression":
      return <Smile className={size} />;
    default:
      return <FileText className={size} />;
  }
}
