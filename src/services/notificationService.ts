import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NotificationTriggerInput, SchedulableTriggerInputTypes } from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useUserStore } from '../stores/useUserStore';

const MORNING_NOTIFICATIONS = [
  {
    title: "Start Your Day with Voice Notes 🌅",
    body: "Begin your day by capturing your morning thoughts and plans."
  },
  {
    title: "Morning Inspiration 💫",
    body: "Your best ideas often come in the morning. Let's record them!"
  },
  {
    title: "Ready to Record? 🎙️",
    body: "Take a moment to capture your thoughts while they're fresh."
  },
  {
    title: "Good Morning! ☀️",
    body: "Start your day right by recording your goals and ideas."
  },
  {
    title: "Morning Reflection Time 🌟",
    body: "Document your thoughts and set your intentions for the day."
  }
];

const AFTERNOON_NOTIFICATIONS = [
  {
    title: "Afternoon Check-in 📝",
    body: "Take a moment to record your progress and new ideas."
  },
  {
    title: "Quick Voice Note? 🎯",
    body: "Don't let those thoughts slip away - record them now!"
  },
  {
    title: "Ideas Flowing? 💭",
    body: "Your voice notes are waiting to capture your insights."
  },
  {
    title: "Productivity Break ⚡",
    body: "Quick break? Perfect time for a voice note!"
  },
  {
    title: "Capture the Moment 📸",
    body: "Record your thoughts before they fade away."
  }
];

class NotificationService {
  static async initialize() {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
      }

      // Get user ID from store
      const { uid } = useUserStore.getState();
      if (!uid) {
        console.log('No user ID found for notification tracking');
        return false;
      }

      // Check existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only ask if permissions have not been determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Track permission status in Firebase
      await updateDoc(doc(db, 'users', uid), {
        notificationSettings: {
          permissionStatus: finalStatus,
          lastUpdated: new Date(),
          platform: Platform.OS,
          deviceInfo: {
            brand: Device.brand,
            model: Device.modelName,
            osVersion: Device.osVersion
          }
        }
      });

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false
        }),
      });

      if (__DEV__) {
        console.log('Notification permissions granted');
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  static async scheduleDailyNotifications(settings?: {
    dailyNotifications: boolean;
    weeklyNotifications: boolean;
  }) {
    // Only proceed if we have permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('No notification permissions!');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    // Morning notifications (9 AM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: MORNING_NOTIFICATIONS[Math.floor(Math.random() * MORNING_NOTIFICATIONS.length)].title,
        body: MORNING_NOTIFICATIONS[Math.floor(Math.random() * MORNING_NOTIFICATIONS.length)].body,
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.CALENDAR,
        hour: 9,
        minute: 0,
        repeats: true
      }
    });

    // Afternoon notifications (2 PM)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: AFTERNOON_NOTIFICATIONS[Math.floor(Math.random() * AFTERNOON_NOTIFICATIONS.length)].title,
        body: AFTERNOON_NOTIFICATIONS[Math.floor(Math.random() * AFTERNOON_NOTIFICATIONS.length)].body,
        sound: true,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.CALENDAR,
        hour: 14,
        minute: 0,
        repeats: true
      }
    });

    // Weekly Monday motivation (9 AM)
    if (settings?.weeklyNotifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Weekly Reflection 🌟",
          body: "Start your week strong! Record your goals and priorities for the week ahead.",
          sound: true,
        },
        trigger: {
          type: SchedulableTriggerInputTypes.CALENDAR,
          weekday: 1, // Monday
          hour: 9,
          minute: 0,
          repeats: true
        }
      });
    }
  }

  static async updateNotificationSettings(settings: {
    dailyNotifications: boolean;
    weeklyNotifications: boolean;
  }) {
    if (!settings.dailyNotifications && !settings.weeklyNotifications) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }
    await this.scheduleDailyNotifications(settings);
  }
}

export default NotificationService;