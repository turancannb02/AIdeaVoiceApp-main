// purchaseService.ts
import Purchases, { 
  CustomerInfo, 
  LOG_LEVEL, 
  PurchasesOffering,
  PurchasesPackage
} from 'react-native-purchases';
import { Platform } from 'react-native';

// Use the appropriate RevenueCat API key for each platform.
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_wpbZgGOBlEyTPfCRpwPOmOmjKKH',
  android: 'goog_your_key_here'
});

// Map your internal plan IDs to the RevenueCat package identifiers
export const PLAN_TO_PACKAGE_MAP: { [key: string]: string } = {
  'monthly_pro': '$rc_monthly',
  'sixMonth_premium': '$rc_six_month',
  'yearly_ultimate': '$rc_annual'
};

class PurchaseService {
  private static isInitialized = false;

  /**
   * Initializes the RevenueCat Purchases SDK.
   */
  static async initialize() {
    if (!REVENUECAT_API_KEY) {
      console.error('RevenueCat API key not configured');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: null
      });

      // In development, enable debug logging.
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      return false;
    }
  }

  /**
   * Retrieves the current offerings from RevenueCat.
   */
  static async getOfferings(): Promise<PurchasesOffering | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const offerings = await Purchases.getOfferings();
      console.log('RevenueCat offerings:', offerings.current?.availablePackages);
      return offerings.current;
    } catch (error) {
      console.error('Error getting offerings:', error);
      return null;
    }
  }

  /**
   * Purchases a package based on the plan ID.
   */
  static async purchasePackage(planId: string): Promise<CustomerInfo> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const offerings = await this.getOfferings();
      if (!offerings) throw new Error('No offerings available');

      const rcPackageId = PLAN_TO_PACKAGE_MAP[planId];
      if (!rcPackageId) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      console.log(`Mapped plan id "${planId}" to package id "${rcPackageId}"`);

      // Find the package matching the identifier.
      const purchasePkg = offerings.availablePackages.find(
        pkg => pkg.identifier.trim().toLowerCase() === rcPackageId.trim().toLowerCase()
      );

      if (!purchasePkg) {
        console.error('Package not found. Available packages:', offerings.availablePackages.map(p => p.identifier));
        throw new Error(`Package not found for plan: ${planId} (${rcPackageId})`);
      }

      console.log('Attempting purchase for package:', purchasePkg.identifier);
      const { customerInfo } = await Purchases.purchasePackage(purchasePkg);
      console.log('Purchase successful. Customer info:', customerInfo);
      return customerInfo;
    } catch (error: any) {
      // Only log errors that are not cancellations.
      if (!error.userCancelled) {
        console.error('Purchase error:', error);
      }
      throw error;
    }
  }

  /**
   * Restores previous purchases.
   */
  static async restorePurchases(): Promise<CustomerInfo> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await Purchases.restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
      throw error;
    }
  }

  /**
   * Shows the paywall and attempts to purchase the monthly package.
   */
  static async showPaywall(): Promise<{ success: boolean }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const offerings = await this.getOfferings();
      if (!offerings) throw new Error('No offerings available');
      
      const monthlyPackage = offerings.availablePackages.find(
        pkg => pkg.identifier === '$rc_monthly'
      );
      
      if (!monthlyPackage) throw new Error('Monthly package not available');
      
      console.log('Showing paywall with package:', monthlyPackage.identifier);
      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
      return { success: Boolean(customerInfo.entitlements.active) };
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Paywall error:', error);
      }
      return { success: false };
    }
  }
}

export default PurchaseService;

