import { transcribeAudio as openAITranscribe, analyzeTranscription } from './openaiService';

export const transcribeAudio = async (uri: string): Promise<string> => {
  try {
    const result = await openAITranscribe(uri);
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result.text;
  } catch (error) {
    console.error('Transcription failed:', error);
    throw error;
  }
};

export const generateSummary = async (text: string): Promise<string> => {
  try {
    const analysis = await analyzeTranscription(text);
    return analysis.summary;
  } catch (error) {
    console.error('Summary generation failed:', error);
    return 'Unable to generate summary';
  }
};

export const categorizeText = async (text: string): Promise<string[]> => {
  try {
    const analysis = await analyzeTranscription(text);
    return analysis.topics;
  } catch (error) {
    console.error('Categorization failed:', error);
    return ['General'];
  }
};

export const generateTitle = async (text: string): Promise<string> => {
  try {
    const analysis = await analyzeTranscription(text);
    return analysis.keyPoints[0] || text.split(' ').slice(0, 3).join(' ') + '...';
  } catch (error) {
    console.error('Title generation failed:', error);
    return 'New Recording';
  }
}; 