export interface UserDevice {
  id: string;
  model: string;
  os: string;
  osVersion: string;
  appVersion: string;
}

export interface UserAnalytics {
  totalRecordingMinutes: number;
  totalExports: number;
  totalShares: number;
  lastActiveDate: string;
}

export interface UserSubscription {
  type: 'free' | 'pro' | 'enterprise';
  startDate: string;
  endDate?: string;
  status: 'active' | 'expired' | 'cancelled';
}

export interface AppUser {
  id: string;
  deviceId: string;
  device: UserDevice;
  installDate: string;
  analytics: UserAnalytics;
  subscription: UserSubscription;
} 