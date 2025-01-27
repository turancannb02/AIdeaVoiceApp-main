
export function getDaysRemaining(endDate?: string | Date): number {

    if (!endDate) return 0;
  
    
  
    const end = new Date(endDate);
  
    const now = new Date();
  
    const diffTime = end.getTime() - now.getTime();
  
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
    
  
    return Math.max(0, diffDays);
  
  }
  