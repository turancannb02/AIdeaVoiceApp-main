import { ENV } from '../config/env';

export const generateAIResponse = async (prompt: string, context: string): Promise<string> => {
  try {
    if (!ENV.OPENAI_API_KEY) throw new Error('⚠️ OpenAI API Key is missing');

    console.log("🔍 Using OpenAI API Key:", ENV.OPENAI_API_KEY); // Debugging log

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
            content: `You are a friendly and helpful AI assistant analyzing a recorded conversation/note.
            Your goal is to help users understand their recording better.

            Guidelines:
            - Be conversational and use emojis naturally
            - If the question is unrelated to the recording, respond with:
              "I'd love to help, but I can better assist with questions about your recording! 💭
               Feel free to ask about the content, key points, or any specific part you'd like to understand better ✨"
            - Keep responses concise but informative
            - Highlight important points with emojis

            Context from recording: ${context}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      console.error("❌ OpenAI API Error:", errorResponse);
      throw new Error(`Failed to get AI response: ${errorResponse.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No response from AI.";
  } catch (error) {
    console.error('🚨 AI Chat Error:', error.message);
    return "Sorry, something went wrong while processing your request. Please try again later. 😔";
  }
};
