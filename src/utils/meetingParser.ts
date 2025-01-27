// src/utils/meetingParser.ts
import { getAvatarUri } from './avatarLoader';

export function parseSpeakers(transcript: string) {
  const lines = transcript.split('\n').filter(l => l.trim());
  const speakerMap: Record<string, { avatarIndex: number }> = {};
  let currentSpeaker = '';
  let avatarCount = 0;
  let defaultSpeakerCount = 0;

  // First pass: identify speakers or create default speakers
  lines.forEach(line => {
    const speakerMatch = line.match(/^([^:]+):/);
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim();
      if (!speakerMap[speaker]) {
        speakerMap[speaker] = {
          avatarIndex: avatarCount++ % 9 // Cycle through 9 available avatars
        };
      }
    } else if (!currentSpeaker) {
      // If no speaker detected, create a default speaker
      const defaultSpeaker = `Speaker ${++defaultSpeakerCount}`;
      if (!speakerMap[defaultSpeaker]) {
        speakerMap[defaultSpeaker] = {
          avatarIndex: avatarCount++ % 9
        };
      }
      currentSpeaker = defaultSpeaker;
    }
  });

  // Second pass: create messages
  const messages = lines.map(line => {
    const match = line.match(/^([^:]+):\s*(.*)/);
    
    if (match) {
      const [_, speaker, text] = match;
      const speakerName = speaker.trim();
      currentSpeaker = speakerName;
      
      return {
        speaker: speakerName,
        text: text.trim() || line.trim(), // Fallback to full line if no text after colon
        timestamp: new Date().toLocaleTimeString(),
        avatarIndex: speakerMap[speakerName].avatarIndex
      };
    } else if (line.trim()) {
      // For lines without speaker prefix, use current/default speaker
      const speakerName = currentSpeaker || `Speaker ${defaultSpeakerCount}`;
      return {
        speaker: speakerName,
        text: line.trim(),
        timestamp: new Date().toLocaleTimeString(),
        avatarIndex: speakerMap[speakerName].avatarIndex
      };
    }
    return null;
  }).filter(Boolean);

  return messages.length > 0 ? messages : [{
    speaker: 'Speaker 1',
    text: transcript.trim(),
    timestamp: new Date().toLocaleTimeString(),
    avatarIndex: 0
  }];
}
