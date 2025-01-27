import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra;

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
export const OPENAI_API_KEY = extra?.OPENAI_API_KEY || ''; 