// src/hooks/useAudioRecorder.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useRecordingStore } from '../stores/useRecordingStore';
import { useUserStore } from '../stores/useUserStore';
import { transcribeAudio, categorizeText, generateTitle } from '../services/transcriptionService'; 
// ^ Example services for transcription

interface RecordingData {
  id: string;
  uri: string;
  timestamp: number;
  duration: number;
  status: 'recording' | 'analyzing' | 'completed';
  transcription?: string;
  categories?: string[];
  title?: string;
}

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'analyzing'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0); // in ms
  const [audioLevel, setAudioLevel] = useState(0);

  // Timer ref
  const durationTimer = useRef<number | NodeJS.Timeout | null>(null);

  // Access subscription data, so we can subtract used minutes
  const { subscription, updateUserLimits } = useUserStore.getState();

  // Access your recording store if you want to store final recordings
  const addRecording = useRecordingStore((state) => state.addRecording);

  // Helper to round up if leftover >= 30s
  const calculateRoundedMinutes = (durationMs: number) => {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const leftoverSeconds = seconds % 60;
    // If leftover >= 30 => +1 min, ensure at least 1 total
    return leftoverSeconds >= 30 ? minutes + 1 : Math.max(1, minutes);
  };

  const setupAudio = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission Required', 'Enable microphone permissions to record audio.');
      throw new Error('No microphone permission');
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true
    });
  };

  const startRecording = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      if (recording) {
        // If already recording, stop it first
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      await setupAudio();
      setRecordingState('recording');
      setRecordingDuration(0);

      // Create recording
      const { recording: newRec } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 192000
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.MAX,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 192000
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 192000
          }
        },
        (status) => {
          // optional: track audio meter
          if (status.isRecording && status.metering !== undefined) {
            const level = Math.min(Math.max(status.metering, -160), 0) + 160;
            setAudioLevel(level / 160);
          }
        },
        100
      );

      setRecording(newRec);

      // Start timer
      durationTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1000);
      }, 1000);
    } catch (err) {
      console.error('startRecording error:', err);
      setRecordingState('idle');
    }
  }, [recording]);

  const stopRecording = useCallback(async () => {
    if (!recording) return;

    setRecordingState('analyzing');

    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('Recording URI is null');

      // Round usage
      const usedMinutes = calculateRoundedMinutes(recordingDuration);

      // Subtract from user’s subscription
      if (subscription) {
        await updateUserLimits({ recordingMinutes: -usedMinutes });
      }

      // Example: transcribe audio
      const text = await transcribeAudio(uri);
      const cat = await categorizeText(text);
      const title = await generateTitle(text);

      // Add to store if desired
      const newRecording: RecordingData = {
        id: Date.now().toString(),
        uri,
        timestamp: Date.now(),
        duration: recordingDuration,
        status: 'completed',
        transcription: text,
        categories: cat,
        title
      };
      addRecording(newRecording);

    } catch (err) {
      console.error('stopRecording error:', err);
    } finally {
      // Cleanup
      setRecording(null);
      setRecordingDuration(0);
      setAudioLevel(0);
      setRecordingState('idle');
    }
  }, [recording, subscription, recordingDuration]);

  useEffect(() => {
    // Cleanup timer if unmount
    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    };
  }, []);

  return {
    recordingState,
    recordingDuration,
    audioLevel,
    startRecording,
    stopRecording
  };
};
