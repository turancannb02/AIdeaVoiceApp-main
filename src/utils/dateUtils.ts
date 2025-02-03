export function getDaysRemaining(endDate?: string | Date): number {
  if (!endDate) return 0;

  try {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      console.warn('Invalid end date:', endDate);
      return 0;
    }

    const now = new Date();
    // Set time to beginning of day for more accurate day calculation
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return 0;
  }
}