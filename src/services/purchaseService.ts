import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_wpbZgGOBlEyTPfCRpwPOmOmjKKH',
  android: 'goog_your_key_here', // Add your Android key when needed
  default: ''
});

class PurchaseService {
  static async initialize() {
    if (!REVENUECAT_API_KEY) {
      console.error('RevenueCat API key not configured');
      return;
    }

    try {
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: null // RevenueCat will generate one
      });
      
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  static async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Error getting offerings:', error);
      return null;
    }
  }

  static async purchasePackage(packageToPurchase: any): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Error purchasing package:', error);
      }
      throw error;
    }
  }

  static async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }
}

export default PurchaseService;