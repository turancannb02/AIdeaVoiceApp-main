import { Speaker } from "src/components/MeetingReplay";

export interface AnalysisResponse {
  summary: string;
  keyPoints: string[];
  topics: Array<{
    title: string;
    summary: string;
    bulletPoints: string[];
  }>;
  isMeeting: boolean;
  speakers: Speaker[];
  rawTranscription: string;
}