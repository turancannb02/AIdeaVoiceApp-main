// src/components/SettingsModal.tsx

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../stores/useUserStore';
import { UserTrackingService } from 'src/services/userTrackingService';

/* ------------------------------------------------------------------
   1) Days Remaining
------------------------------------------------------------------- */
const getDaysRemaining = (endDate?: Date) => {
  if (!endDate) return 0;
  const now = new Date();
  const end = new Date(endDate);
  return Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
};

/* ------------------------------------------------------------------
   2) Plan Confirmation Modal with onNavigateHome
------------------------------------------------------------------- */
interface PlanConfirmationProps {
  visible: boolean;
  onClose: () => void;
  plan: string | null;
  onNavigateHome: () => void; // forward user to main screen
}

const PlanConfirmationModal: React.FC<PlanConfirmationProps> = ({
  visible,
  onClose,
  plan,
  onNavigateHome
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const planName = (() => {
    switch (plan) {
      case 'monthly':  return 'Monthly Plan ⭐️';
      case 'sixMonth': return '6 Months Plan ✨';
      case 'yearly':   return 'Annual Plan 💎';
      default:         return 'Free Trial 🎁';
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.confirmationOverlay}>
        <Animated.View
          style={[
            styles.confirmationCard,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#6B9FFF', '#4B7BFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.confirmationGradient}
          >
            <View style={styles.confirmationContent}>
              <View style={styles.celebrationIcon}>
                <Text style={{ fontSize: 40 }}>🎉</Text>
              </View>
              <Text style={styles.confirmationTitle}>Congratulations!</Text>
              <Text style={styles.confirmationSubtitle}>
                Welcome to {planName}
              </Text>
              <TouchableOpacity
                style={styles.confirmationButton}
                onPress={() => {
                  onClose();
                  onNavigateHome(); // Return to main screen
                }}
              >
                <Text style={styles.confirmationButtonText}>Start Exploring</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ------------------------------------------------------------------
   3) Usage Stats Card for “All Time Usage”
   Shown between the welcome card & “Current Plan”
------------------------------------------------------------------- */
const UsageStatsCard = () => {
  const { subscription, uid } = useUserStore(); // Get uid from store
  const { getUserStats } = UserTrackingService;
  const [usageStats, setUsageStats] = useState({
    totalMinutes: 0,
    totalAiChats: 0
  });

  // Fetch total usage stats when component mounts
  useEffect(() => {
    const fetchStats = async () => {
      if (!uid) return; // Check uid instead of subscription.uid
      try {
        const stats = await getUserStats(uid);
        setUsageStats({
          totalMinutes: stats.totalMinutes || 0,
          totalAiChats: stats.totalAiChats || 0
        });
      } catch (error) {
        console.error('Error fetching usage stats:', error);
      }
    };
    
    fetchStats();
  }, [uid]);

  return (
    <View style={styles.usageStatsCard}>
      <LinearGradient
        colors={['#FFF5F0', '#FFEBE6']}
        style={styles.usageStatsGradient}
      >
        <Text style={styles.usageStatsTitle}>All Time Usage 📊</Text>
        <View style={styles.usageStatsRow}>
          <View style={styles.usageStatsItem}>
            <View style={[styles.usageIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.usageEmoji}>🎙️</Text>
            </View>
            <View>
              <Text style={styles.usageValue}>
                {usageStats.totalMinutes} min
              </Text>
              <Text style={styles.usageStatsLabel}>Total Recording Time</Text>
            </View>
          </View>
          <View style={styles.usageStatsItem}>
            <View style={[styles.usageIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.usageEmoji}>🤖</Text>
            </View>
            <View>
              <Text style={styles.usageValue}>
                {usageStats.totalAiChats}
              </Text>
              <Text style={styles.usageStatsLabel}>Total AI Chats Used</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

/* ------------------------------------------------------------------
   4) Plans with Checkmarks (existing)
------------------------------------------------------------------- */
const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    icon: '⭐️',
    bg: '#E8F5E9',
    price: '€9.99 / month',
    features: [
      { text: '150 min of transcription / month', bold: true },
      { text: '20 AI Chats / month', bold: true },
      { text: 'Unlimited translations & replays', bold: true },
      { text: 'Billed monthly', bold: true }
    ]
  },
  {
    id: 'sixMonth',
    name: '6-Month Plan',
    icon: '✨',
    bg: '#FFF3E0',
    price: '€44.99 / 6 months',
    features: [
      { text: '200 min of transcription / month', bold: true },
      { text: '40 AI Chats / month', bold: true },
      { text: 'Unlimited translations & replays', bold: true },
      { text: 'Save ~25% vs. Monthly', bold: true }
    ]
  },
  {
    id: 'yearly',
    name: 'Annual Plan',
    icon: '💎',
    bg: '#F3E5F5',
    price: '€79.99 / year',
    features: [
      { text: 'Unlimited transcriptions', bold: true },
      { text: 'Unlimited AI Chats', bold: true },
      { text: 'Unlimited translations & replays', bold: true },
      { text: 'Save ~33% vs. Monthly', bold: true }
    ]
  }
];

/* ------------------------------------------------------------------
   5) Main SettingsModal
------------------------------------------------------------------- */
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { subscription, updateSubscription } = useUserStore();
  
  const handlePlanSelect = useCallback(
    async (planId: 'monthly' | 'sixMonth' | 'yearly') => {
      try {
        if (Platform.OS === 'ios') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        Alert.alert(
          'Change Plan',
          'Are you sure you want to switch to this plan?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm', 
              onPress: async () => {
                try {
                  const { success } = await updateSubscription(planId);
                  if (success) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowPlanConfirmation(true);
                  } else {
                    Alert.alert('Error', 'Failed to update subscription');
                  }
                } catch (err) {
                  console.error('Error updating subscription:', err);
                  Alert.alert('Error', 'Failed to update subscription.');
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error('handlePlanSelect error:', error);
      }
    },
    [updateSubscription]
  );

  // Add useEffect to sync subscription when modal opens
  useEffect(() => {
    if (visible) {
      // Add your sync logic here if needed
    }
  }, [visible]);

  const [showPlanConfirmation, setShowPlanConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Current Plan info
  const planInfo = (() => {
    switch (subscription?.plan) {
      case 'monthly':  return { name: 'Monthly Plan ⭐️', color: '#4B7BFF' };
      case 'sixMonth': return { name: '6 Months Plan ✨', color: '#FF9500' };
      case 'yearly':   return { name: 'Annual Plan 💎', color: '#4CAF50' };
      default:         return { name: 'Free Trial 🎁', color: '#FF6B98' };
    }
  })();

  // If yearly, we just show "Unlimited" in usage
  const navigateHome = () => {
    onClose(); // you can do more logic if needed
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="chevron-down" size={28} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>Settings & Plans</Text>
          </View>

          <ScrollView style={styles.content}>
            {/* (A) Welcome Card */}
            <View style={styles.welcomeSection}>
              <LinearGradient
                colors={['#6B9FFF', '#4B7BFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.welcomeGradient}
              >
                <View style={styles.welcomeContent}>
                  <View style={styles.welcomeIcon}>
                    <Text style={{ fontSize: 28 }}>⚙️</Text>
                  </View>
                  <Text style={styles.welcomeTitle}>Settings & Plans</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Manage your preferences and subscription features
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* (B) All Time Usage */}
            <UsageStatsCard />

            {/* (C) Current Plan */}
            <Text style={styles.sectionTitle}>Current Plan</Text>
            <View style={styles.currentPlanCard}>
              <View style={styles.planHeader}>
                <Text style={[styles.currentPlanName, { color: planInfo.color }]}>
                  {planInfo.name}
                </Text>
                <Text style={styles.daysRemaining}>
                  {getDaysRemaining(subscription?.endDate)} days remaining
                </Text>
              </View>

              <View style={styles.usageStats}>
                <View style={styles.usageItem}>
                  <Ionicons name="mic-outline" size={24} color={planInfo.color} />
                  <View style={styles.usageInfo}>
                    <Text style={styles.usageLabel}>Recording Minutes</Text>
                    <Text style={styles.usageValue}>
                      {/* If yearly => "Unlimited", else numeric from subscription.features */}
                      {subscription?.plan === 'yearly'
                        ? 'Unlimited'
                        : subscription?.features?.recordingMinutes ?? 0} remaining
                    </Text>
                  </View>
                </View>
                <View style={styles.usageItem}>
                  <Ionicons name="chatbubbles-outline" size={24} color={planInfo.color} />
                  <View style={styles.usageInfo}>
                    <Text style={styles.usageLabel}>AI Analysis Chats</Text>
                    <Text style={styles.usageValue}>
                      {subscription?.plan === 'yearly'
                        ? 'Unlimited'
                        : subscription?.features?.aiChatsRemaining ?? 0} remaining
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* (D) Available Plans */}
            <View style={styles.plansSection}>
              <LinearGradient
                colors={['#F5F9FF', '#E3F2FD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.plansGradient}
              >
                <Text style={styles.plansSectionTitle}>Enhance Your Experience 🚀</Text>
                <Text style={styles.plansSectionSubtitle}>
                  Unlock more features and boost productivity
                </Text>

                {SUBSCRIPTION_PLANS.map(plan => (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard,
                      subscription?.plan === plan.id && styles.activePlanCard
                    ]}
                  >
                    {/* Icon */}
                    <View style={[styles.planIconContainer, { backgroundColor: plan.bg }]}>
                      <Text style={styles.planIcon}>{plan.icon}</Text>
                    </View>
                    <View style={styles.planDetails}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPrice}>{plan.price}</Text>

                      {/* Feature lines */}
                      {plan.features.map((feat, idx) => (
                        <View key={idx} style={styles.featureLine}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text
                            style={[
                              styles.featureLineText,
                              feat.bold && styles.boldFeatureText
                            ]}
                          >
                            {feat.text}
                          </Text>
                        </View>
                      ))}

                      <TouchableOpacity
                        style={styles.selectPlanButton}
                        onPress={() => handlePlanSelect(plan.id as any)}
                      >
                        <Text style={styles.selectPlanButtonText}>Choose</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </LinearGradient>
            </View>
           
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* (F) Confirmation Modal */}
      <PlanConfirmationModal
        visible={showPlanConfirmation}
        onClose={() => setShowPlanConfirmation(false)}
        plan={selectedPlan}
        onNavigateHome={navigateHome}
      />
    </>
  );
};

/* ------------------------------------------------------------------
   6) Styles
------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    padding: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  content: {
    flex: 1
  },

  // smaller hero
  welcomeSection: {
    marginBottom: 20
  },
  welcomeGradient: {
    borderRadius: 16,
    marginHorizontal: 20,
    overflow: 'hidden'
  },
  welcomeContent: {
    padding: 16,
    alignItems: 'center'
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center'
  },

  // Usage Stats ("All Time Usage")
  usageStatsCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  usageStatsGradient: {
    padding: 16
  },
  usageStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  usageStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  usageStatsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  usageStatsLabel: {
    fontSize: 14,
    color: '#666'
  },
  usageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  usageEmoji: {
    fontSize: 20,
  },
  usageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#444',
    textAlign: 'auto',
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 12
  },
  currentPlanCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8
      },
      android: {
        elevation: 4
      }
    })
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '700'
  },
  daysRemaining: {
    fontSize: 14,
    color: '#666'
  },
  usageStats: {
    marginTop: 8,
    gap: 16
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  usageInfo: {
    flex: 1
  },
  usageLabel: {
    fontSize: 14,
    color: '#666'
  },

  plansSection: {
    marginBottom: 32
  },
  plansGradient: {
    padding: 24,
    borderRadius: 20,
    marginHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4
      },
      android: {
        elevation: 2
      }
    })
  },
  plansSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center'
  },
  plansSectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  planCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8
      },
      android: {
        elevation: 4
      }
    })
  },
  activePlanCard: {
    borderWidth: 2,
    borderColor: '#4B7BFF'
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  planIcon: {
    fontSize: 24
  },
  planDetails: {
    flex: 1
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  planPrice: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 8
  },
  featureLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6
  },
  featureLineText: {
    fontSize: 14,
    color: '#666'
  },
  boldFeatureText: {
    fontWeight: '700',
    color: '#333'
  },
  selectPlanButton: {
    backgroundColor: '#4B7BFF',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start'
  },
  selectPlanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    textAlign: 'center'
  },

  // Confirmation
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  confirmationCard: {
    width: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12
      },
      android: {
        elevation: 8
      }
    })
  },
  confirmationGradient: {
    padding: 24
  },
  confirmationContent: {
    alignItems: 'center'
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24
  },
  confirmationButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20
  },
  confirmationButtonText: {
    color: '#4B7BFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
