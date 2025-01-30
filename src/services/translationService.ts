import { ENV } from '../config/env';

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  try {
    // ✅ Debugging API Key
    console.log("🔍 OpenAI API Key:", ENV.OPENAI_API_KEY ? "Present" : "❌ MISSING");
    if (!ENV.OPENAI_API_KEY) {
      throw new Error("❌ OpenAI API key is missing.");
    }

    // ✅ Make API Request
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
        max_tokens: 1000, // ✅ Ensures full translation output
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ OpenAI API Error:", errorData);
      throw new Error(`Translation failed: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // ✅ Handle Possible JSON Parsing Errors
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("❌ Invalid response from OpenAI API.");
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("🚨 Translation Error:", error);
    return "Sorry, translation failed. Please try again later. 😔";
  }
};
