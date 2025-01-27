// App.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAudioRecorder } from './hooks/useAudioRecorder';
import { RecordingFilters } from './components/RecordingFilters';
import { RecordingDetailModal } from './components/RecordingDetailModal';
import { SplashScreen } from './components/SplashScreen';
import { RecordingModal } from './components/RecordingModal';
import { useRecordingStore } from './stores/useRecordingStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RecordingsList } from './components/RecordingsList';
import { FloatingActionButton } from './components/FloatingActionButton';
import { useUserStore } from './stores/useUserStore';
import { RevenueService } from './services/revenueService';

/* --------------------------------------------------------
   A) Premium Badge below header text
-------------------------------------------------------- */
const PremiumBadge = () => {
  const { subscription } = useUserStore();

  // Badge config for all plans including free trial
  const badgeConfig = (() => {
    switch (subscription?.plan) {
      case 'monthly':
        return { 
          emoji: '⭐️', 
          label: 'Pro Member', 
          gradientStart: '#6B9FFF', 
          gradientEnd: '#4B7BFF' 
        };
      case 'sixMonth':
        return { 
          emoji: '✨', 
          label: 'Premium Member', 
          gradientStart: '#FFA726', 
          gradientEnd: '#FB8C00' 
        };
      case 'yearly':
        return { 
          emoji: '💎', 
          label: 'Ultimate Member', 
          gradientStart: '#66BB6A', 
          gradientEnd: '#4CAF50' 
        };
      default:
        // Free Trial Badge
        return { 
          emoji: '🎁', 
          label: 'Free Trial', 
          gradientStart: '#FF6B98', // Soft pink start
          gradientEnd: '#FF4081'    // Vibrant pink end
        };
    }
  })();

  return (
    <View style={styles.premiumBadgeContainer}>
      <LinearGradient
        colors={[badgeConfig.gradientStart, badgeConfig.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumBadgeGradient}
      >
        <View style={styles.premiumBadgeContent}>
          <Text style={styles.premiumBadgeEmoji}>{badgeConfig.emoji}</Text>
          <Text style={styles.premiumBadgeLabel}>{badgeConfig.label}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { recordings, selectedFilter, setSelectedFilter, selectedRecording, setSelectedRecording, refreshRecordings, loadRecordings } = useRecordingStore();
  const { syncSubscription } = useUserStore();

  useEffect(() => {
    loadRecordings();
  }, []);

  const { 
    startRecording, 
    stopRecording, 
    recordingState, 
    audioLevel, 
    recordingDuration 
  } = useAudioRecorder();

  const formatDuration = useCallback((duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Gather categories from recordings
  const uniqueCategories = useMemo(() => {
    const categories = recordings.flatMap(r => r.categories || []);
    return [...new Set(categories)];
  }, [recordings]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Sync subscription data with Firebase
      await syncSubscription();
      
      // Refresh recordings
      await refreshRecordings();
      
      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshRecordings, syncSubscription]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
      <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F44336"
              colors={['#F44336', '#2196F3', '#4CAF50']}
              progressBackgroundColor="#ffffff"
              title={`Version ${Constants.expoConfig?.version}`}
              titleColor="#666666"
            />
          }
        >
          <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>Welcome to AIdeaVoice ✨</Text>
              <Text style={styles.subtitle}>
                Transform your voice into organized thoughts 💭
              </Text>
            </View>

            {/* Premium Badge - Now between header and filters */}
            <View style={styles.premiumBadgeContainer}>
              <PremiumBadge />
            </View>

            {/* Recording Filters */}
            <RecordingFilters
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
              categories={uniqueCategories}
            />

            {/* Voice Notes */}
            <View style={styles.recordingsHeader}>
              <Text style={styles.sectionTitle}>Your Voice Notes 🗣️</Text>
            </View>
            <RecordingsList />

            {/* Recording Modal */}
            <RecordingModal
              visible={recordingState !== 'idle'}
              onClose={stopRecording}
              audioLevel={audioLevel}
              recordingDuration={recordingDuration}
              recordingState={recordingState}
              formatDuration={formatDuration}
            />

            {/* Recording Detail */}
            {selectedRecording && (
              <RecordingDetailModal
                recording={selectedRecording}
                visible={!!selectedRecording}
                onClose={() => setSelectedRecording(null)}
              />
            )}
          </SafeAreaView>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtonsContainer}>
          <FloatingActionButton />
          <TouchableOpacity
            style={styles.startButton}
            onPress={startRecording}
            disabled={recordingState !== 'idle'}
          >
            <Text style={styles.buttonText}>Start AIdeaVoice 🎙</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ErrorBoundary>
  );
}

// --------------
// Styles
// --------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollView: {
    flex: 1
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 100 // room for bottom buttons
  },
  header: {
    marginTop: 16,
    marginBottom: 16 // Reduced from 24 to 16
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24
  },
  premiumBadgeContainer: {
    marginVertical: 1,
    marginHorizontal: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recordingsHeader: {
    marginBottom: 12,
    paddingHorizontal: 4
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333'
  },
  bottomButtonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    gap: 80
  },
  startButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 16
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },

  // Premium Badge
  premiumBadgeGradient: {
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 120, // Ensure minimum width for better appearance
  },
  premiumBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content horizontally
    gap: 8,
  },
  premiumBadgeEmoji: {
    fontSize: 12,
  },
  premiumBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
  }
});

// Main export
export default function App() {
  const initUser = useUserStore(state => state.initUser);

  useEffect(() => {
    const initialize = async () => {
      await initUser();
      await RevenueService.initialize();
    };
    
    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
