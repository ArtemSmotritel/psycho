import { useParams } from "react-router";
import type { Attachment } from "~/models/session";

export function useCurrentAttachment(): Attachment | null {
  const { attachmentId } = useParams();
  
  // TODO: Replace with actual API call
  return {
    id: attachmentId || "",
    name: "Sample Attachment", 
    type: "impression",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?",
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