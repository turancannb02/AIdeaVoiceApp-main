// src/stores/useUserStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';

import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

import { db } from '../config/firebaseConfig'; // <-- Use 'db' instead of 'firestore'
import { UserTrackingService } from '../services/userTrackingService';
import { UserAnalytics } from '../types/user';
import PurchaseService, { PLAN_TO_PACKAGE_MAP } from '../services/purchaseService';
import NotificationService from '../services/notificationService';
import { getDaysRemaining } from '../utils/dateUtils';

export type SubscriptionPlan = 'monthly_pro' | 'sixMonth_premium' | 'yearly_ultimate';

interface Subscription {
  plan: 'free' | SubscriptionPlan;
  startDate: Date;
  endDate: Date;
  features: {
    recordingMinutes: number;
    aiChatsRemaining: number;
    translationEnabled: boolean;
    meetingReplaysEnabled: boolean;
  };
}

// Added aiChatsUsed to the usage data
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
  notificationSettings: {
    dailyNotifications: boolean;
    weeklyNotifications: boolean;
  };

  initUser: () => Promise<void>;
  syncSubscription: () => Promise<void>;
  updateSubscription: (plan: 'free' | SubscriptionPlan) => Promise<{ success: boolean }>;

  decrementAIChat: () => Promise<{
    success: boolean;
    remainingChats: number | 'unlimited';
    shouldUpgrade: boolean;
    suggestedPlan?: 'monthly_pro' | 'sixMonth_premium' | 'yearly_ultimate';
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
  updateAnalytics: (updates: AnalyticsUpdates) => Promise<void>;

  initializePurchases: () => Promise<void>;
  purchaseSubscription: (plan: SubscriptionPlan) => Promise<boolean>;
  restorePurchases: () => Promise<void>;

  updateNotificationSettings: (settings: {
    dailyNotifications: boolean;
    weeklyNotifications: boolean;
  }) => Promise<void>;
}

type PlanKey = keyof typeof PLAN_TO_PACKAGE_MAP;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      uid: null,
      subscription: null,
      userCode: null,
      notificationSettings: {
        dailyNotifications: true,
        weeklyNotifications: true,
      },

      initUser: async () => {
        try {
          const uid = await UserTrackingService.initAnonymousUser();
          if (uid) {
            set({ uid });
            await get().syncSubscription();
          }
        } catch (error) {
          console.error('initUser error:', error);
        }
      },

      updateSubscription: async (planId: 'free' | SubscriptionPlan) => {
        try {
          let { uid } = get();
          if (!uid) {
            await get().initUser();
            uid = get().uid;
            if (!uid) {
              throw new Error('No user ID found after initUser attempt');
            }
          }
      
          // First update Firebase
          const result = await UserTrackingService.updateUserPlan(uid, planId);
          if (!result.success) {
            throw new Error(result.message);
          }
      
          // Don't call purchaseSubscription here since it will trigger another updateSubscription
          const customerInfo = await PurchaseService.purchasePackage(planId);
          if (!customerInfo) {
            throw new Error('Purchase failed');
          }
      
          // Sync the subscription state once after purchase
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
          const updates: any = {};
          
          if (typeof changes.recordingMinutes === 'number') {
            const newMinutes = Math.max(0, subscription.features.recordingMinutes + changes.recordingMinutes);
            updates['subscription.features.recordingMinutes'] = newMinutes;
          }
          
          if (typeof changes.aiChats === 'number') {
            const newChats = Math.max(0, subscription.features.aiChatsRemaining + changes.aiChats);
            updates['subscription.features.aiChatsRemaining'] = newChats;
          }

          await updateDoc(doc(db, 'users', uid), updates);
          await get().syncSubscription();
        } catch (error) {
          console.error('updateUserLimits error:', error);
        }
      },

      getUsageRemaining: () => {
        const { subscription } = get();
        if (!subscription) {
          return { recordingMinutes: 0, aiChats: 0 };
        }
        if (subscription.plan === 'yearly_ultimate') {
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

      updateAnalytics: async (updates: AnalyticsUpdates) => {
        try {
          const { uid } = get();
          if (!uid) return;
      
          // Update analytics in Firestore
          await updateDoc(doc(db, 'users', uid), {
            analytics: updates
          });
      
          console.log('Analytics updated:', updates);
        } catch (error) {
          console.error('Error updating analytics:', error);
        }
      },
      

      decrementAIChat: async () => {
        const { subscription, uid } = get();
        if (!subscription || !uid) {
          return { success: false, remainingChats: 0, shouldUpgrade: true };
        }

        // Yearly plan has unlimited chats
        if (subscription.plan === 'yearly_ultimate') {
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
              suggestedPlan: subscription.plan === 'monthly_pro' ? 'sixMonth_premium' : 'yearly_ultimate',
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

          // Track AI chat usage
          await UserTrackingService.trackUsage(uid, { aiChatsUsed: 1 } as UsageData);

          return {
            success: true,
            remainingChats: newCount,
            shouldUpgrade: newCount < 3,
            suggestedPlan: subscription.plan === 'monthly_pro' ? 'sixMonth_premium' : 'yearly_ultimate',
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
          console.log(`Generated user code: ${code}`);
      
          // Use setDoc with merge:true to add/update userCode fields
          await setDoc(
            doc(db, 'users', uid),
            {
              userCode: code,
              userCodeCreatedAt: new Date(),
            },
            { merge: true }
          );
      
          console.log(`Successfully updated Firestore with userCode: ${code}`);
      
          // Fetch the latest user data
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log(`Firestore updated user data:`, userData);
            set({ userCode: userData.userCode }); // Update Zustand store
          } else {
            console.error('User document not found in Firestore after updating userCode.');
          }
      
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
        const daysLeft =
          7 - Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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
            if (!uid) return;
          }
      
          await PurchaseService.initialize();
          const customerInfo = await Purchases.getCustomerInfo();
          const userDoc = await getDoc(doc(db, 'users', uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const activePlan = customerInfo.activeSubscriptions[0];
            
            // Map RevenueCat plan to our plan type
            const planMapping: Record<string, SubscriptionPlan | 'free'> = {
              'monthly_pro': 'monthly_pro',
              'sixMonth_premium': 'sixMonth_premium',
              'yearly_ultimate': 'yearly_ultimate'
            };

            // Set features based on plan
            let features = {
              recordingMinutes: 60,
              aiChatsRemaining: 3,
              translationEnabled: true,
              meetingReplaysEnabled: true
            };

            if (activePlan) {
              switch (activePlan) {
                case 'monthly_pro':
                  features.recordingMinutes = 150;
                  features.aiChatsRemaining = 20;
                  break;
                case 'sixMonth_premium':
                  features.recordingMinutes = 300;
                  features.aiChatsRemaining = 40;
                  break;
                case 'yearly_ultimate':
                  features.recordingMinutes = -1;
                  features.aiChatsRemaining = -1;
                  break;
              }
            }

            // Safe date parsing function
            const parseDate = (dateStr: string | null | undefined): Date => {
              try {
                if (!dateStr) return new Date();
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? new Date() : date;
              } catch {
                return new Date();
              }
            };

            // Get the dates with proper error handling
            const startDate = customerInfo.allPurchaseDates?.[activePlan] 
              ? parseDate(customerInfo.allPurchaseDates[activePlan])
              : parseDate(userData.subscription?.startDate);

            const endDate = customerInfo.latestExpirationDate
              ? parseDate(customerInfo.latestExpirationDate)
              : userData.subscription?.endDate 
                ? parseDate(userData.subscription.endDate)
                : new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));

            const subscription = {
              plan: planMapping[activePlan] || userData.subscription?.plan || 'free',
              startDate,
              endDate,
              features
            };

            // Prepare update data while preserving existing userCode
            const updateData = {
              subscription: {
                ...subscription,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
              }
            };

            // Preserve existing userCode data if it exists
            if (userData.userCode) {
              await updateDoc(doc(db, 'users', uid), {
                ...updateData,
                userCode: userData.userCode,
                userCodeCreatedAt: userData.userCodeCreatedAt || new Date().toISOString()
              });
            } else {
              await updateDoc(doc(db, 'users', uid), updateData);
            }

            // Update local state
            set({ 
              subscription,
              userCode: userData.userCode || null
            });

            console.log('Subscription and user data synced:', {
              plan: subscription.plan,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              userCode: userData.userCode,
              daysRemaining: Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            });
          }
        } catch (error) {
          console.error('Error syncing subscription:', error);
        }
      },
      

      initializePurchases: async () => {
        await PurchaseService.initialize();
      },

      purchaseSubscription: async (plan: SubscriptionPlan) => {
        try {
          const offerings = await PurchaseService.getOfferings();
          if (!offerings) throw new Error('No offerings available');

          // Get the RevenueCat package ID for this plan
          const rcPackageId = PLAN_TO_PACKAGE_MAP[plan];
          if (!rcPackageId) throw new Error('Invalid plan ID');

          // Find the package
          const purchasePackage = offerings.availablePackages.find(
            (pkg) => pkg.identifier === rcPackageId
          );
          if (!purchasePackage) throw new Error('Package not found');

          // Pass the plan ID instead of package object
          await PurchaseService.purchasePackage(plan);
          await get().updateSubscription(plan);
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
      },

      updateNotificationSettings: async (settings) => {
        set({ notificationSettings: settings });
        await NotificationService.updateNotificationSettings(settings);
      },
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        uid: state.uid,
        subscription: state.subscription,
        userCode: state.userCode,
        notificationSettings: state.notificationSettings
      })
    }
  )
);
