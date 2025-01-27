import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActionSheetIOS,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { shareAsync } from 'expo-sharing';
import Slider from '@react-native-community/slider';

import { LinearGradient } from 'expo-linear-gradient';
import * as Calendar from 'expo-calendar';

import { useUserStore } from '../stores/useUserStore';
import { AnalyticsService } from '../services/analyticsService';
import { generateAIResponse } from '../services/aiChatService';
import { translateText } from '../services/translationService';
import { analyzeTranscription } from '../services/openaiService';
import { Recording } from '../types/recording';
import { ChatBubble } from './ChatBubble';
import MeetingReplay, { Speaker } from './MeetingReplay';
import { AnalysisResponse } from '../types/analysis';
import { FeatureName } from '../types/analytics'; // Changed this line

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface Props {
  recording: Recording;
  visible: boolean;
  onClose: () => void;
  showSubscriptionModal?: (plan: 'monthly' | 'sixMonth' | 'yearly') => void;
}

interface ChatMessage {
  speaker: string;
  message: string;
  timestamp: string;
  avatarIndex: number;
}

type ActiveTab = 'aidea' | 'transcribed' | 'ai' | 'meeting';

const PRESET_CATEGORIES = [
  { id: 'meeting', color: '#4CAF50', icon: 'people' as const },
  { id: 'note', color: '#2196F3', icon: 'document-text' as const },
  { id: 'reminder', color: '#FF9800', icon: 'alarm' as const },
  { id: 'task', color: '#9C27B0', icon: 'checkbox' as const },
  { id: 'idea', color: '#F44336', icon: 'bulb' as const },
  { id: 'personal', color: '#E91E63', icon: 'person' as const },
  { id: 'work', color: '#795548', icon: 'briefcase' as const },
  { id: 'study', color: '#009688', icon: 'school' as const },
];

const LANGUAGES = [
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
];

const TranslateButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.translateButton} onPress={onPress}>
    <View style={styles.translateButtonContent}>
      <Ionicons name="language" size={20} color="#4A90E2" />
      <Text style={styles.translateButtonText}>Translate</Text>
    </View>
  </TouchableOpacity>
);

export const RecordingDetailModal: React.FC<Props> = ({
  recording,
  visible,
  onClose,
  showSubscriptionModal
}) => {
  const { uid, decrementAIChat } = useUserStore((state) => ({
    uid: state.uid,
    decrementAIChat: state.decrementAIChat
  }));
  const [activeTab, setActiveTab] = useState<ActiveTab>('aidea');
  const [selectedCategory, setSelectedCategory] = useState(recording?.categories?.[0] || 'note');
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<null | {
    code: string;
    name: string;
    flag: string;
  }>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [meetingMessages, setMeetingMessages] = useState<Speaker[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [topicDetails, setTopicDetails] = useState<TopicDetail[]>([]);
  const [dateMentions, setDateMentions] = useState<DateMention[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: recording.transcription || 'No transcription available',
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared with activity type: ' + result.activityType);
        } else {
          console.log('Shared');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Dismissed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share the recording');
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const startTime = Date.now();
    try {
      setIsChatLoading(true);
  
      const { success, remainingChats, shouldUpgrade, suggestedPlan } = await decrementAIChat();
      
      if (!success) {
        Alert.alert(
          'AI Chat Limit Reached',
          suggestedPlan === 'yearly' 
            ? 'Upgrade to our Annual Plan for unlimited AI chats! 🚀'
            : 'Upgrade to our 6-Month Plan for more AI chats at a better value! ✨',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View Plans',
              onPress: () => showSubscriptionModal && showSubscriptionModal(suggestedPlan || 'monthly')
            }
          ]
        );
        return;
      }

      const userMsg: ChatMessage = {
        speaker: 'You',
        message: chatInput.trim(),
        timestamp: new Date().toLocaleTimeString(),
        avatarIndex: 1
      };
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
  
      const aiResponse = await generateAIResponse(chatInput, recording.transcription || '');
      const aiMsg: ChatMessage = {
        speaker: 'AI Assistant',
        message: aiResponse,
        timestamp: new Date().toLocaleTimeString(),
        avatarIndex: 0
      };
      setChatMessages(prev => [...prev, aiMsg]);
  
      if (shouldUpgrade && remainingChats !== 'unlimited') {
        Alert.alert(
          'Running Low on AI Chats',
          `You have ${remainingChats} AI chats remaining. Upgrade your plan to continue the conversation! 💭`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'View Plans',
              onPress: () => showSubscriptionModal && showSubscriptionModal(suggestedPlan || 'monthly')
            }
          ]
        );
      }

      if (uid) {
        AnalyticsService.trackFeatureUse(uid, 'aiChat', {
          messageLength: chatInput.length,
          duration: Date.now() - startTime
        });
      }
    } catch (err) {
      Alert.alert('AI Chat Error', 'Failed to get AI response');
      if (uid) {
        AnalyticsService.trackError(uid, err as Error, {
          feature: 'aiChat',
          recordingId: recording?.id
        });
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChangeTab = useCallback((tab: ActiveTab) => {
    if (uid) {
      AnalyticsService.trackFeatureUse(uid, tab as FeatureName, {
        recordingId: recording?.id,
        recordingDuration: recording?.duration
      });
    }
    setActiveTab(tab);
  }, [uid, recording]);

  const renderTabs = () => (
    <View style={styles.tabBar}>
      {[
        { id: 'aidea', title: 'AIdea', icon: '✨' },
        { id: 'transcribed', title: 'Transcribed', icon: '📝' },
        { id: 'ai', title: 'AI Assistant', icon: '🤖' },
        { id: 'meeting', title: 'Meeting Replay', icon: '🎯' }
      ].map((t) => (
        <TouchableOpacity
          key={t.id}
          style={[styles.tabItem, activeTab === t.id && styles.activeTabItem]}
          onPress={() => handleChangeTab(t.id as ActiveTab)}
        >
          <Text style={styles.tabIcon}>{t.icon}</Text>
          <Text style={[styles.tabText, activeTab === t.id && styles.activeTabText]}>
            {t.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'aidea':
        return <Text>AIdea Content</Text>;
      case 'transcribed':
        return <Text>Transcribed Content</Text>;
      case 'ai':
        return <Text>AI Assistant Content</Text>;
      case 'meeting':
        return <Text>Meeting Replay Content</Text>;
      default:
        return null;
    }
  };

  // If no recording or modal not visible
  if (!recording) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>{recording?.title || 'Recording Details'}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Tab NavBar */}
        {renderTabs()}

        {/* Tab Content */}
        {renderTabContent()}
      </View>

      {/* Share sheet if needed */}
      <ShareSheet />
    </Modal>
  );
};

/** The ShareSheet is a bottom sheet for Android to select share type. */
const ShareSheet = () => {
  const [showShareMenu, setShowShareMenu] = useState(false); 
  // For the code above to work, you might embed this in the parent or pass props.
  // Or keep the code we had that uses parent's state. This is just a stub.

  return null; // Stub so it doesn't break. Implement if needed.
};

/** Helper: produce a summary from the transcription if you want to show in share emails. */
function generateSummary(transcription: string): string {
  if (!transcription) return '';
  const sentences = transcription.split('. ');
  if (sentences.length <= 2) return transcription;
  return sentences.slice(0, 2).join('. ') + '...';
}

/** Helper: format a timestamp (in seconds) as mm:ss */
function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Helper: format duration in milliseconds to mm:ss */
function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Identify bullet point type for topic details */
function identifyPointType(point: string): 'decision' | 'action' | 'reference' | 'default' {
  const lower = point.toLowerCase();
  if (lower.includes('decided') || lower.includes('agreed')) {
    return 'decision';
  }
  if (lower.includes('will') || lower.includes('need to') || lower.includes('action')) {
    return 'action';
  }
  if (lower.includes('mentioned') || lower.includes('referenced')) {
    return 'reference';
  }
  return 'default';
}

// Interfaces for advanced features
interface TopicDetail {
  title: string;
  timeRange: string;
  summary: string;
  bulletPoints: {
    type: 'default' | 'decision' | 'action' | 'reference';
    content: string;
  }[];
  timeStart: number;
  timeEnd: number;
}

interface DateMention {
  text: string;
  startIndex: number;
  endIndex: number;
  date: Date;
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  /** Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  closeButton: {
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 16,
    flex: 1
  },
  shareButton: {
    padding: 4
  },

  /** Tab Bar */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#4B7BFF'
  },
  activeTabText: {
    color: '#4B7BFF'
  },

  /** Tab Content Container */
  tabContent: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },

  /** Category Editor Bar (Transcribed Tab) */
  categoryEditBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#fff'
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  categoryItemText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },

  /** Transcribed Card */
  transcribedCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333'
  },
  transcribedText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333'
  },
  keyPointContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  keyPointBullet: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
    width: 16,
    textAlign: 'center'
  },

  /** Chat / AI Tab */
  chatScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  noChatText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16
  },
  chatInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 8
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
  emptyChatContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyChatSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  /** Meeting Tab */
  emptyMeeting: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20
  },
  noChatSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8
  },

  /** Loading / analyzing */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center'
  },

  /** Translation */
  translateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignSelf: 'flex-start',
    marginBottom: 12
  },
  translateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  translateButtonText: {
    marginLeft: 6,
    fontSize: 15,
    color: '#4A90E2',
    fontWeight: '600'
  },
  translationWrapper: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  translationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  translationFlag: {
    fontSize: 20,
    marginRight: 6
  },
  translationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333'
  },
  closeTranslationButton: {
    padding: 4
  },
  translatedTextContainer: {
    maxHeight: 200,
    padding: 12
  },
  translatedText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333'
  },

  /** Topic timeline in AIdea tab */
  topicTimeline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topicSection: {
    marginBottom: 28,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    marginBottom: 16,
  },
  bulletPointsContainer: {
    gap: 12,
    paddingLeft: 8,
  },
  bulletPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletIcon: {
    fontSize: 16,
    color: '#666',
    marginRight: 12,
    width: 16,
    textAlign: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },

  // Audio Player Styles
  audioPlayerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4B7BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#4B7BFF',
    borderRadius: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  }
});

