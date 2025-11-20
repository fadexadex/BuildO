/**
 * ZK Quest Haptic Feedback System
 * Provides tactile feedback for mobile users
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

let isHapticsEnabled = true;

export const toggleHaptics = (enabled: boolean) => {
  isHapticsEnabled = enabled;
};

export const triggerHaptic = (type: HapticType) => {
  if (!isHapticsEnabled) return;

  // Check if vibration API is supported
  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10); // Short, sharp tap
        break;
      case 'medium':
        navigator.vibrate(20); // Noticeable tap
        break;
      case 'heavy':
        navigator.vibrate(40); // Strong feedback
        break;
      case 'success':
        navigator.vibrate([10, 30, 10]); // Da-DA-da pattern
        break;
      case 'error':
        navigator.vibrate([50, 30, 50, 30]); // Buzz-buzz pattern
        break;
      case 'warning':
        navigator.vibrate([30, 50]); // Short buzz
        break;
    }
  } catch (e) {
    // Ignore errors (some browsers might block if no user interaction)
    console.debug('Haptic feedback failed', e);
  }
};
