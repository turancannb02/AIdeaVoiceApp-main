import { create } from 'zustand';
import { Recording } from '../types/recording';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResponse } from 'src/types/analysis';

const STORAGE_KEY = '@recordings';

interface RecordingStore {
  recordings: Recording[];
  selectedFilter: string;
  selectedRecording: Recording | null;
  addRecording: (recording: Recording) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  setSelectedFilter: (filter: string) => void;
  setSelectedRecording: (recording: Recording | null) => void;
  refreshRecordings: () => Promise<void>;
  updateRecordingCategory: (recordingId: string, category: string) => Promise<void>;
  loadRecordings: () => Promise<void>;
  updateRecordingAnalysis: (recordingId: string, analysis: AnalysisResponse) => Promise<void>;
}

export const useRecordingStore = create<RecordingStore>((set, get) => ({
  recordings: [],
  selectedFilter: 'recent',
  selectedRecording: null,

  loadRecordings: async () => {
    try {
      const storedRecordings = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedRecordings) {
        set({ recordings: JSON.parse(storedRecordings) });
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  },

  addRecording: async (recording) => {
    try {
      const newRecordings = [...get().recordings, recording];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
      set({ recordings: newRecordings });
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  },

  deleteRecording: async (id) => {
    try {
      const newRecordings = get().recordings.filter((r) => r.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
      set({ recordings: newRecordings });
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  },

  setSelectedFilter: (filter) => set({ selectedFilter: filter }),
  setSelectedRecording: (recording) => set({ selectedRecording: recording }),

  refreshRecordings: async () => {
    try {
      const storedRecordings = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedRecordings) {
        const recordings = JSON.parse(storedRecordings);
        set({ recordings: [...recordings].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )});
      }
    } catch (error) {
      console.error('Error refreshing recordings:', error);
    }
  },

  updateRecordingCategory: async (recordingId: string, category: string) => {
    try {
      const newRecordings = get().recordings.map((recording) =>
        recording.id === recordingId
          ? { ...recording, categories: [category] }
          : recording
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
      set({ recordings: newRecordings });
    } catch (error) {
      console.error('Error updating recording category:', error);
    }
  },

  updateRecordingAnalysis: async (recordingId: string, analysis: AnalysisResponse) => {
    try {
      const newRecordings = get().recordings.map((recording) =>
        recording.id === recordingId
          ? { ...recording, analysis }
          : recording
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
      set({ recordings: newRecordings });
    } catch (error) {
      console.error('Error updating recording analysis:', error);
    }
  },
}));