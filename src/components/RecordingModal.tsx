import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioVisualizer } from './AudioVisualizer';

interface Props {
  visible: boolean;
  onClose: () => void;
  audioLevel: number;
  recordingDuration: number;
  recordingState: 'idle' | 'recording' | 'analyzing';
  formatDuration: (duration: number) => string;
}

export const RecordingModal: React.FC<Props> = ({
  visible,
  onClose,
  audioLevel,
  recordingDuration,
  recordingState,
  formatDuration,
}) => {
  const handleClose = () => {
    if (recordingState === 'analyzing') {
      Alert.alert(
        'Cancel Processing?',
        'Are you sure you want to cancel? The recording will be lost.',
        [
          {
            text: 'Continue Processing',
            style: 'cancel'
          },
          {
            text: 'Cancel Recording',
            style: 'destructive',
            onPress: onClose
          }
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleClose}
            disabled={recordingState === 'analyzing'}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {recordingState === 'analyzing' ? 'Processing with AI... 🦾' : 'Recording your idea...'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.timer}>
            {formatDuration(recordingDuration)}
          </Text>
          <AudioVisualizer 
            audioLevel={audioLevel} 
            variant="recording"
            style={styles.visualizer}
          />
          
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[
                styles.recordButton,
                recordingState === 'analyzing' && styles.analyzingButton,
              ]}
              onPress={handleClose}
              disabled={recordingState === 'analyzing'}
            >
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  timer: {
    fontSize: 64,
    fontWeight: '300',
    color: '#333',
    letterSpacing: 2,
  },
  visualizer: {
    width: '100%',
    marginVertical: 40,
  },
  controls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stopIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  analyzingButton: {
    backgroundColor: '#FFA500',
  },
}); 