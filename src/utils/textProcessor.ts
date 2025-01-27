interface ChatMessage {
  speaker: string;
  message: string;
  timestamp: string;
  avatarIndex: number;
}

export const processMeetingChat = (text: string, participants: string[] = []): ChatMessage[] => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Default participants if none provided
  const defaultParticipants = ['You', 'Maximilian', 'Rupert'];
  const speakers = participants.length > 0 ? participants : defaultParticipants;
  
  let currentTime = new Date();
  currentTime.setMinutes(currentTime.getMinutes() - sentences.length * 2);

  return sentences.map((sentence, index) => {
    const speaker = speakers[index % speakers.length];
    const messageTime = new Date(currentTime.getTime() + index * 120000);
    
    return {
      speaker,
      message: sentence.trim(),
      timestamp: messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarIndex: speaker === 'You' ? 0 : (speakers.indexOf(speaker) + 1),
    };
  });
};

export const generateCompactTitle = (text: string, maxLength: number = 40): string => {
  // Remove special characters and extra spaces
  const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Get first sentence or chunk of text
  const firstSentence = cleanText.split('.')[0];
  
  // If the first sentence is too long, take just the first few words
  if (firstSentence.length > maxLength) {
    const words = firstSentence.split(' ');
    let title = '';
    for (const word of words) {
      if ((title + word).length <= maxLength - 3) {
        title += (title ? ' ' : '') + word;
      } else {
        return title + '...';
      }
    }
    return title;
  }
  
  return firstSentence.length > maxLength 
    ? firstSentence.substring(0, maxLength - 3) + '...'
    : firstSentence;
}; 