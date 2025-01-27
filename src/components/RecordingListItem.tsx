import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Share, 
  Platform, 
  NativeModules, 
  Alert, 
  Animated, 
  Modal,
  ActionSheetIOS,
  StatusBar,
  SafeAreaView,
  PanResponder,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Recording } from '../types/recording';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

interface Props {
  recording: Recording;
  onDelete: (id: string) => void;
  onPress: () => void;
}

interface PlaybackState {
  position: number;
  duration: number;
  playbackRate: 0.5 | 1.0 | 1.5 | 2.0;
}

const snapPoints = ['30%', '50%'];

export const RecordingListItem: React.FC<Props> = ({ recording, onDelete, onPress }) => {
  const swipeableRef = useRef<Swipeable>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    position: 0,
    duration: 0,
    playbackRate: 1.0
  });
  const [showPlaybackControls, setShowPlaybackControls] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<0.5 | 1.0 | 1.5 | 2.0>(1.0);
  const translateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const handlePlaybackRateChange = async (rate: 0.5 | 1.0 | 1.5 | 2.0) => {
    if (sound) {
      await sound.setRateAsync(rate, true);
      setPlaybackState(prev => ({ ...prev, playbackRate: rate }));
      setPlaybackRate(rate);
    }
  };

  const getDeviceLocale = () => {
    try {
      if (Platform.OS === 'ios') {
        return (
          NativeModules.SettingsManager?.settings?.AppleLocale?.replace('_', '-') ||
          NativeModules.SettingsManager?.settings?.AppleLanguages[0] ||
          'en-US'
        );
      } else {
        return NativeModules.I18nManager?.localeIdentifier?.replace('_', '-') || 'en-US';
      }
    } catch (error) {
      return 'en-US';
    }
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const formatDate = (timestamp: string | number) => {
    try {
      // Handle both string and number timestamp formats
      const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(Number(timestamp));
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Date unavailable';
      }
  
      // Use standard locale format with hyphen instead of underscore
      const locale = getDeviceLocale().replace('_', '-');
      
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      // Fallback to basic date formatting if locale fails
      try {
        const date = new Date(timestamp);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      } catch {
        return 'Date unavailable';
      }
    }
  };

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const showPlayer = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const hidePlayer = () => {
    Animated.spring(translateY, {
      toValue: Dimensions.get('window').height,
      useNativeDriver: true,
    }).start(() => setShowPlaybackControls(false));
  };

  const handlePlay = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowPlaybackControls(true);
      showPlayer();

      // Stop existing playback if any
      if (isPlaying && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setShowPlaybackControls(false);
        return;
      }

      // Configure audio mode for speaker playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false // Forces speaker output
      });

      // Create and play sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { 
          shouldPlay: true,
          volume: 1.0,
          progressUpdateIntervalMillis: 100,
          androidImplementation: 'MediaPlayer',
          isMuted: false,
        }
      );

      // Enable playback through speaker
      await newSound.setStatusAsync({
        volume: 1.0
      });

      setSound(newSound);
      setIsPlaying(true);
      setShowPlaybackControls(true);

      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded) {
          setPlaybackState({
            position: status.positionMillis,
            duration: status.durationMillis || 0,
            playbackRate: playbackState.playbackRate
          });
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            newSound.unloadAsync();
            setSound(null);
            setShowPlaybackControls(false);
          }
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
    }
  };

  const handleShare = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        url: recording.uri,
        message: recording.transcription || 'Voice Recording',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(recording.id);
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-130, -50, 0],
      outputRange: [1, 0.95, 0.9],
      extrapolate: 'extend',
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'extend',
    });

    return (
      <View style={styles.swipeActions}>
        <Animated.View 
          style={[
            styles.swipeActionContainer,
            {
              transform: [{ scale }],
              opacity
            }
          ]}
        >
          <RectButton 
            style={[styles.swipeAction, styles.shareAction]}
            onPress={() => {
              handleShare();
              swipeableRef.current?.close();
            }}
          >
            <Ionicons name="share-outline" size={28} color="#fff" />
          </RectButton>
          <RectButton 
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={() => {
              handleDelete();
              swipeableRef.current?.close();
            }}
          >
            <Ionicons name="trash-outline" size={28} color="#fff" />
          </RectButton>
        </Animated.View>
      </View>
    );
  };

  // Add this helper function to safely get the visuals for a recording
  const getRecordingVisuals = (recording: Recording) => {
    // Default visuals
    let emoji = '🎙️';
    let bgColor = '#E8F5E9';

    // Safely check if categories exist and has items
    const firstCategory = Array.isArray(recording.categories) && 
      recording.categories.length > 0 && 
      typeof recording.categories[0] === 'string' ? 
      recording.categories[0].toLowerCase() : 
      null;
    
    if (firstCategory) {
      switch (firstCategory) {
        case 'meeting':
          return { emoji: '👥', bgColor: '#E8F5E9' }; // Soft green
        case 'note':
          return { emoji: '📝', bgColor: '#E1F5FE' }; // Soft blue
        case 'reminder':
          return { emoji: '⏰', bgColor: '#FFF3E0' }; // Soft orange
        case 'task':
          return { emoji: '✓', bgColor: '#F3E5F5' }; // Soft purple
        case 'idea':
          return { emoji: '💡', bgColor: '#FFEBEE' }; // Soft red
        case 'personal':
          return { emoji: '👤', bgColor: '#FCE4EC' }; // Soft pink
        case 'work':
          return { emoji: '💼', bgColor: '#EFEBE9' }; // Soft brown
        case 'study':
          return { emoji: '📚', bgColor: '#E0F2F1' }; // Soft teal
      }
    }

    // If no valid category, try to determine from content
    if (recording.transcription) {
      const text = recording.transcription.toLowerCase();
      if (text.includes('meeting') || text.includes('discussion')) {
        return { emoji: '👥', bgColor: '#E8F5E9' };
      }
      if (text.includes('reminder') || text.includes('don\'t forget')) {
        return { emoji: '⏰', bgColor: '#FFF3E0' };
      }
      if (text.includes('idea') || text.includes('thought')) {
        return { emoji: '💡', bgColor: '#FFEBEE' };
      }
    }

    return { emoji, bgColor };
  };

  // Add the playback control UI
  const renderPlaybackControls = () => {
    if (!showPlaybackControls) return null;

    return (
      <Modal
        transparent={true}
        visible={showPlaybackControls}
        animationType="none"
        onRequestClose={() => hidePlayer()}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.dismissArea} 
            onPress={hidePlayer}
          />
          <Animated.View
            style={[
              styles.playerContainer,
              {
                transform: [{ translateY }]
              }
            ]}
          >
            <View style={styles.playerContent}>
              <SafeAreaView style={styles.playbackControlsContainer}>
                <View style={styles.playbackHeader}>
                  <Text style={styles.playbackTitle} numberOfLines={1}>
                    {recording.title || 'Recording'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.speedButton}
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        ActionSheetIOS.showActionSheetWithOptions(
                          {
                            options: ['Cancel', '0.5x', '1.0x', '1.5x', '2.0x'],
                            cancelButtonIndex: 0,
                          },
                          (buttonIndex) => {
                            if (buttonIndex !== 0) {
                              const speeds: (0.5 | 1.0 | 1.5 | 2.0)[] = [0.5, 1.0, 1.5, 2.0];
                              handlePlaybackRateChange(speeds[buttonIndex - 1]);
                            }
                          }
                        );
                      }
                    }}
                  >
                    <Text style={styles.speedButtonText}>{playbackRate}x</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.progressContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={playbackState.duration}
                    value={playbackState.position}
                    onSlidingComplete={async (value) => {
                      if (sound) {
                        await sound.setPositionAsync(value);
                      }
                    }}
                    minimumTrackTintColor="#4B7BFF"
                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                    thumbTintColor="#4B7BFF"
                  />
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                      {formatDuration(playbackState.position)}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatDuration(playbackState.duration)}
                    </Text>
                  </View>
                </View>

                <View style={styles.controlsSection}>
                  <TouchableOpacity onPress={handlePlay} style={styles.primaryButton}>
                    <Ionicons 
                      name={isPlaying ? 'pause' : 'play'} 
                      size={32} 
                      color="#FFF" 
                    />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={3}
        rightThreshold={50}
        overshootRight={false}
        enableTrackpadTwoFingerGesture
        containerStyle={styles.swipeableContainer}
      >
        <TouchableOpacity onPress={onPress} style={styles.container}>
          <View style={styles.headerSection}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: getRecordingVisuals(recording).bgColor }
            ]}>
              <Text style={styles.emoji}>
                {getRecordingVisuals(recording).emoji}
              </Text>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {recording.title || 'Untitled Recording'}
              </Text>
              <Text style={styles.date}>
                {formatDate(recording.timestamp)}
              </Text>
            </View>
          </View>

          {recording.transcription && (
            <Text style={styles.transcription} numberOfLines={2}>
              {recording.transcription}
            </Text>
          )}

          <View style={styles.footer}>
            <View style={styles.categories}>
              {(recording.categories || ['General']).map((category, index) => {
                const safeCategory = typeof category === 'string' ? category : 'General';
                return (
                  <View 
                    key={`${safeCategory}-${index}`} 
                    style={[
                      styles.categoryTag,
                      { backgroundColor: `${getCategoryColor(safeCategory)}20` }
                    ]}
                  >
                    <Text style={[
                      styles.categoryText,
                      { color: getCategoryColor(safeCategory) }
                    ]}>
                      {safeCategory.charAt(0).toUpperCase() + safeCategory.slice(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.controlsContainer}>
              <TouchableOpacity onPress={handlePlay} style={styles.playButton}>
                <Ionicons 
                  name={isPlaying ? 'pause-circle' : 'play-circle'} 
                  size={32} 
                  color="#4B7BFF" 
                />
              </TouchableOpacity>
              <Text style={styles.duration}>
                {formatDuration(recording.duration)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
      {renderPlaybackControls()}
    </>
  );
};

// Add helper functions
const getCategoryColor = (category?: string): string => {
  const categoryColors: Record<string, string> = {
    meeting: '#4CAF50',
    note: '#2196F3',
    reminder: '#FF9800',
    task: '#9C27B0',
    idea: '#F44336',
    personal: '#E91E63',
    work: '#795548',
    study: '#009688'
  };
  return categoryColors[category || 'note'] || '#2196F3';
};

const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
  const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    meeting: 'people',
    note: 'document-text',
    reminder: 'alarm',
    task: 'checkbox',
    idea: 'bulb',
    personal: 'person',
    work: 'briefcase',
    study: 'school'
  };
  return categoryIcons[category || 'note'] || 'document-text';
};

// Update styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  transcription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categories: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    padding: 4,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  swipeActions: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  swipeActionContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  swipeAction: {
    width: 75,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginHorizontal: 2,
  },
  shareAction: {
    backgroundColor: '#2196F3',
  },
  deleteAction: {
    backgroundColor: '#F44336',
  },
  swipeableContainer: {
    backgroundColor: 'transparent',
  },
  emoji: {
    fontSize: 24,
  },
  bottomSheetIndicator: {
    backgroundColor: '#FFF',
    width: 40,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  primaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4B7BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dismissArea: {
    flex: 1,
  },
  playerContainer: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  playerContent: {
    width: '100%',
  },
  playbackControlsContainer: {
    backgroundColor: 'transparent',
    padding: 20,
  },
  playbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  playbackTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    marginRight: 16,
  },
  speedButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  speedButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#FFF',
    fontSize: 14,
  }
});