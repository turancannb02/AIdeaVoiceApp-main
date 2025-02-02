import { AppUser, UserAnalytics } from '../types/user';
import { FeatureName, AnalyticsEvent } from '../types/analytics';
import { db } from '../config/firebaseConfig';
import { doc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import * as Device from 'expo-device';

type ScreenName = 'home' | 'recording' | 'settings' | 'aidea' | 'transcribed' | 'ai' | 'meeting';

export class AnalyticsService {
  // Track session start
  static async trackSessionStart(uid: string) {
    const sessionRef = await addDoc(collection(db, 'sessions'), {
      uid,
      startTime: new Date(),
      device: {
        brand: Device.brand,
        model: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion
      }
    });
    return sessionRef.id;
  }

  // Track session end
  static async trackSessionEnd(sessionId: string, duration: number) {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      endTime: new Date(),
      duration,
      isCompleted: true
    });
  }

  // Track screen views
  static async trackScreenView(uid: string, screenName: ScreenName, duration?: number) {
    await addDoc(collection(db, 'screenViews'), {
      uid,
      screenName,
      timestamp: new Date(),
      duration,
      device: {
        brand: Device.brand,
        model: Device.modelName
      }
    });
  }

  // Track feature usage
  static async trackFeatureUse(uid: string, feature: FeatureName, metadata?: Record<string, any>) {
    await addDoc(collection(db, 'featureUsage'), {
      uid,
      feature,
      timestamp: new Date(),
      metadata,
      device: {
        brand: Device.brand,
        model: Device.modelName
      }
    });

    // Update aggregate stats
    await updateDoc(doc(db, 'users', uid), {
      [`stats.${feature}Usage`]: increment(1),
      [`stats.last${feature.charAt(0).toUpperCase() + feature.slice(1)}Use`]: new Date()
    });
  }

  // Track performance metrics
  static async trackPerformance(uid: string, feature: FeatureName, duration: number) {
    await addDoc(collection(db, 'performance'), {
      uid,
      feature,
      duration,
      timestamp: new Date(),
      device: {
        brand: Device.brand,
        model: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion
      }
    });
  }

  // Track errors
  static async trackError(uid: string, error: Error, context: Record<string, any>) {
    await addDoc(collection(db, 'errors'), {
      uid,
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      timestamp: new Date(),
      device: {
        brand: Device.brand,
        model: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion
      }
    });
  }

  // Track user flow
  static async trackUserFlow(uid: string, fromScreen: ScreenName, toScreen: ScreenName) {
    await addDoc(collection(db, 'userFlows'), {
      uid,
      fromScreen,
      toScreen,
      timestamp: new Date()
    });
  }
}