import { AppUser, UserAnalytics } from '../types/user';
import { API_URL } from '../config/constants';

export const AnalyticsService = {
  async trackUser(user: AppUser) {
    try {
      await fetch(`${API_URL}/analytics/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          device: user.device,
          installDate: user.installDate,
          subscription: user.subscription
        })
      });
    } catch (error) {
      console.error('Error tracking user:', error);
    }
  },

  async updateAnalytics(userId: string, analytics: UserAnalytics) {
    try {
      await fetch(`${API_URL}/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...analytics,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  }
}; 