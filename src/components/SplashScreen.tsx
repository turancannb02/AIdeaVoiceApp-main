import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const titleOpacity = new Animated.Value(0);
  const subtitleOpacity = new Animated.Value(0);
  const subtitleTranslateY = new Animated.Value(20);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          tension: 30,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setTimeout(onFinish, 1800);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
        AIdeaVoice 🎙️
      </Animated.Text>
      <Animated.View 
        style={[
          styles.subtitleContainer, 
          { 
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }] 
          }
        ]}
      >
        <Text style={styles.subtitle}>Your AI Voice Assistant</Text>
        <Text style={styles.subtitleSecondary}>Record • Transcribe • Organize</Text>
        <Text style={styles.subtitleTertiary}>Powered by AI ✨</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B9FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F0F4FF',
    marginBottom: 8,
  },
  subtitleSecondary: {
    fontSize: 18,
    color: '#DCE4FF',
    marginTop: 8,
    letterSpacing: 1,
  },
  subtitleTertiary: {
    fontSize: 16,
    color: '#F8FAFF',
    marginTop: 24,
    fontWeight: '500',
    opacity: 0.9,
  },
}); 