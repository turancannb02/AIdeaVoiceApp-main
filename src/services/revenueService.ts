import { Platform } from 'react-native';

// Mock service for testing in Expo Go
export class RevenueService {
  static async initialize() {
    try {
      console.log('RevenueCat initialized in test mode');
    } catch (error) {
      console.error('RevenueCat initialization error:', error);
    }
  }

  static async getOfferings() {
    // Return mock offerings for testing
    return [
      {
        identifier: 'monthly',
        packageType: 'MONTHLY',
        product: {
          price: 9.99,
          currency: 'EUR',
          description: 'Monthly subscription',
          title: 'Monthly Plan'
        }
      },
      {
        identifier: 'sixMonth',
        packageType: 'SIX_MONTH',
        product: {
          price: 44.99,
          currency: 'EUR',
          description: '6 Month subscription',
          title: '6 Month Plan'
        }
      },
      {
        identifier: 'yearly',
        packageType: 'YEARLY',
        product: {
          price: 79.99,
          currency: 'EUR',
          description: 'Annual subscription',
          title: 'Annual Plan'
        }
      }
    ];
  }

  static async purchasePackage(packageToPurchase: any) {
    // Simulate successful purchase
    return {
      success: true,
      customerInfo: {
        activeSubscriptions: [packageToPurchase.identifier],
        latestExpirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    };
  }

  static async restorePurchases() {
    // Simulate successful restore
    return {
      success: true,
      customerInfo: {
        activeSubscriptions: [],
        latestExpirationDate: null
      }
    };
  }
}