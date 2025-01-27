export type FeatureName = 'recording' | 'transcription' | 'aiChat' | 'translation' | 'meetingReplay';

export interface AnalyticsEvent {
  eventName: 'buttonTap' | 'screenView' | 'featureUse' | 'error' | 'share' | 'export';
  screenName?: 'home' | 'recording' | 'settings' | 'aidea' | 'transcribed' | 'ai' | 'meeting';
  featureName?: FeatureName;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}