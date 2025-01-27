import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Recording } from '../types/recording';

interface RecordingItemProps {
  recording: Recording;
  onPress: () => void;
}

export const RecordingItem: React.FC<RecordingItemProps> = ({ recording, onPress }) => {
  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.date}>
        {new Date(recording.timestamp).toLocaleString()}
      </Text>
      <Text style={styles.duration}>
        {formatDuration(recording.duration)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  duration: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
}); 