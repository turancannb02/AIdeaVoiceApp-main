import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  audioLevel: number;
  style?: any;
  variant?: 'default' | 'recording';
}

export const AudioVisualizer: React.FC<Props> = ({ 
  audioLevel, 
  style,
  variant = 'default' 
}) => {
  const bars = 40;
  const maxHeight = variant === 'recording' ? 120 : 60;

  return (
    <View style={[
      styles.container, 
      variant === 'recording' && styles.recordingContainer,
      style
    ]}>
      <View style={[
        styles.visualizer,
        variant === 'recording' && styles.recordingVisualizer
      ]}>
        {[...Array(bars)].map((_, i) => {
          const height = Math.max(4, Math.min(maxHeight * audioLevel * Math.random(), maxHeight));
          return (
            <View
              key={i}
              style={[
                styles.bar,
                variant === 'recording' && styles.recordingBar,
                { height }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 10,
  },
  recordingContainer: {
    height: 160,
    backgroundColor: 'transparent',
    padding: 0,
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    width: '100%',
  },
  recordingVisualizer: {
    height: 160,
    alignItems: 'flex-end',
  },
  bar: {
    width: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    opacity: 0.8,
  },
  recordingBar: {
    width: 4,
    backgroundColor: '#FF3B30',
    opacity: 0.9,
  }
}); 