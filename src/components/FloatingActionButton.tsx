// src/components/FloatingActionButton.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../stores/useUserStore';
import { SettingsModal as FullSubscriptionModal } from './SettingsModal';
import { UserTrackingService } from '../services/userTrackingService';
import { FeedbackModal as FeedbackModalComponent } from './FeedbackModal';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';

// ---------------------------------------
// Types
// ---------------------------------------
interface FABAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface UserCode {
  code: string;
  createdAt: Date;
}

// ---------------------------------------
// BasicSettingsModal: short “Settings & Plans”
// ---------------------------------------
const BasicSettingsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onOpenSubscription: () => void;
}> = ({ visible, onClose, onOpenSubscription }) => {
  const { subscription } = useUserStore();

  const planLabel = (() => {
    switch (subscription?.plan) {
      case 'monthly_pro':
        return 'Monthly Plan ⭐️';
      case 'sixMonth_premium':
        return '6 Months Plan ✨';
      case 'yearly_ultimate':
        return 'Annual Plan 💎';
      default:
        return 'Free Trial 🎁';
    }
  })();

  const daysRemaining = (() => {
    if (!subscription?.endDate) return 0;
    const now = new Date();
    const end = new Date(subscription.endDate);
    return Math.max(
      0,
      Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
  })();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Settings & Plans ⚙️</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Current Plan Summary */}
          <TouchableOpacity
            style={styles.planSummaryCard}
            onPress={() => {
              onClose();
              onOpenSubscription();
            }}
          >
            <View style={styles.planSummaryContent}>
              <View style={styles.planSummaryHeader}>
                <Text style={styles.planSummaryTitle}>Current Plan</Text>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </View>
              <View style={styles.planSummaryDetails}>
                <Text style={styles.currentPlanName}>{planLabel}</Text>
                <Text style={styles.currentPlanExpiry}>
                  {daysRemaining} days remaining
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Coming Soon settings */}
          <Text style={styles.sectionTitle}>App Settings</Text>
          {[
            {
              text: 'Notification Settings',
              icon: '🔔',
              bg: '#E8F5E9',
              disabled: true
            },
            {
              text: 'Theme Settings',
              icon: '🎨',
              bg: '#E1F5FE',
              disabled: true
            }
          ].map((setting, idx) => (
            <View key={idx} style={styles.settingItem}>
              <View style={[styles.stepIconContainer, { backgroundColor: setting.bg }]}>
                <Text style={{ fontSize: 24 }}>{setting.icon}</Text>
              </View>
              <Text style={styles.settingText}>{setting.text}</Text>
              {setting.disabled && (
                <View style={styles.settingComingSoonBadge}>
                  <Text style={styles.comingSoonBadgeLabel}>Coming Soon</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

// ---------------------------------------
// HelpModal: includes new “Welcome Card” at the top
// ---------------------------------------
const HelpModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  showFeedbackModal: () => void;
}> = ({ visible, onClose, showFeedbackModal }) => {
  const { uid, userCode, generateUserCode } = useUserStore();
  const [supportCode, setSupportCode] = useState<string>('');

  useEffect(() => {
    const initUserCode = async () => {
      if (uid && !userCode) {
        const code = await generateUserCode();
        setSupportCode(code);
      } else if (userCode) {
        setSupportCode(userCode);
      }
    };
    
    initUserCode();
  }, [uid, userCode]);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(supportCode);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Support code copied to clipboard!');
  };


  const handleContactSupport = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: ['hello.aideavoice@gmail.com'],
        subject: 'AIdeaVoice Support Request',
        body: `Hi,<br><br>My Support Code: <b>${supportCode}</b><br><br>Describe your issue here:`,
        isHtml: true, // Enable HTML formatting
      });
    } else {
      alert('Email composer not available on this device.');
    }
  };

// If composer wont work, get back to the existing one

 //  const handleContactSupport = () => {
 //  const supportEmail = 'hello.aideavoice@gmail.com';
 //   const subject = 'AIdeaVoice Support Request';
 //   const body = `Hi,\n\nMy Support Code: ${supportCode}\n\nDescribe your issue here:`;

 //  Linking.openURL(
 //    `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
 //  );
 // };

  const helpItems = [
    {
      icon: '🎙️',
      bg: '#E8F5E9',
      title: 'Voice Recording',
      description: 'Tap the red button to start recording. Speak clearly for best results.'
    },
    {
      icon: '🤖',
      bg: '#E1F5FE',
      title: 'AI Analysis',
      description: 'Get instant insights from your recordings with our AI assistant.'
    },
    {
      icon: '📊',
      bg: '#FFF3E0',
      title: 'Organization',
      description: 'Categorize and filter your recordings for easy access.'
    },
    {
      icon: '💬',
      bg: '#F3E5F5',
      title: 'Meeting Mode',
      description: 'Capture & analyze group discussions in real time.'
    }
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Help & Tips 💡</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* NEW: Welcome Card at top of Help section */}
          <View style={styles.welcomeCard}>
            <LinearGradient
              colors={['#6B9FFF', '#4B7BFF']}
              style={styles.welcomeGradient}
            >
              <View style={styles.welcomeContent}>
                <View style={styles.welcomeIcon}>
                  <Text style={{ fontSize: 28 }}>💡</Text>
                </View>
                <Text style={styles.welcomeTitle}>Welcome to Help Center</Text>
                <Text style={styles.welcomeSubtitle}>
                  Learn how to make the most of AIdeaVoice
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Help items list */}
          {helpItems.map((item, index) => (
            <View key={index} style={styles.helpItem}>
              <View style={[styles.helpIconContainer, { backgroundColor: item.bg }]}>
                <Text style={styles.helpIcon}>{item.icon}</Text>
              </View>
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>{item.title}</Text>
                <Text style={styles.helpDescription}>{item.description}</Text>
              </View>
            </View>
          ))}

          {/* Support Section */}
          <View style={styles.supportSection}>
            <Text style={styles.supportTitle}>Need Help? 🎯</Text>
            <View style={styles.supportCodeContainer}>
              <Text style={styles.supportCodeLabel}>Your Support Code:</Text>
              <View style={styles.codeWrapper}>
                <Text style={styles.supportCode}>{supportCode}</Text>
                <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={20} color="#4B7BFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail-outline" size={20} color="#FFF" />
              <Text style={styles.contactButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback button */}
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => {
              onClose();
              showFeedbackModal();
            }}
          >
            <Text style={styles.feedbackButtonText}>Share Your Feedback 📝</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ---------------------------------------
// FeedbackModal
// ---------------------------------------
const FeedbackModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState<number>(0);

  const uid = useUserStore(state => state.uid);

  const handleSubmitFeedback = async () => {
    if (!feedbackText || !rating) {
      Alert.alert('Missing info', 'Please provide text & rating before submitting.');
      return;
    }
    try {
      await UserTrackingService.submitFeedback(
        uid || 'unknown-user',
        feedbackText,
        rating
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thank you!', 'Your feedback was submitted to the team.');
      onClose();
    } catch (err) {
      console.error('Error while submitting feedback:', err);
      Alert.alert('Error', 'Could not send your feedback, please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Your Feedback</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.feedbackLabel}>
            Let us know how we can improve AIdeaVoice!
          </Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Your thoughts..."
            multiline
            numberOfLines={5}
            value={feedbackText}
            onChangeText={setFeedbackText}
          />

          <Text style={styles.feedbackLabel}>Rate Your Experience</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(num => (
              <TouchableOpacity
                key={num}
                onPress={() => setRating(num)}
                style={styles.ratingIconWrapper}
              >
                <Ionicons
                  name={num <= rating ? 'happy' : 'happy-outline'}
                  size={34}
                  color={num <= rating ? '#FFD700' : '#999'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitFeedback}>
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ---------------------------------------
// Main FloatingActionButton
// ---------------------------------------
export const FloatingActionButton = () => {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  // Toggles for all modals
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showBasicSettings, setShowBasicSettings] = useState(false);
  const [showFullSubModal, setShowFullSubModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Animations for FAB
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const menuItemAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const actions: FABAction[] = [
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Settings',
      color: '#795548',
      onPress: () => setShowBasicSettings(true)
    },
/*    {
      id: 'stats',
      icon: 'stats-chart',
      label: 'Stats',
      color: '#9C27B0',
      onPress: () => console.log('Stats pressed')
    },
    */
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help',
      color: '#4CAF50',
      onPress: () => {
        setShowHelpModal(true);
        setIsOpen(false); // Close the FAB menu
      }
    }
  ];

  const toggleMenu = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = isOpen ? 0 : 1;

    const menuItemAnimations = menuItemAnims.map((anim, i) =>
      Animated.spring(anim, {
        toValue,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
        delay: i * 50
      })
    );

    Animated.parallel([
      Animated.spring(menuAnim, {
        toValue,
        tension: 40,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue,
        tension: 40,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 200,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true
      }),
      ...menuItemAnimations
    ]).start();

    setIsOpen(!isOpen);
  };

  const handleActionPress = async (action: FABAction) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action.onPress();
    toggleMenu();
  };

  return (
    <>
      {/* Floating Action Button + Menu */}
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: menuAnim,
              transform: [
                { scale: menuAnim },
                {
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }
              ]
            }
          ]}
        >
          {actions.map((action, i) => (
            <Animated.View
              key={action.id}
              style={{
                opacity: menuItemAnims[i],
                transform: [
                  { scale: menuItemAnims[i] },
                  {
                    translateX: menuItemAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleActionPress(action)}
              >
                <View style={[styles.menuButton, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={24} color="#fff" />
                </View>
                <Animated.View
                  style={[
                    styles.menuLabelContainer,
                    {
                      opacity: menuItemAnims[i],
                      transform: [{ scale: menuItemAnims[i] }]
                    }
                  ]}
                >
                  <Text style={styles.menuLabel}>{action.label}</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        <TouchableOpacity
          style={[styles.fab, isOpen && styles.fabActive]}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg']
                  })
                }
              ]
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Basic Settings Modal */}
      <BasicSettingsModal
        visible={showBasicSettings}
        onClose={() => setShowBasicSettings(false)}
        onOpenSubscription={() => setShowFullSubModal(true)}
      />

      {/* Full subscription modal */}
      <FullSubscriptionModal
        visible={showFullSubModal}
        onClose={() => setShowFullSubModal(false)}
      />

      {/* Help modal */}
      <HelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        showFeedbackModal={() => {
          setShowHelpModal(false);
          setShowFeedbackModal(true);
        }}
      />

      {/* Feedback Modal */}
      <FeedbackModalComponent
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Contact Us Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contact Us 📩</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowContactModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.contactText}>
              We value your feedback! Let us know how to improve.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Your message..."
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => {
                console.log('Contact feedback submitted');
                setShowContactModal(false);
              }}
            >
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

// ---------------------------------------
// Styles
// ---------------------------------------
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    alignItems: 'flex-end',
    zIndex: 1000
  },
  fab: {
    backgroundColor: '#F44336',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  fabActive: {
    backgroundColor: '#666',
    transform: [{ scale: 1.1 }]
  },
  menuContainer: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    marginBottom: 16,
    alignItems: 'flex-end'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65
  },
  menuLabelContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65
  },
  menuLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600'
  },

  // Basic Settings modal styling
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  closeButton: {
    position: 'absolute',
    right: 16
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff'
  },
  planSummaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
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
  planSummaryContent: {
    flex: 1
  },
  planSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  planSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  planSummaryDetails: {
    gap: 4
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4B7BFF'
  },
  currentPlanExpiry: {
    fontSize: 14,
    color: '#666'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 16
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
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
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: '500'
  },
  settingComingSoonBadge: {
    backgroundColor: 'rgba(255,224,178,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  comingSoonBadgeLabel: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
    opacity: 0.8
  },

  // Contact
  contactText: {
    fontSize: 16,
    color: '#333',
    margin: 20,
    textAlign: 'center'
  },
  input: {
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    marginHorizontal: 20
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },

  // Help modal additions
  helpItemContent: {
    flex: 1
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  helpItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  feedbackButton: {
    backgroundColor: '#4B7BFF',
    margin: 20,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },

  // “Welcome Card” within Help
  welcomeCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden'
  },
  welcomeGradient: {
    padding: 16,
    borderRadius: 16
  },
  welcomeContent: {
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

  // Updated “helpItems” styling
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
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
        elevation: 3
      }
    })
  },
  helpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  helpIcon: {
    fontSize: 24
  },
  helpContent: {
    flex: 1
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  helpDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },

  // Feedback
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    color: '#333'
  },
  feedbackInput: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    textAlignVertical: 'top'
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 20
  },
  ratingIconWrapper: {
    padding: 4
  },

  // Support Section
  supportSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    padding: 16,
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
  supportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  supportCodeContainer: {
    marginBottom: 16,
  },
  supportCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  codeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  supportCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  copyButton: {
    padding: 8,
  },
  contactButton: {
    backgroundColor: '#4B7BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
