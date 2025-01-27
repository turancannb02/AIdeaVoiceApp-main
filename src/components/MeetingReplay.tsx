import React from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { ChatBubble } from './ChatBubble';
import { LinearGradient } from 'expo-linear-gradient';

export interface Speaker {
  name: string;
  lines: {
    text: string;
    timestamp: number;
  }[];
}

interface MeetingReplayProps {
  speakers: Speaker[];
}

const MeetingReplay: React.FC<MeetingReplayProps> = ({ speakers }) => {
  if (!speakers || speakers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Meeting Content 🎯</Text>
        <Text style={styles.emptySubtitle}>Record a conversation to see it visualized here</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.timelineContainer}>
        {speakers.map((speaker, speakerIndex) => (
          <View key={speakerIndex} style={styles.speakerContainer}>
            <View style={styles.speakerHeader}>
              <LinearGradient
                colors={getSpeakerColors(speakerIndex)}
                style={styles.avatarContainer}
              >
                <Text style={styles.avatarText}>
                  {speaker.name.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <Text style={styles.speakerName}>{speaker.name}</Text>
            </View>
            
            {speaker.lines?.map((line, lineIndex) => (
              <View key={lineIndex} style={styles.messageContainer}>
                <View style={styles.timelineDot} />
                <View style={styles.messageContent}>
                  <ChatBubble
                    message={line.text}
                    timestamp={formatTimestamp(line.timestamp)}
                    speaker={speaker.name}
                    isUser={false}
                    avatarIndex={speakerIndex % 9}
                  />
                  <View style={[
                    styles.timelineConnector,
                    lineIndex === speaker.lines.length - 1 && styles.lastConnector
                  ]} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const getSpeakerColors = (index: number): [string, string] => {
  const gradients: [string, string][] = [
    ['#FF6B98', '#FF4081'], // Pink
    ['#4B7BFF', '#2196F3'], // Blue
    ['#66BB6A', '#4CAF50'], // Green
    ['#FFA726', '#FF9800'], // Orange
    ['#BA68C8', '#9C27B0'], // Purple
  ];
  return gradients[index % gradients.length];
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timelineContainer: {
    padding: 16,
  },
  speakerContainer: {
    marginBottom: 24,
  },
  speakerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  speakerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  messageContainer: {
    flexDirection: 'row',
    marginLeft: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4B7BFF',
    marginRight: 12,
    marginTop: 12,
  },
  messageContent: {
    flex: 1,
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: -18,
    top: 24,
    bottom: -24,
    width: 2,
    backgroundColor: '#E0E0E0',
  },
  lastConnector: {
    display: 'none',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  }
});

export default MeetingReplay;
