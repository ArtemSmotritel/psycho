import { useParams } from "react-router";
import { fakeSessions } from "~/test-data/fakeSessions";
import type { Session } from "~/models/session";

export function useCurrentSession(): Session | null {
  const { sessionId } = useParams();

  if (!sessionId) {
    return null;
  }

  const session = fakeSessions.find((s) => s.id === sessionId);

  if (!session) {
    return null;
  }

  return {
    ...session,
    notes: [
      {
        id: "1",
        name: "Initial Assessment",
        type: "note",
        text: "Client presented with symptoms of anxiety and stress. Discussed coping mechanisms and relaxation techniques."
      },
      {
        id: "4", 
        name: "Progress Update",
        type: "note",
        text: "Client reports improved sleep patterns and reduced anxiety after implementing recommended relaxation techniques."
      },
      {
        id: "5",
        name: "Goal Setting Session",
        type: "note", 
        text: "Worked with client to establish clear therapeutic goals and develop an action plan for the next month."
      },
      {
        id: "6",
        name: "Family Dynamics",
        type: "note",
        text: "Explored family relationships and their impact on current stress levels. Identified key patterns and triggers."
      },
      {
        id: "7",
        name: "Coping Strategies Review",
        type: "note",
        text: "Reviewed effectiveness of current coping strategies. Client showing good progress with mindfulness techniques."
      },
      {
        id: "8",
        name: "Work-Life Balance",
        type: "note",
        text: "Discussed challenges with work-life balance. Developed strategies for setting boundaries and managing workplace stress."
      },
      {
        id: "9",
        name: "Relationship Issues",
        type: "note",
        text: "Addressed ongoing relationship concerns. Focused on communication skills and assertiveness training."
      },
      {
        id: "10",
        name: "Self-Care Planning",
        type: "note",
        text: "Created comprehensive self-care plan including exercise, meditation, and social support activities."
      },
      {
        id: "11",
        name: "Progress Review",
        type: "note",
        text: "Quarterly progress review shows significant improvement in anxiety management and overall emotional regulation."
      },
    ],
    recommendations: [
      {
        id: "2", 
        name: "Daily Mindfulness Practice",
        type: "recommendation",
        text: "Practice 10 minutes of mindfulness meditation each morning to help manage anxiety levels."
      }
    ],
    impressions: [
      {
        id: "3",
        name: "First Session Impression",
        type: "impression", 
        text: "Client was engaged and receptive to therapeutic discussion. Shows good insight into their challenges."
      },
    ],
  };
}