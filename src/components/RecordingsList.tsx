// src/components/RecordingsList.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRecordingStore } from '../stores/useRecordingStore';
import { RecordingListItem } from './RecordingListItem';
import { Recording } from '../types/recording';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

export const RecordingsList: React.FC = () => {
  const { recordings, selectedFilter, deleteRecording, setSelectedRecording } = useRecordingStore();
  
  const filteredRecordings = React.useMemo(() => {
    let sortedRecordings = [...recordings];

    switch (selectedFilter) {
      case 'recent':
        return sortedRecordings.reverse();
      case 'duration':
        return sortedRecordings.sort((a, b) => a.duration - b.duration);
      default:
        // Category filtering
        return sortedRecordings
          .filter((r: Recording) => r.categories?.includes(selectedFilter))
          .reverse();
    }
  }, [recordings, selectedFilter]);

  if (filteredRecordings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="bulb-outline" size={48} color="#F44336" />
        <Text style={styles.emptyText}>No AIdeaVoice recordings yet</Text>
        <Text style={styles.emptySubtext}>
          {selectedFilter === 'duration' 
            ? 'No recordings to sort by duration'
            : 'Tap below to start capturing ideas'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList<Recording>
        data={filteredRecordings}
        renderItem={({ item }) => (
          <RecordingListItem
            recording={item}
            onDelete={deleteRecording}
            onPress={() => setSelectedRecording(item)}
          />
        )}
        estimatedItemSize={100}
        keyExtractor={(item: Recording) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});