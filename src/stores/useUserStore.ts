// src/stores/useUserStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  doc,
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore';

import { db } from '../config/firebaseConfig'; // <-- Use 'db' instead of 'firestore'
import { UserTrackingService } from '../services/userTrackingService';
import { UserAnalytics } from '../types/user';
import PurchaseService from '../services/purchaseService';

interface Subscription {
  plan: 'free' | 'monthly' | 'sixMonth' | 'yearly';
  startDate: Date;
  endDate: Date;
  features: {
    recordingMinutes: number;
    aiChatsRemaining: number;
    translationEnabled: boolean;
    meetingReplaysEnabled: boolean;
  };
}

// 1) Add aiChatsUsed here
interface UsageData {
  recordings?: number;
  minutes?: number;
  transcriptions?: number;
  aiChatsUsed?: number; // Add this line
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
  syncSubscription: () => Promise<void>;
  updateSubscription: (planId: 'free' | 'monthly' | 'sixMonth' | 'yearly') => Promise<{ success: boolean }>;

  decrementAIChat: () => Promise<{
    success: boolean;
    remainingChats: number | 'unlimited';
    shouldUpgrade: boolean;
    suggestedPlan?: 'monthly' | 'sixMonth' | 'yearly';
  }>;

  generateUserCode: () => Promise<string>;
  checkFreeTrialStatus: () => Promise<{
    isExpiring: boolean;
    daysLeft: number;
    usagePercentage: number;
  }>;

  updateUserLimits: (changes: UserLimitChanges) => Promise<void>;
  getUsageRemaining: () => {
    recordingMinutes: number | 'unlimited';
    aiChats: number | 'unlimited';
  };

  getAnalytics: () => UserAnalytics;
  updateAnalytics: (updates: AnalyticsUpdates) => void;

  initializePurchases: () => Promise<void>;
  purchaseSubscription: (plan: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      uid: null,
      subscription: null,
      userCode: null,

      initUser: async () => {
        try {
          const uid = await UserTrackingService.initAnonymousUser();
          if (uid) {
            set({ uid });
          } else {
            console.error('initUser: No UID returned from UserTrackingService');
          }
        } catch (error) {
          console.error('initUser error:', error);
        }
      },

      updateSubscription: async (planId) => {
        try {
          let { uid } = get();
          if (!uid) {
            await get().initUser();
            uid = get().uid;
            if (!uid) {
              throw new Error('No user ID found after initUser attempt');
            }
          }

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

          await updateDoc(doc(db, 'users', uid), {
            'subscription.features.recordingMinutes': newMinutes,
            'subscription.features.aiChatsRemaining': newAiChats,
          });

          set({
            subscription: {
              ...subscription,
              features: {
                ...subscription.features,
                recordingMinutes: newMinutes,
                aiChatsRemaining: newAiChats,
              },
            },
          });

          // Track usage if minutes decreased
          if (changes.recordingMinutes && changes.recordingMinutes < 0) {
            await UserTrackingService.trackUsage(uid, {
              minutes: Math.abs(changes.recordingMinutes),
            });
          }
        } catch (error) {
          console.error('updateUserLimits error:', error);
        }
      },

      getUsageRemaining: () => {
        const { subscription } = get();
        if (!subscription) {
          return { recordingMinutes: 0, aiChats: 0 };
        }
        if (subscription.plan === 'yearly') {
          return {
            recordingMinutes: 'unlimited',
            aiChats: 'unlimited',
          };
        }
        return {
          recordingMinutes: subscription.features.recordingMinutes,
          aiChats: subscription.features.aiChatsRemaining,
        };
      },

      getAnalytics: () => ({
        totalRecordingMinutes: 0,
        totalExports: 0,
        totalShares: 0,
        lastActiveDate: new Date().toISOString(),
      }),

      updateAnalytics: async (updates: {
        recordings?: number;
        minutes?: number;
        transcriptions?: number;
        aiChatsUsed?: number; // Add this line
      }) => {
        // ... rest of the function
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
            shouldUpgrade: false,
          };
        }

        try {
          const newCount = subscription.features.aiChatsRemaining - 1;
          if (newCount < 0) {
            return {
              success: false,
              remainingChats: 0,
              shouldUpgrade: true,
              suggestedPlan: subscription.plan === 'monthly' ? 'sixMonth' : 'yearly',
            };
          }

          await updateDoc(doc(db, 'users', uid), {
            'subscription.features.aiChatsRemaining': newCount,
          });

          set({
            subscription: {
              ...subscription,
              features: {
                ...subscription.features,
                aiChatsRemaining: newCount,
              },
            },
          });

          // Now that we have aiChatsUsed in UsageData, we can do:
            await UserTrackingService.trackUsage(uid, { aiChatsUsed: 1 } as UsageData);

          return {
            success: true,
            remainingChats: newCount,
            shouldUpgrade: newCount < 3,
            suggestedPlan: subscription.plan === 'monthly' ? 'sixMonth' : 'yearly',
          };
        } catch (error) {
          console.error('Error decrementing AI chat:', error);
          return { success: false, remainingChats: 0, shouldUpgrade: false };
        }
      },

      generateUserCode: async () => {
        let { uid } = get();
        if (!uid) {
          await get().initUser();
          uid = get().uid;
          if (!uid) {
            console.error('generateUserCode: No UID after initUser');
            throw new Error('No user ID found');
          }
        }

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
          await updateDoc(doc(db, 'users', uid), {
            userCode: code,
            userCodeCreatedAt: new Date(),
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
          usagePercentage,
        };
      },

      syncSubscription: async () => {
        try {
          let { uid } = get();
          if (!uid) {
            await get().initUser();
            uid = get().uid;
            if (!uid) {
              console.error('No user ID found after initUser attempt, skipping syncSubscription');
              return;
            }
          }

          const userRef = doc(db, 'users', uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            set({
              subscription: {
                plan: userData.subscription.plan,
                startDate: userData.subscription.startDate.toDate(),
                endDate: userData.subscription.endDate.toDate(),
                features: userData.subscription.features,
              },
            });
          }
        } catch (error) {
          console.error('Error syncing subscription:', error);
        }
      },

      initializePurchases: async () => {
        await PurchaseService.initialize();
      },

      purchaseSubscription: async (plan: string) => {
        try {
          const offerings = await PurchaseService.getOfferings();
          if (!offerings) throw new Error('No offerings available');

          const purchasePackage = offerings.availablePackages.find(
            pkg => pkg.identifier === plan
          );
          if (!purchasePackage) throw new Error('Package not found');

          const customerInfo = await PurchaseService.purchasePackage(purchasePackage);
          
          // Update local subscription state
          await get().syncSubscription();
          return true;
        } catch (error) {
          console.error('Purchase error:', error);
          return false;
        }
      },

      restorePurchases: async () => {
        try {
          await PurchaseService.restorePurchases();
          await get().syncSubscription();
        } catch (error) {
          console.error('Restore error:', error);
        }
      }
    }),
    {
      name: 'user-store',
      // Change from getStorage -> storage
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
