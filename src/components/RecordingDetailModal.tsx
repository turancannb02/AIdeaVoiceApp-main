import React, { useState, useEffect, useRef } from 'react';
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

import { Recording } from '../types/recording';
import { useRecordingStore } from '../stores/useRecordingStore';
import { useUserStore } from '../stores/useUserStore';
import { translateText } from '../services/translationService';
import { generateAIResponse } from '../services/aiChatService';
import { analyzeTranscription } from '../services/openaiService';

import { ChatBubble } from './ChatBubble';
import MeetingReplay, { Speaker } from './MeetingReplay';

import { useAudioRecorder } from '../hooks/useAudioRecorder';
// import { parseSpeakers } from '../utils/meetingParser'; // <-- We won't rely on parseSpeakers anymore

import type { AnalysisResponse } from '../types/analysis';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}
/** Props for this modal */
interface Props {
  recording: Recording;
  visible: boolean;
  onClose: () => void;
  showSubscriptionModal?: (plan: 'monthly_pro' | 'sixMonth_premium' | 'yearly_ultimate') => void;
}

/** Chat message shape */
interface ChatMessage {
  speaker: string;
  message: string;
  timestamp: string;
  avatarIndex: number;
}

/** Tab definitions */
type ActiveTab = 'aidea' | 'transcribed' | 'ai' | 'meeting';

/** Preset categories for quick selection */
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

/** Language list for translations */
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

/** Translate button for transcribed tab */
const TranslateButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.translateButton} onPress={onPress}>
    <View style={styles.translateButtonContent}>
      <Ionicons name="language" size={20} color="#4A90E2" />
      <Text style={styles.translateButtonText}>Translate</Text>
    </View>
  </TouchableOpacity>
);

/** Main component */
export const RecordingDetailModal: React.FC<Props> = ({
  recording,
  visible,
  onClose,
  showSubscriptionModal // Ensure this is destructured
}) => {
  // Tabs & category
  const [activeTab, setActiveTab] = useState<ActiveTab>('aidea');
  const [selectedCategory, setSelectedCategory] = useState(
    recording?.categories?.[0] || 'note'
  );

  const handleShowSubscription = (plan: 'monthly_pro' | 'sixMonth_premium' | 'yearly_ultimate') => {
    if (showSubscriptionModal) {
      showSubscriptionModal(plan);
    }
  };
  // Translation
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<null | {
    code: string;
    name: string;
    flag: string;
  }>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Meeting
  const [meetingMessages, setMeetingMessages] = useState<Speaker[]>([]);

  // State for AI analysis, topics, date mentions, etc.
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [topicDetails, setTopicDetails] = useState<TopicDetail[]>([]);
  const [dateMentions, setDateMentions] = useState<DateMention[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // For sharing/export
  const [showShareMenu, setShowShareMenu] = useState(false);

  // get user data
  const { subscription } = useUserStore();
  const updateRecordingCategory = useRecordingStore(
    (state) => state.updateRecordingCategory
  );
  const { recordingDuration } = useAudioRecorder();
  const { updateRecordingAnalysis } = useRecordingStore();

  useEffect(() => {
    if (!recording?.transcription) return;
    
    // If we already have analysis, use that
    if (recording.analysis) {
      setAnalysis(recording.analysis);
      // Convert topics and other data
      const newTopicDetails = recording.analysis.topics.map((topic, index) => {
        const totalDuration = recording.duration || 0;
        const segmentDuration = totalDuration / (recording.analysis?.topics.length || 1);
        const timeStart = index * segmentDuration;
        const timeEnd = (index + 1) * segmentDuration;
  
        return {
          title: topic.title || 'Untitled Topic',
          timeRange: `${formatTimestamp(timeStart)}-${formatTimestamp(timeEnd)}`,
          summary: topic.summary || '',
          bulletPoints: topic.bulletPoints.map((point) => ({
            type: identifyPointType(point),
            content: point
          })),
          timeStart,
          timeEnd
        };
      });
      setTopicDetails(newTopicDetails);
      setIsAnalyzing(false);
      return;
    }
  
    const analyzeContent = async () => {
      try {
        setIsAnalyzing(true);

        if (!recording?.transcription || recording.transcription.trim().length === 0) {
          const emptyAnalysis: AnalysisResponse = {
            summary: "No valid voice recording found 🙁 Please record a new one 🎤",
            keyPoints: [],
            topics: [],
            isMeeting: false,
            speakers: [],
            rawTranscription: ""
          };
          setAnalysis(emptyAnalysis);
          setTopicDetails([]);
          return;
        }

        const result = await analyzeTranscription(recording.transcription);
        
        // Create a default topic if none are identified
        if (!result || !Array.isArray(result.topics) || result.topics.length === 0) {
          const defaultTopic = {
            title: 'General Content',
            summary: result?.summary || 'Content analysis available below',
            bulletPoints: result?.keyPoints || ['No specific points identified']
          };

          result.topics = [defaultTopic as any];
        }

        // Create properly typed analysis result
        const typedAnalysis: AnalysisResponse = {
          summary: result.summary || 'Analysis completed',
          keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
          topics: result.topics.map(topic => ({
            title: (topic as any)?.title || 'General Content',
            summary: (topic as any)?.summary || result.summary || 'Content analysis',
            bulletPoints: Array.isArray((topic as any)?.bulletPoints) ? (topic as any).bulletPoints : []
          })),
          isMeeting: Boolean(result.isMeeting || false),
          speakers: result.speakers || [],
          rawTranscription: recording.transcription
        };

        // Update recording store with analysis
        await updateRecordingAnalysis(recording.id, typedAnalysis);
        setAnalysis(typedAnalysis);

        // Create timeline with default segmentation
        const totalDuration = recording.duration || 0;
        const segmentDuration = totalDuration / typedAnalysis.topics.length;

        const newTopicDetails = typedAnalysis.topics.map((topic, idx) => {
          const timeStart = idx * segmentDuration;
          const timeEnd = (idx + 1) * segmentDuration;

          return {
            title: topic.title,
            timeRange: `${formatTimestamp(timeStart)}-${formatTimestamp(timeEnd)}`,
            summary: topic.summary,
            bulletPoints: (topic.bulletPoints || []).map(point => ({
              type: identifyPointType(point),
              content: point
            })),
            timeStart,
            timeEnd
          };
        });

        setTopicDetails(newTopicDetails);
      } catch (err) {
        console.warn('Analysis warning:', err);
        // Create fallback analysis instead of throwing error
        const fallbackAnalysis: AnalysisResponse = {
          summary: recording.transcription?.substring(0, 200) + "...",
          keyPoints: [],
          topics: [{
            title: 'Voice Recording',
            summary: 'Your recording has been transcribed below',
            bulletPoints: []
          }],
          isMeeting: false,
          speakers: [],
          rawTranscription: recording.transcription || ""
        };
        setAnalysis(fallbackAnalysis);
        setTopicDetails([{
          title: 'Voice Recording',
          timeRange: `0:00-${formatTimestamp(recording.duration || 0)}`,
          summary: 'Your recording has been transcribed below',
          bulletPoints: [],
          timeStart: 0,
          timeEnd: recording.duration || 0
        }]);
      } finally {
        setIsAnalyzing(false);
      }
    };
  
    if (!recording.analysis) {
      analyzeContent();
    }
  }, [recording?.id, recording?.transcription, recording?.analysis]);

  // 2) If user goes to AI tab and we have no chat messages, show intro
  useEffect(() => {
    if (recording?.transcription && activeTab === 'ai' && chatMessages.length === 0) {
      setChatMessages([
        {
          speaker: 'AI Assistant',
          message: `Hi! I've analyzed your recording "${recording.title}". How can I help?`,
          timestamp: new Date().toLocaleTimeString(),
          avatarIndex: 0
        }
      ]);
    }
  }, [activeTab, recording?.transcription, chatMessages.length, recording?.title]);

  // remove second parseSpeakers approach so we do NOT overwrite meetingMessages
  // 3) Category updates
  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    updateRecordingCategory(recording.id, newCat);
  };

  // 4) Chat send
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    try {
      setIsChatLoading(true);
  
      // Check AI chat usage first
      const { success, remainingChats, shouldUpgrade, suggestedPlan } = await useUserStore.getState().decrementAIChat();
      
      if (!success) {
        // Show upgrade modal
        Alert.alert(
          'AI Chat Limit Reached',
          suggestedPlan === 'yearly_ultimate' 
            ? 'Upgrade to our Annual Plan for unlimited AI chats! 🚀'
            : 'Upgrade to our 6-Month Plan for more AI chats at a better value! ✨',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View Plans',
              onPress: () => handleShowSubscription(suggestedPlan || 'monthly_pro')
            }
          ]
        );
        return;
      }
  
      // Add user message
      const userMsg: ChatMessage = {
        speaker: 'You',
        message: chatInput.trim(),
        timestamp: new Date().toLocaleTimeString(),
        avatarIndex: 1
      };
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
  
      // Get AI response
      const aiResponse = await generateAIResponse(chatInput, recording.transcription || '');
      const aiMsg: ChatMessage = {
        speaker: 'AI Assistant',
        message: aiResponse,
        timestamp: new Date().toLocaleTimeString(),
        avatarIndex: 0
      };
      setChatMessages(prev => [...prev, aiMsg]);
  
      // Show remaining chats notification if running low
      if (shouldUpgrade && remainingChats !== 'unlimited') {
        Alert.alert(
          'Running Low on AI Chats',
          `You have ${remainingChats} AI chats remaining. Upgrade your plan to continue the conversation! 💭`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'View Plans',
              onPress: () => handleShowSubscription(suggestedPlan || 'monthly_pro')
            }
          ]
        );
      }
    } catch (err) {
      Alert.alert('AI Chat Error', 'Failed to get AI response');
    } finally {
      setIsChatLoading(false);
    }
  };

  // 5) Tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'aidea':
        return renderAIdeaTab();
      case 'transcribed':
        return renderTranscribedTab();
      case 'ai':
        return renderAITab();
      case 'meeting':
        return renderMeetingTab();
      default:
        return null;
    }
  };

  // 5a) AIdea tab => summary, key points, topics
  const renderAIdeaTab = () => (
    <ScrollView style={styles.tabContent}>
      {isAnalyzing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4B7BFF" />
          <Text style={styles.loadingText}>Analyzing your recording... ✨</Text>
          <Text style={styles.loadingSubtext}>
            Extracting topics and insights 🎯
          </Text>
        </View>
      ) : (
        <>
          {/* Summary Section */}
          <View style={styles.transcribedCard}>
            <Text style={styles.sectionLabel}>Summary 💡</Text>
            <Text style={styles.transcribedText}>
              {analysis?.summary || 'No summary available'}
            </Text>
          </View>

          {/* Key Points Section */}
          <View style={styles.transcribedCard}>
            <Text style={styles.sectionLabel}>Key Points 🎯</Text>
            {analysis?.keyPoints?.length ? (
              analysis.keyPoints.map((kp, idx) => (
                <View key={idx} style={styles.keyPointContainer}>
                  <Text style={styles.keyPointBullet}>•</Text>
                  <Text style={styles.transcribedText}>{kp}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.transcribedText}>No key points identified</Text>
            )}
          </View>

          {/* Topics Timeline Section */}
          <View style={styles.transcribedCard}>
            <Text style={styles.sectionLabel}>Topics Timeline ⏱</Text>
            {topicDetails.length > 0 ? (
              renderTopicTimeline()
            ) : (
              <Text style={styles.transcribedText}>
                No topics identified. Please try analyzing again.
              </Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );

  // 5b) Transcribed tab => original text & translation
  const renderTranscribedTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.categoryEditBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PRESET_CATEGORIES.map((cat) => {
            const isActive = cat.id === selectedCategory;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  isActive && { backgroundColor: cat.color }
                ]}
                onPress={() => handleCategoryChange(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={18}
                  color={isActive ? '#fff' : cat.color}
                />
                <Text
                  style={[
                    styles.categoryItemText,
                    isActive && { color: '#fff' }
                  ]}
                >
                  {cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* The transcription text */}
      <View style={styles.transcribedCard}>
        <Text style={styles.sectionLabel}>Transcribed</Text>
        <TranslateButton onPress={handleTranslate} />
        <Text style={styles.transcribedText}>
          {recording?.transcription || 'No transcription available.'}
        </Text>
        {renderTranslation()}
      </View>
    </ScrollView>
  );

  // Add KeyboardAvoidingView and update the chat UI layout
  const renderAITab = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.tabContent}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.chatScroll}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {chatMessages.length === 0 ? (
          <View style={styles.emptyChatContainer}>
            <Text style={styles.emptyChatTitle}>Ask me about the recording! 💡</Text>
            <Text style={styles.emptyChatSubtitle}>
              I can help you understand the content, summarize key points, or answer specific questions.
            </Text>
          </View>
        ) : (
          chatMessages.map((msg, idx) => (
            <ChatBubble
              key={idx}
              message={msg.message}
              timestamp={msg.timestamp}
              speaker={msg.speaker}
              isUser={msg.speaker === 'You'}
              avatarIndex={msg.avatarIndex}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Ask about the recording..."
          placeholderTextColor="#999"
          value={chatInput}
          onChangeText={setChatInput}
          multiline
          maxLength={200}
          returnKeyType="send"
          onSubmitEditing={handleSendChatMessage}
        />
        <TouchableOpacity
          style={[
            styles.chatSendButton,
            (!chatInput.trim() || isChatLoading) && styles.chatSendButtonDisabled
          ]}
          onPress={handleSendChatMessage}
          disabled={!chatInput.trim() || isChatLoading}
        >
          {isChatLoading ? (
            <ActivityIndicator size="small" color="#4B7BFF" />
          ) : (
            <Ionicons name="send" size={22} color="#4B7BFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // 5d) Meeting replay tab
  const renderMeetingTab = () => (
    <View style={[styles.tabContent, { padding: 16 }]}>
      {isAnalyzing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4B7BFF" />
          <Text style={styles.loadingText}>Analyzing conversation... ✨</Text>
          <Text style={styles.loadingSubtext}>Identifying speakers 🎯</Text>
        </View>
      ) : (
        <ScrollView style={styles.chatScroll} showsVerticalScrollIndicator={false}>
          {meetingMessages.length > 0 ? (
            <MeetingReplay speakers={meetingMessages} />
          ) : (
            <View style={styles.emptyMeeting}>
              <Text style={styles.noChatText}>No conversation detected 💭</Text>
              <Text style={styles.noChatSubtext}>
                Record a conversation to see it here
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  // Update the topics timeline rendering
  const renderTopicTimeline = () => (
    <View style={styles.topicTimeline}>
      {topicDetails.map((topic, idx) => (
        <View key={idx} style={styles.topicSection}>
          {/* Topic Header with Time */}
          <Text style={styles.topicTitle}>
            {topic.title} ({topic.timeRange})
          </Text>

          {/* Topic Summary */}
          <Text style={styles.summaryText}>
            {topic.summary}
          </Text>

          {/* Single Bullet Points List */}
          {topic.bulletPoints.length > 0 && (
            <View style={styles.bulletPointsContainer}>
              {topic.bulletPoints.map((point, pidx) => (
                <View key={pidx} style={styles.bulletPointItem}>
                  <Text style={styles.bulletIcon}>•</Text>
                  <Text style={styles.bulletText}>
                    {typeof point === 'string' ? point : point.content}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );

  // Helper function to get appropriate emoji for topic
  const getTopicEmoji = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('introduction')) return '👋';
    if (lower.includes('summary')) return '📊';
    if (lower.includes('conclusion')) return '🎯';
    if (lower.includes('discussion')) return '💭';
    if (lower.includes('problem')) return '❗';
    if (lower.includes('solution')) return '💡';
    if (lower.includes('plan')) return '📅';
    if (lower.includes('review')) return '📋';
    if (lower.includes('analysis')) return '🔍';
    return '📌';
  };

  // Helper function to get improved bullet point icons
  const getBulletIcon = (type: 'decision' | 'action' | 'reference' | 'default'): string => {
    switch (type) {
      case 'decision':
        return '✅'; // Decision made
      case 'action':
        return '⚡'; // Action item
      case 'reference':
        return '🔗'; // Reference/Link
      default:
        return '•';
    }
  };

  // Helper function for bullet point icons
  const getBulletPointIcon = (type: 'decision' | 'action' | 'reference' | 'default'): string => {
    switch (type) {
      case 'decision':
        return '✅'; // Decisions/agreements
      case 'action':
        return '⚡'; // Action items
      case 'reference':
        return '📎'; // References/links
      default:
        return '•';
    }
  };

  // 6) For translations
  const handleTranslate = () => {
    if (!recording?.transcription) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...LANGUAGES.map((lang) => `${lang.flag} ${lang.name}`), 'Cancel'],
          cancelButtonIndex: LANGUAGES.length
        },
        async (buttonIndex) => {
          if (buttonIndex < LANGUAGES.length) {
            const language = LANGUAGES[buttonIndex];
            setSelectedLanguage(language);
            try {
              const translated = await translateText(recording.transcription || '', language.code);
              setTranslatedText(translated);
              setShowTranslation(true);
            } catch (err) {
              Alert.alert('Translation Error', 'Failed to translate text');
            }
          }
        }
      );
    } else {
      // Android
      Alert.alert('Select Language', 'Choose a language:', [
        ...LANGUAGES.map((lang) => ({
          text: `${lang.flag} ${lang.name}`,
          onPress: async () => {
            setSelectedLanguage(lang);
            try {
              const translated = await translateText(
                recording.transcription || '',
                lang.code
              );
              setTranslatedText(translated);
              setShowTranslation(true);
            } catch (error) {
              Alert.alert('Translation Error', 'Failed to translate text');
            }
          }
        })),
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const renderTranslation = () => {
    if (!showTranslation || !selectedLanguage) return null;
    return (
      <View style={styles.translationWrapper}>
        <View style={styles.translationHeader}>
          <View style={styles.translationTitleContainer}>
            <Text style={styles.translationFlag}>{selectedLanguage.flag}</Text>
            <Text style={styles.translationTitle}>{selectedLanguage.name}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowTranslation(false)}
            style={styles.closeTranslationButton}
          >
            <Ionicons name="close-circle" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.translatedTextContainer}>
          <Text style={styles.translatedText}>{translatedText}</Text>
        </ScrollView>
      </View>
    );
  };

  // 7) Calendar helper for date mentions (if you’re actually using dateMentions)
  const handleAddToCalendar = async (dateMention: DateMention) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const defaultCalendar = await Calendar.getDefaultCalendarAsync();
        await Calendar.createEventAsync(defaultCalendar.id, {
          title: recording?.title || 'Meeting from AIdeaVoice',
          startDate: dateMention.date,
          endDate: new Date(dateMention.date.getTime() + 60 * 60 * 1000),
          notes: recording?.transcription
        });
        Alert.alert('Success', 'Event added to calendar');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add event to calendar');
    }
  };

  // 8) Share & export
  const handleShare = () => {
    if (!recording) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Share & export notes with a tap',
          options: [
            'Cancel',
            'Export to PDF',
            'Email Notes',
            'Share Transcript',
            'Share Audio File'
          ],
          cancelButtonIndex: 0
        },
        async (buttonIndex) => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          switch (buttonIndex) {
            case 1:
              handleShareType('pdf');
              break;
            case 2:
              handleShareType('email');
              break;
            case 3:
              handleShareType('transcript');
              break;
            case 4:
              handleShareType('audio');
              break;
          }
        }
      );
    } else {
      setShowShareMenu(true);
    }
  };

  const handleShareType = async (type: 'pdf' | 'email' | 'transcript' | 'audio') => {
    setShowShareMenu(false);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  
      switch (type) {
        case 'pdf':
          await handleExportPDF();
          break;
        case 'email': {
          const content = `${recording.title}\n${recording.transcription || ''}\n\nAI Analysis:\n${generateSummary(recording.transcription || '')}`;
          await Share.share({ message: content, title: recording.title });
          break;
        }
        case 'transcript':
          await Share.share({
            message: recording.transcription || '',
            title: 'Transcript'
          });
          break;
        case 'audio':
          if (Platform.OS === 'ios') {
            await Share.share({ url: recording.uri });
          } else {
            await Sharing.shareAsync(recording.uri);
          }
          break;
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleExportPDF = async () => {
    try {
      const htmlContent = await generatePDF();
      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: false 
      });
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf' 
        });
      } else {
        await Sharing.shareAsync(uri, { 
          mimeType: 'application/pdf' 
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const generatePDF = async (): Promise<string> => {
    const exportDate = new Date().toLocaleDateString();
    const recordingDate = new Date(recording?.timestamp || '').toLocaleDateString();
    const recordingLength = formatDuration(recording?.duration || 0);

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; }
            .app-name { font-size: 28px; color: #4B7BFF; margin-bottom: 10px; }
            .divider { border-bottom: 1px solid #E0E0E0; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 20px 0; color: #666; }
            .info-label { font-weight: bold; }
            .section { margin: 30px 0; }
            .section-title { color: #4B7BFF; font-size: 20px; margin-bottom: 15px; }
            .content { line-height: 1.6; }
            .footer { text-align: center; margin-top: 50px; color: #666; font-size: 12px; }
            .footer-brand { color: #4B7BFF; font-weight: bold; }
          </style>
        </head>
        <body>
          <!-- App Header -->
          <div class="header">
            <div class="app-name">AIdeaVoice 🎙️</div>
          </div>
          <div class="divider"></div>

          <!-- Recording Info -->
          <h1>${recording?.title || 'Untitled Recording'}</h1>
          <div class="info-row">
            <div>
              <span class="info-label">Recorded Date:</span> ${recordingDate}
            </div>
            <div>
              <span class="info-label">Length:</span> ${recordingLength}
            </div>
          </div>

          <!-- Transcribed Section -->
          <div class="section">
            <h2 class="section-title">Transcribed</h2>
            <div class="content">
              ${recording?.transcription || 'No transcription available.'}
            </div>
          </div>

          <!-- Categories if available -->
          ${recording?.categories && recording.categories.length > 0 ? `
            <div class="section">
              <h2 class="section-title">Categories</h2>
              <div class="content">
                ${recording.categories.join(', ')}
              </div>
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <p>Generated with <span class="footer-brand">AIdeaVoice</span> - Your AI Voice Assistant</p>
            <p>Export Date: ${exportDate}</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent, 
        base64: false 
      });
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf' 
        });
      } else {
        await Sharing.shareAsync(uri, { 
          mimeType: 'application/pdf' 
        });
      }
      return htmlContent;
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF');
      return '';
    }
  };

  // 9) Tab navigation
  const handleChangeTab = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

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

