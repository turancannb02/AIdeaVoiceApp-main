import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { getAvatarUri } from '../utils/avatarLoader';

interface Props {
  message: string;
  timestamp: string;
  speaker: string;
  isUser: boolean;
  avatarIndex: number;
}

export const ChatBubble: React.FC<Props> = ({
  message,
  timestamp,
  speaker,
  isUser,
  avatarIndex,
}) => {
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.otherContainer]}>
      {!isUser && (
        <View style={styles.avatarContainer}>
          <Image 
            source={getAvatarUri(avatarIndex)} 
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={[
        styles.contentContainer,
        isUser ? styles.userContentContainer : styles.otherContentContainer
      ]}>
        {!isUser && <Text style={styles.speaker}>{speaker}</Text>}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.otherBubble]}>
          <Text style={[styles.message, isUser ? styles.userMessage : styles.otherMessage]}>
            {message}
          </Text>
        </View>
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.otherTimestamp]}>
          {timestamp}
        </Text>
      </View>
      {isUser && (
        <View style={styles.avatarContainer}>
          <Image 
            source={getAvatarUri(avatarIndex)} 
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userContainer: {
    flexDirection: 'row-reverse',
  },
  otherContainer: {
    flexDirection: 'row',
  },
  avatarContainer: {
    marginHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  contentContainer: {
    maxWidth: '75%',
  },
  userContentContainer: {
    alignItems: 'flex-end',
  },
  otherContentContainer: {
    alignItems: 'flex-start',
  },
  speaker: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    marginLeft: 12,
  },
  bubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: '#2B7AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#F1F1F1',
    borderBottomLeftRadius: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessage: {
    color: '#fff',
  },
  otherMessage: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  userTimestamp: {
    color: '#666',
  },
  otherTimestamp: {
    color: '#666',
  },
}); 