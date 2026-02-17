import { useEffect } from 'react';
import { checkScheduledOrders } from '@/services/notificationService';

export function useScheduler() {
  useEffect(() => {
    // Initial check on mount
    const runCheck = async () => {
        console.log('[Scheduler] Running initial check...');
        await checkScheduledOrders();
    };
    runCheck();

    // Setup interval (e.g., every 5 minutes in foreground)
    const intervalId = setInterval(async () => {
      console.log('[Scheduler] Running periodic check...');
      await checkScheduledOrders();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);
}
