import { ENV } from '../config/env';
import * as FileSystem from 'expo-file-system';

interface TranscriptionResponse {
  text: string;
  language?: string;
  error?: string;
}

interface AnalysisResponse {
  summary: string;
  keyPoints: string[];
  topics: string[];
  isMeeting?: boolean;
  speakers?: {
    name: string;
    lines: {
      text: string;
      timestamp: number;
    }[];
  }[];
  rawTranscription: string;
}

// Add interface for topic structure
interface Topic {
  title: string;
  summary: string;
  bulletPoints: string[];
}

const verifyApiKey = () => {
  console.log('API Key:', ENV.OPENAI_API_KEY ? 'Present' : 'Missing');
  if (!ENV.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
};

export const transcribeAudio = async (uri: string): Promise<TranscriptionResponse> => {
  try {
    verifyApiKey();
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Audio file not found');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    const response = await fetch(`${ENV.API_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Transcription failed');
    }

    const data = await response.json();
    return {
      text: data.text,
      language: data.language
    };

  } catch (error) {
    console.error('Transcription error:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const analyzeTranscription = async (text: string): Promise<AnalysisResponse> => {
  try {
    verifyApiKey();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes transcriptions. Create a detailed analysis with the following structure:
            {
              "summary": "Brief 2-3 sentence overview",
              "keyPoints": ["Important point 1", "Important point 2", ...],
              "topics": [
                {
                  "title": "Clear section title",
                  "summary": "Detailed explanation of this segment",
                  "bulletPoints": ["Key point 1", "Key point 2", ...]
                }
              ],
              "isMeeting": true/false,
              "speakers": [],
              "rawTranscription": "Original text"
            }`
          },
          {
            role: 'user',
            content: text
          }
        ]
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Type check and sanitize the response
    return {
      summary: result.summary || '',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      topics: Array.isArray(result.topics) ? result.topics.map((topic: Topic) => ({
        title: topic.title || 'Untitled Topic',
        summary: topic.summary || 'No summary available',
        bulletPoints: Array.isArray(topic.bulletPoints) ? topic.bulletPoints : []
      })) : [],
      isMeeting: Boolean(result.isMeeting),
      speakers: result.speakers || [],
      rawTranscription: text
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
};