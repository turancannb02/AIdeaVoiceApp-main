// src/stores/useUserStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { firestore } from '../config/firebaseConfig';
import { UserTrackingService } from '../services/userTrackingService';
import { UserAnalytics } from '../types/user';

interface Subscription {
  plan: 'free' | 'monthly' | 'sixMonth' | 'yearly';
  startDate: Date;
  endDate: Date;
  features: {
    recordingMinutes: number;     // how many minutes left
    aiChatsRemaining: number;     // how many AI Chats left
    translationEnabled: boolean;
    meetingReplaysEnabled: boolean;
  };
}

interface UsageData {
  recordings?: number;
  minutes?: number;
  transcriptions?: number;
  aiChatsUsed?: number;
}

interface AnalyticsUpdates {
     totalRecordingMinutes?: number;
     totalExports?: number;
     totalShares?: number;
     lastActiveDate?: string;
   }
   
   interface UserLimitChanges {
     recordingMinutes?: number;
     aiChats?: number;
   }
interface UserState {
  uid: string | null;
  subscription: Subscription | null;
  userCode: string | null;
  
  initUser: () => Promise<void>;
  updateSubscription: (planId: 'free' | 'monthly' | 'sixMonth' | 'yearly') => Promise<{ success: boolean }>;
  syncSubscription: () => Promise<void>;
  generateUserCode: () => Promise<string>;
  checkFreeTrialStatus: () => Promise<{
    isExpiring: boolean;
    daysLeft: number;
    usagePercentage: number;
  }>;
  // Remove RevenueCat methods
}

export const useUserStore = create<UserState>((set, get) => ({
     uid: null,
  subscription: null,
  userCode: null,

  // 1) initUser
  initUser: async () => {
    const uid = await UserTrackingService.initAnonymousUser();
    set({ uid });
  },

  // 2) updateSubscription
  updateSubscription: async (planId) => {
    try {
      const { uid } = get();
      if (!uid) throw new Error('No user ID found');

      const result = await UserTrackingService.updateUserPlan(uid, planId);
      
      if (!result.success) {
        throw new Error(result.message);
      }

      await get().syncSubscription();
      return { success: true };
    } catch (error) {
      console.error('updateSubscription error:', error);
      return { success: false };
    }
  },

  // 3) updateUserLimits
  updateUserLimits: async (changes: UserLimitChanges) => {
     const { subscription, uid } = get();
     if (!subscription || !uid) return;

    try {
      let newMinutes = subscription.features.recordingMinutes;
      let newAiChats = subscription.features.aiChatsRemaining;

      if (typeof changes.recordingMinutes === 'number') {
        newMinutes += changes.recordingMinutes;
        if (newMinutes < 0) newMinutes = 0;
      }
      if (typeof changes.aiChats === 'number') {
        newAiChats += changes.aiChats;
        if (newAiChats < 0) newAiChats = 0;
      }

      await updateDoc(doc(firestore, 'users', uid), {
        'subscription.features.recordingMinutes': newMinutes,
        'subscription.features.aiChatsRemaining': newAiChats
      });

      set({
        subscription: {
          ...subscription,
          features: {
            ...subscription.features,
            recordingMinutes: newMinutes,
            aiChatsRemaining: newAiChats
          }
        }
      });

      // Optionally track usage to Firestore
      if (changes.recordingMinutes && changes.recordingMinutes < 0) {
        await UserTrackingService.trackUsage(uid, {
          minutes: Math.abs(changes.recordingMinutes)
        });
      }
    } catch (error) {
      console.error('updateUserLimits error:', error);
    }
  },

  // 4) getUsageRemaining
  getUsageRemaining: () => {
    const { subscription } = get();
    if (!subscription) {
      return { recordingMinutes: 0, aiChats: 0 };
    }

    // If plan is yearly, we pretend “unlimited,” but we store 600 internally
    if (subscription.plan === 'yearly') {
      return {
        recordingMinutes: 'unlimited',
        aiChats: 'unlimited'
      };
    }

    return {
      recordingMinutes: subscription.features.recordingMinutes,
      aiChats: subscription.features.aiChatsRemaining
    };
  },

  getAnalytics: () => ({
    totalRecordingMinutes: 0,
    totalExports: 0,
    totalShares: 0,
    lastActiveDate: new Date().toISOString()
  }),

  updateAnalytics: (updates: AnalyticsUpdates) => {
     console.log('Updating analytics:', updates);
   },

  decrementAIChat: async () => {
    const { subscription, uid } = get();
    if (!subscription || !uid) {
      return { success: false, remainingChats: 0, shouldUpgrade: true };
    }

    // Yearly plan has unlimited chats
    if (subscription.plan === 'yearly') {
      return {
        success: true,
        remainingChats: 'unlimited',
        shouldUpgrade: false
      };
    }

    try {
      const newCount = subscription.features.aiChatsRemaining - 1;
      
      // Check if we're out of chats
      if (newCount < 0) {
        return {
          success: false,
          remainingChats: 0,
          shouldUpgrade: true,
          suggestedPlan: subscription.plan === 'monthly' ? 'sixMonth' : 'yearly'
        };
      }

      // Update Firestore and local state
      await updateDoc(doc(firestore, 'users', uid), {
        'subscription.features.aiChatsRemaining': newCount
      });

      set({
        subscription: {
          ...subscription,
          features: {
            ...subscription.features,
            aiChatsRemaining: newCount
          }
        }
      });

      // Track usage
      await UserTrackingService.trackUsage(uid, { aiChatsUsed: 1 });

      return {
        success: true,
        remainingChats: newCount,
        shouldUpgrade: newCount < 3, // Suggest upgrade when less than 3 chats remaining
        suggestedPlan: subscription.plan === 'monthly' ? 'sixMonth' : 'yearly'
      };
    } catch (error) {
      console.error('Error decrementing AI chat:', error);
      return { success: false, remainingChats: 0, shouldUpgrade: false };
    }
  },

  trackUsage: async (uid: string, data: UsageData) => {
     const userRef = doc(firestore, 'users', uid);
     await updateDoc(userRef, {
       'usageStats.totalRecordings': increment(data.recordings || 0),
       'usageStats.totalMinutes': increment(data.minutes || 0),
       'usageStats.totalTranscriptions': increment(data.transcriptions || 0),
       'usageStats.totalAiChats': increment(data.aiChatsUsed || 0)
     });
  },

  generateUserCode: async () => {
    const uid = get().uid;
    if (!uid) throw new Error('No user ID found');

    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    };

    try {
      const code = generateCode();
      await updateDoc(doc(firestore, 'users', uid), {
        userCode: code,
        userCodeCreatedAt: new Date()
      });
      
      set({ userCode: code });
      return code;
    } catch (error) {
      console.error('Error generating user code:', error);
      throw error;
    }
  },

  checkFreeTrialStatus: async () => {
    const { subscription } = get();
    
    if (subscription?.plan !== 'free') {
      return { isExpiring: false, daysLeft: 0, usagePercentage: 0 };
    }

    const startDate = new Date(subscription.startDate);
    const now = new Date();
    const daysLeft = 7 - Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const recordingUsage = ((60 - subscription.features.recordingMinutes) / 60) * 100;
    const chatUsage = ((3 - subscription.features.aiChatsRemaining) / 3) * 100;
    const usagePercentage = Math.max(recordingUsage, chatUsage);

    return {
      isExpiring: daysLeft <= 2 || usagePercentage >= 80,
      daysLeft,
      usagePercentage
    };
  },

  // Add new method to sync with Firebase
  syncSubscription: async () => {
    try {
      const { uid } = get();
      if (!uid) throw new Error('No user ID found');

      // Get fresh data from Firestore
      const userRef = doc(firestore, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        set({ 
          subscription: {
            plan: userData.subscription.plan,
            startDate: userData.subscription.startDate.toDate(),
            endDate: userData.subscription.endDate.toDate(),
            features: userData.subscription.features
          }
        });
      }
    } catch (error) {
      console.error('Error syncing subscription:', error);
    }
  }
}));