import { useParams } from "react-router";
import type { Attachment } from "~/models/session";

export function useCurrentAttachment(): Attachment | null {
  const { attachmentId } = useParams();
  
  // TODO: Replace with actual API call
  return {
    id: attachmentId || "",
    name: "Sample Attachment",
    type: "impression",
    text: "Sample description",
    voiceFiles: [
      new File(["mock-voice-data"], "voice1.wav", { type: "audio/wav" }),
      new File(["mock-voice-data"], "voice2.wav", { type: "audio/wav" }),
    ],
    imageFiles: [
      "https://images.unsplash.com/photo-1682687220063-4742bd7fd538",
      "https://t4.ftcdn.net/jpg/03/09/41/67/360_F_309416772_lVGnuOqM9khlesF3z7E922P9zzGnCSYo.jpg",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTS1h28K5gTpNEaGq38Y3rYa7QY4yJbm37khPHbEdWGSdtKO9r9VosG0imMuZFLQIKPFcY&usqp=CAU",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGRmiy2c21XikGDKWTEq2o2HuJc8RGVRSIRZrjnvxWcuyEte4qVU684y6rOP92KZPfIrw&usqp=CAU",
      "https://www.bigfootdigital.co.uk/wp-content/uploads/2020/07/image-optimisation-scaled.jpg",
    ],
  };
} 