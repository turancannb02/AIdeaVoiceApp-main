import { OPENAI_API_KEY as ENV_OPENAI_KEY, FIREBASE_API_KEY as ENV_FIREBASE_KEY } from '@env';

export const ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
  API_URL: 'https://api.openai.com/v1/audio',
  MAX_FILE_SIZE: 25 * 1024 * 1024,
};
