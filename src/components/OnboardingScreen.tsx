import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform,
  ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../stores/useUserStore';
import * as Haptics from 'expo-haptics';
import PurchaseService from '../services/purchaseService';

const FEATURES = [
  {
    icon: '⚡️',
    title: 'Start Instantly',
    description: 'No sign up required, just start recording',
    bgColor: '#E3F2FD'
  },     
  {
    icon: '🎙️',
    title: 'Unlimited AI Note-Taking',
    description: 'Record and transcribe without limits',
    bgColor: '#E8F5E9'
  },
  {
    icon: '🤖',
    title: 'Interactive AI Chat',
    description: 'Chat with your notes and recordings',
    bgColor: '#E1F5FE'
  },
  {
    icon: '⚡',
    title: 'Priority AI Access',
    description: 'Top-tier AI models for better results',
    bgColor: '#FFF3E0'
  },
  {
     icon: '🔒',
     title: 'Private & Secure',
     description: 'Anonymous usage, your data stays private',
     bgColor: '#FFF3E0'
   }
];

interface PlanInfo {
  id: string;
  name: string;
  price: string;
  trial: string;
  icon: string;
  savings?: string;
}

interface PlanGradient {
  gradient: [string, string];
}

const TRIAL_PLANS: (PlanInfo & PlanGradient)[] = [
  {
    id: 'free_trial_monthly_pro',
    name: 'Pro Plan',
    price: '€9.99/month',
    trial: '7 days free',
    icon: '⭐️',
    gradient: ['#6B9FFF', '#4B7BFF'] as [string, string]
  },
  {
    id: 'free_trial_sixMonth_premium',
    name: 'Premium Plan',
    price: '€44.99/6 months',
    trial: '7 days free',
    savings: 'Save 25%',
    icon: '✨',
    gradient: ['#FFA726', '#FB8C00'] as [string, string]
  },
  {
    id: 'free_trial_yearly_ultimate',
    name: 'Ultimate Plan',
    price: '€79.99/year',
    trial: '7 days free',
    savings: 'Save 33%',
    icon: '💎',
    gradient: ['#66BB6A', '#4CAF50'] as [string, string]
  }
];

type TrialPlanId = 'monthly_pro' | 'sixMonth_premium' | 'yearly_ultimate';

export const OnboardingScreen = () => {
  const [selectedPlan, setSelectedPlan] = useState<'free_trial_monthly_pro' | 'free_trial_sixMonth_premium' | 'free_trial_yearly_ultimate'>('free_trial_yearly_ultimate');
  const { purchaseSubscription, restorePurchases } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleStartTrial = async () => {
    try {
      setIsLoading(true);
      const result = await PurchaseService.showPaywall();
      if (result.success) {
        Alert.alert(
          'Welcome to AIdeaVoice! 🎉',
          'Your subscription has started. Enjoy all premium features!'
        );
      }
    } catch (error) {
      console.error('Paywall error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert('Success', 'Purchases restored!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases');
    }
  };

  return (
    <View style={styles.container}>
      {/* Add close button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => setShowOnboarding(false)}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView style={styles.content}>
        {/* Header */}
        <LinearGradient
          colors={['#6B9FFF', '#4B7BFF']}
          style={styles.header}
        >
          <Text style={styles.title}>Try 7 Days Free 🎁</Text>
          <Text style={styles.subtitle}>
            Perfect notes you can trust, without lifting a finger
          </Text>
        </LinearGradient>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={[styles.iconContainer, { backgroundColor: feature.bgColor }]}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {TRIAL_PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.selectedPlan
              ]}
              onPress={() => setSelectedPlan(plan.id as typeof selectedPlan)}
            >
              <LinearGradient
                colors={plan.gradient}
                style={styles.planGradient}
              >
                <Text style={styles.planIcon}>{plan.icon}</Text>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.trialText}>{plan.trial}</Text>
                {plan.savings && (
                  <Text style={styles.savingsText}>{plan.savings}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.startTrialButton,
              isLoading && styles.startTrialButtonDisabled
            ]}
            onPress={handleStartTrial}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.startTrialText}>Start Free Trial</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
          >
            <Text style={styles.restoreText}>Restore Purchase</Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <TouchableOpacity>
              <Text style={styles.termsText}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={styles.termsDivider}>•</Text>
            <TouchableOpacity>
              <Text style={styles.termsText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24
  },
  featuresContainer: {
    padding: 20,
    gap: 16
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  featureIcon: {
    fontSize: 24
  },
  featureContent: {
    flex: 1
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  featureDescription: {
    fontSize: 14,
    color: '#666'
  },
  plansContainer: {
    padding: 16,
    flexDirection: 'row', // Change to row layout
    gap: 8, // Reduce gap between cards
  },
  planCard: {
    flex: 1, // Each card takes equal width
    borderRadius: 12, // Slightly smaller radius
    overflow: 'hidden',
    maxWidth: '32%', // Limit width to fit three cards
  },
  selectedPlan: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  planGradient: {
    padding: 12, // Reduce padding
    alignItems: 'center',
    minHeight: 140, // Set minimum height
  },
  planIcon: {
    fontSize: 24, // Smaller icon
    marginBottom: 4,
  },
  planName: {
    fontSize: 14, // Smaller font
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  planPrice: {
    fontSize: 13, // Smaller font
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  trialText: {
    fontSize: 12, // Smaller font
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  savingsText: {
    fontSize: 11, // Smaller font
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionButtons: {
    padding: 20,
    gap: 16
  },
  startTrialButton: {
    backgroundColor: '#4B7BFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  startTrialButtonDisabled: {
    opacity: 0.7
  },
  startTrialText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  restoreText: {
    color: '#4B7BFF',
    fontSize: 16,
    fontWeight: '600'
  },
  termsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  termsText: {
    color: '#666',
    fontSize: 14
  },
  termsDivider: {
    color: '#666'
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  }
});