import { ENV } from '../config/env';

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  try {
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
            content: `You are a professional translator. Translate the following text to ${targetLang}. 
                     Keep the following in mind:
                     1. Maintain the original formatting and paragraph structure
                     2. Preserve any technical terms or proper nouns
                     3. Ensure the translation is natural and fluent in the target language
                     4. Keep any emojis or special characters intact
                     5. Maintain the same tone and level of formality as the original text`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}; 