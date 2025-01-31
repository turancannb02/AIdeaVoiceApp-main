// src/services/userTrackingService.ts

import { auth, db } from '../config/firebaseConfig';
import { signInAnonymously } from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
  collection,
  addDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

interface FeedbackData {
  uid: string;
  feedback: string;
  rating: number;
  timestamp: Date;
  deviceInfo: {
    brand: string | null;
    model: string;
    osName: string;
    osVersion: string;
    deviceType?: number | null;
  };
  appVersion: string;
}

export class UserTrackingService {
  static async initAnonymousUser() {
    const userCredential = await signInAnonymously(auth);
    const uid = userCredential.user.uid;

    // Get device info
    const deviceInfo = {
      brand: Device.brand,
      model: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      appVersion: Constants.expoConfig?.version || '1.0.0',
      lastUpdated: new Date()
    };

    // Create initial user document
    await setDoc(doc(db, 'users', uid), {
      createdAt: new Date(),
      deviceInfo,
      location: null,
      subscription: {
        plan: 'free',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        features: {
          recordingMinutes: 60,
          aiChatsRemaining: 3,
          translationEnabled: true,
          meetingReplaysEnabled: true
        }
      },
      usageStats: {
        totalRecordings: 0,
        totalMinutes: 0,
        totalTranscriptions: 0,
        totalAiChats: 0,
        totalMeetingReplays: 0
      },
     
    });

    // Attempt location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync();
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        await updateDoc(doc(db, 'users', uid), { location });
      }
    } catch (error) {
      console.log('Location error:', error);
    }

    return uid;
  }

  static async trackUsage(uid: string, data: {
    recordings?: number;
    minutes?: number;
    transcriptions?: number;
  }) {
    const userRef = doc(db, 'users', uid);

    await updateDoc(userRef, {
      'usageStats.totalRecordings': increment(data.recordings || 0),
      'usageStats.totalMinutes': increment(data.minutes || 0),
      'usageStats.totalTranscriptions': increment(data.transcriptions || 0)
    });
  }

  // Track user feedback => store in "feedback" collection
  static async submitFeedback(uid: string, text: string, rating: number) {
    const deviceInfo = {
      brand: Device.brand,
      model: Device.modelName ?? 'unknown',
      osName: Device.osName ?? 'unknown',
      osVersion: Device.osVersion ?? 'unknown',
      deviceType: Device.deviceType ?? null
    };

    const feedbackData: FeedbackData = {
      uid,
      feedback: text,
      rating,
      timestamp: new Date(),
      deviceInfo,
      appVersion: Constants.expoConfig?.version || '1.0.0'
    };

    await addDoc(collection(db, 'feedback'), feedbackData);
  }

  static async updateSubscription(
    uid: string,
    plan: 'free' | 'monthly' | 'sixMonth' | 'yearly'
  ) {
    // ... if you need
  }

  static async trackRecording(uid: string, recordingDurationMs: number) {
    const durationSeconds = Math.floor(recordingDurationMs / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const remainingSeconds = durationSeconds % 60;

    // Round up if >= 30 seconds
    const roundedMinutes = remainingSeconds >= 30 ? minutes + 1 : minutes;

    await updateDoc(doc(db, 'users', uid), {
      'usageStats.totalRecordings': increment(1),
      'usageStats.totalMinutes': increment(roundedMinutes),
      'recordingHistory': arrayUnion({
        date: new Date(),
        actualDuration: durationSeconds,
        roundedMinutes: roundedMinutes,
        remaining: remainingSeconds
      })
    });

    return roundedMinutes;
  }

  // For any detailed logging of user activity (device info, success/failure, etc.)
  static async trackUserActivity(uid: string, activity: {
    type: 'recording' | 'transcription' | 'aiChat' | 'translation';
    duration?: number;
    success: boolean;
    error?: string;
    metadata?: any;
  }) {
    const deviceInfo = {
      brand: Device.brand,
      model: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      deviceType: Device.deviceType
    };

    await addDoc(collection(db, 'userActivity'), {
      uid,
      ...activity,
      deviceInfo,
      timestamp: new Date(),
      appVersion: Constants.expoConfig?.version || '1.0.0'
    });
  }

  static async getUserStats(uid: string) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.data()?.usageStats || {};
  }

  static async updateUserPlan(uid: string, plan: 'free' | 'monthly' | 'sixMonth' | 'yearly') {
    try {
      const planConfigs = {
        free: {
          duration: 7,
          recordingMinutes: 60,
          aiChats: 3
        },
        monthly: {
          duration: 30,
          recordingMinutes: 150,
          aiChats: 20
        },
        sixMonth: {
          duration: 180,
          recordingMinutes: 200,
          aiChats: 40
        },
        yearly: {
          duration: 365,
          recordingMinutes: 999999,
          aiChats: 999999
        }
      };

      const config = planConfigs[plan];
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + config.duration * 24 * 60 * 60 * 1000);

      const userRef = doc(db, 'users', uid);
      
      // Update subscription directly without batch
      await updateDoc(userRef, {
        subscription: {
          plan,
          startDate,
          endDate,
          features: {
            recordingMinutes: config.recordingMinutes,
            aiChatsRemaining: config.aiChats,
            translationEnabled: true,
            meetingReplaysEnabled: true
          }
        },
        lastUpdated: new Date()
      });

      return {
        success: true,
        message: `Successfully updated user plan to ${plan}`
      };
    } catch (error) {
      console.error('Error updating user plan:', error);
      return {
        success: false,
        message: 'Failed to update user plan'
      };
    }
  }
}
