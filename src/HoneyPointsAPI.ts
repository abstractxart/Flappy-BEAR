/**
 * Honey Points API Integration
 * Awards honey points based on game duration (1 point per minute, max 123 minutes/day)
 */

const API_BASE_URL = 'https://bearpark-production.up.railway.app';
const GAME_ID = 'flappy-bear';
const POINTS_PER_MINUTE = 1;
const MAX_DAILY_MINUTES = 123;

export interface HoneyPointsResult {
  success: boolean;
  points_awarded?: number;
  minutes_today?: number;
  max_minutes?: number;
  remaining_minutes?: number;
  message?: string;
}

export class HoneyPointsAPI {
  /**
   * Award honey points based on game duration
   * @param minutesPlayed - Minutes played in this session (will be rounded to 0.1)
   * @returns Promise with honey points result
   */
  static async awardPoints(minutesPlayed: number): Promise<HoneyPointsResult> {
    try {
      const walletAddress = localStorage.getItem('xaman_wallet_address');

      if (!walletAddress) {
        console.log('ℹ️ No wallet connected, cannot award honey points');
        return {
          success: false,
          message: 'No wallet connected',
          points_awarded: 0,
          minutes_today: 0,
          max_minutes: MAX_DAILY_MINUTES,
          remaining_minutes: MAX_DAILY_MINUTES
        };
      }

      // Round to 0.1 minute precision
      const roundedMinutes = Math.round(minutesPlayed * 10) / 10;

      console.log(`🍯 Awarding honey points for ${GAME_ID} - ${roundedMinutes} minutes...`);

      const response = await fetch(`${API_BASE_URL}/api/games/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          game_id: GAME_ID,
          minutes_played: roundedMinutes
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Awarded ${data.points_awarded} honey points!`);
        console.log(`   ${data.minutes_today}/${data.max_minutes} mins today`);
      } else {
        console.log(`⚠️ ${data.message}`);
      }

      return data;

    } catch (error) {
      console.error('❌ Error awarding honey points:', error);
      return {
        success: false,
        message: 'Failed to award points',
        points_awarded: 0,
        minutes_today: 0,
        max_minutes: MAX_DAILY_MINUTES,
        remaining_minutes: MAX_DAILY_MINUTES
      };
    }
  }

  /**
   * Format minutes to display (e.g., "1.5 mins")
   */
  static formatMinutes(minutes: number): string {
    const rounded = Math.round(minutes * 10) / 10;
    return `${rounded} min${rounded !== 1 ? 's' : ''}`;
  }

  /**
   * Format honey points to display (e.g., "5.5 HP")
   */
  static formatPoints(points: number): string {
    const rounded = Math.round(points * 10) / 10;
    return `${rounded} HP`;
  }
}
