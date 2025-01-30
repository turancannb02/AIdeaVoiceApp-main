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

// Define Topic structure
interface Topic {
  title: string;
  summary: string;
  bulletPoints: string[];
}

// ✅ Debugging function to check API key
const verifyApiKey = () => {
  console.log('🔍 API Key:', ENV.OPENAI_API_KEY ? 'Present' : '❌ MISSING');
  if (!ENV.OPENAI_API_KEY) {
    throw new Error('❌ OpenAI API key is missing or not set.');
  }
};

// ✅ Transcribe Audio (Fixed FormData issues on iOS)
export const transcribeAudio = async (uri: string): Promise<TranscriptionResponse> => {
  try {
    verifyApiKey();

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('❌ Audio file not found');
    }

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    // Fix FormData issue (iOS bug)
    const response = await fetch(`${ENV.API_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
        'Content-Type': 'multipart/form-data', // ✅ Fix for iOS
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Transcription API Error:", errorData);
      throw new Error(errorData.error?.message || 'Transcription failed');
    }

    const data = await response.json();
    return {
      text: data.text || '',
      language: data.language || 'unknown'
    };

  } catch (error) {
    console.error('🚨 Transcription Error:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// ✅ Analyze Transcription (Fixed JSON Parsing Issues)
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
            content: `You are an AI assistant that analyzes transcriptions. Create a structured analysis:
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

    if (!response.ok) {
      console.error("❌ OpenAI API Error:", await response.text());
      throw new Error("AI Analysis request failed.");
    }

    const data = await response.json();

    let result;
    try {
      result = JSON.parse(data.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error("🚨 JSON Parsing Error:", error);
      throw new Error("Failed to parse AI response.");
    }

    // ✅ Ensure response structure is valid
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
    console.error('🚨 Analysis Error:', error);
    return {
      summary: 'Analysis failed.',
      keyPoints: [],
      topics: [],
      rawTranscription: text,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
