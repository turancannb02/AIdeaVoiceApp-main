// src/components/FeedbackModal.tsx

import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../stores/useUserStore';
import { UserTrackingService } from '../services/userTrackingService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);

  // We'll call useUserStore.getState() directly in handleSubmit to ensure we have the latest uid
  const ratingIcons = [
    { score: 1, icon: '😢', label: 'Poor' },
    { score: 2, icon: '😕', label: 'Fair' },
    { score: 3, icon: '😊', label: 'Good' },
    { score: 4, icon: '😃', label: 'Great' },
    { score: 5, icon: '🤩', label: 'Excellent' }
  ];

  const handleSubmit = async () => {
    if (!feedback || !rating) {
      Alert.alert('Please complete your feedback', 'Both rating and feedback text are required.');
      return;
    }

    try {
      // Ensure we have a user
      let { uid, initUser } = useUserStore.getState();
      if (!uid) {
        await initUser();
        uid = useUserStore.getState().uid;
        if (!uid) throw new Error('User not authenticated (initUser failed)');
      }

      // Now submit feedback
      await UserTrackingService.submitFeedback(uid, feedback, rating);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thank you! 🎉', 'Your feedback helps us improve AIdeaVoice.');
      setFeedback('');
      setRating(0);
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Error',
        'Unable to submit feedback. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#6B9FFF', '#4B7BFF']}
        style={styles.header}
      >
        <Text style={styles.title}>Help Us Improve 💭</Text>
        <Text style={styles.subtitle}>Your feedback shapes the future of AIdeaVoice</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <Text style={styles.inputLabel}>Share your thoughts</Text>
        <TextInput
          style={styles.input}
          placeholder="What can we do better?"
          multiline
          numberOfLines={6}
          value={feedback}
          onChangeText={setFeedback}
          placeholderTextColor="#999"
        />

        <Text style={styles.ratingTitle}>Rate your experience</Text>
        <View style={styles.ratingContainer}>
          {ratingIcons.map((item) => (
            <TouchableOpacity
              key={item.score}
              style={[
                styles.ratingButton,
                rating === item.score && styles.selectedRating
              ]}
              onPress={() => {
                setRating(item.score);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.ratingEmoji}>{item.icon}</Text>
              <Text style={[
                styles.ratingLabel,
                rating === item.score && styles.selectedRatingLabel
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!feedback || !rating) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!feedback || !rating}
        >
          <Text style={styles.submitButtonText}>Submit Feedback</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    marginBottom: 24,
    textAlignVertical: 'top',
    color: '#333',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  ratingButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  selectedRating: {
    backgroundColor: '#4B7BFF15',
    transform: [{ scale: 1.1 }],
  },
  ratingEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#666',
  },
  selectedRatingLabel: {
    color: '#4B7BFF',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4B7BFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
