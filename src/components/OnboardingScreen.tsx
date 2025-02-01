import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../stores/useUserStore';
import * as Haptics from 'expo-haptics';

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

  const handleStartTrial = async () => {
    try {
      const planId = selectedPlan.replace('free_trial_', '') as TrialPlanId;
      const success = await purchaseSubscription(planId);
      if (success) {
        Alert.alert(
          'Welcome to AIdeaVoice! 🎉',
          'Your free trial has started. Enjoy all premium features!'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start trial');
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
            style={styles.startTrialButton}
            onPress={handleStartTrial}
          >
            <Text style={styles.startTrialText}>Start Free Trial</Text>
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
    padding: 20,
    gap: 16
  },
  planCard: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  selectedPlan: {
    transform: [{ scale: 1.02 }]
  },
  planGradient: {
    padding: 20,
    alignItems: 'center'
  },
  planIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  planPrice: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4
  },
  trialText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)'
  },
  savingsText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4
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
  }
});