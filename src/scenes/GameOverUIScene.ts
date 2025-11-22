import Phaser from 'phaser';
import * as utils from '../utils';
import { BEARParkAPI } from '../BEARParkAPI';

interface LeaderboardEntry {
  name: string;
  score: number;
  coins: number;
  date: string;
  avatar?: string; // Profile photo URL
}

/**
 * GameOverUIScene - Shows game over screen with score and leaderboard
 */
export class GameOverUIScene extends Phaser.Scene {
  private currentLevelKey: string | null;
  private isRestarting: boolean;
  private uiContainer: Phaser.GameObjects.DOMElement | null;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  
  // Score data
  private score: number = 0;
  private bestScore: number = 0;
  private coinsCollected: number = 0;
  private isNewHighScore: boolean = false;

  // Honey Points data
  private honeyPointsEarned: number = 0;
  private honeyMinutesToday: number = 0;
  private honeyMaxMinutes: number = 123;
  private honeyRemainingMinutes: number = 0;

  // Leaderboard
  private leaderboard: LeaderboardEntry[] = [];
  private playerName: string = "";
  private nameSubmitted: boolean = false;

  constructor() {
    super({
      key: "GameOverUIScene",
    });
    this.currentLevelKey = null;
    this.isRestarting = false;
    this.uiContainer = null;
  }

  init(data: {
    currentLevelKey?: string;
    score?: number;
    bestScore?: number;
    coinsCollected?: number;
    isNewHighScore?: boolean;
    honeyPointsEarned?: number;
    honeyMinutesToday?: number;
    honeyMaxMinutes?: number;
    honeyRemainingMinutes?: number;
  }) {
    // Receive data from game scene
    this.currentLevelKey = data.currentLevelKey || "GameScene";
    this.score = data.score || 0;
    this.bestScore = data.bestScore || 0;
    this.coinsCollected = data.coinsCollected || 0;
    this.isNewHighScore = data.isNewHighScore || false;

    // Honey points data
    this.honeyPointsEarned = data.honeyPointsEarned || 0;
    this.honeyMinutesToday = data.honeyMinutesToday || 0;
    this.honeyMaxMinutes = data.honeyMaxMinutes || 123;
    this.honeyRemainingMinutes = data.honeyRemainingMinutes || 0;

    // Reset restart flag
    this.isRestarting = false;
    this.nameSubmitted = false;
    this.playerName = "";
  }

  async create(): Promise<void> {
    console.log('🔍 [DEBUG] === GameOverUIScene.create() called ===');
    console.log('🔍 [DEBUG] Score:', this.score, 'Best:', this.bestScore);
    console.log('🍯 [DEBUG] Honey Points Earned:', this.honeyPointsEarned);
    console.log('🍯 [DEBUG] Honey Minutes Today:', this.honeyMinutesToday);
    console.log('🍯 [DEBUG] Honey Max Minutes:', this.honeyMaxMinutes);
    console.log('🍯 [DEBUG] Honey Remaining:', this.honeyRemainingMinutes);
    console.log('🔍 [DEBUG] Authentication status:', BEARParkAPI.isAuthenticated());
    console.log('🔍 [DEBUG] Wallet:', BEARParkAPI.getWalletAddress());
    console.log('🔍 [DEBUG] Display name:', BEARParkAPI.getCurrentUserDisplayName());

    // CRITICAL: Disable Phaser canvas input to prevent it from blocking DOM UI on mobile
    if (this.game.canvas) {
      this.game.canvas.style.pointerEvents = 'none';
      this.game.canvas.style.touchAction = 'none';
      console.log('🔍 [DEBUG] Canvas input disabled for Game Over screen');
    }

    // Wait for leaderboard to load before creating UI
    await this.loadLeaderboard();
    console.log('🔍 [DEBUG] Leaderboard loaded, creating UI...');

    // Create DOM UI
    this.createDOMUI();
    console.log('🔍 [DEBUG] DOM UI created');

    // Setup input controls
    this.setupInputs();
    console.log('🔍 [DEBUG] Inputs setup complete');

    // Auto-submit score if user is authenticated with BEAR Park
    if (BEARParkAPI.isAuthenticated()) {
      const displayName = BEARParkAPI.getCurrentUserDisplayName();
      console.log('🔐 User authenticated as: ${displayName} - auto-submitting score');
      // Auto-submit the score immediately
      this.submitScore(displayName);
    } else {
      console.log('ℹ️ [DEBUG] User not authenticated - showing name entry form');
    }
  }
  
  /**
   * Calculate star rating based on score (out of 5 stars)
   */
  getStarCount(): number {
    if (this.score >= 150) return 5;
    if (this.score >= 100) return 4;
    if (this.score >= 60) return 3;
    if (this.score >= 30) return 2;
    if (this.score >= 15) return 1;
    return 0;
  }
  
  /**
   * Generate star rating HTML with animation (5 stars total)
   */
  getStarRatingHTML(): string {
    const stars = this.getStarCount();
    let html = '';

    for (let i = 0; i < 5; i++) {
      const isFilled = i < stars;
      const star = isFilled ? '⭐' : '☆';
      const animationDelay = i * 0.12;

      html += `
        <div style="
          font-size: 32px;
          filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.8));
          animation: ${isFilled ? 'starPop' : 'none'} 0.5s ease-out ${animationDelay}s both;
        ">${star}</div>
      `;
    }

    return html;
  }

  createDOMUI(): void {
    console.log('🔍 [DEBUG] createDOMUI called');
    console.log('🔍 [DEBUG] this.leaderboard before rendering:', this.leaderboard);

    // BEAR Park Theme Colors
    const colors = {
      gold: '#edb723',
      purple: '#680cd9',
      yellow: '#feb501',
      green: '#07ae08',
      charcoal: '#141619',
      ink: '#0b0d0e'
    };

    const newHighScoreText = this.isNewHighScore
      ? `<div style="
           font-size: 28px;
           color: ${colors.gold};
           text-shadow: 3px 3px 0px #000000;
           animation: sparkle 0.5s ease-in-out infinite alternate;
           margin-bottom: 20px;
           font-family: 'Luckiest Guy', cursive;
         ">✨ NEW HIGH SCORE! ✨</div>`
      : '';

    // Generate leaderboard HTML with BEAR Park style (top 10)
    console.log('🔍 [DEBUG] Generating leaderboard HTML from', this.leaderboard.length, 'entries');
    const leaderboardHTML = this.leaderboard.slice(0, 10).map((entry, index) => {
      const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
      const borderColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : colors.gold));
      const borderWidth = index === 0 ? '4px' : (index === 1 ? '3px' : (index === 2 ? '3px' : '2px'));
      const bgGradient = index === 0
        ? 'linear-gradient(135deg, rgba(237, 183, 35, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%)'
        : (index === 1
          ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(169, 169, 169, 0.15) 100%)'
          : (index === 2
            ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(184, 115, 51, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(104, 12, 217, 0.15) 0%, rgba(7, 174, 8, 0.15) 100%)'));

      // Avatar URL with fallback
      const avatarUrl = entry.avatar || 'https://files.catbox.moe/25ekkd.png';

      return `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          margin-bottom: 6px;
          border-radius: 8px;
          background: ${bgGradient};
          border-left: ${borderWidth} solid ${borderColor};
          transition: all 0.2s ease;
          font-family: 'Luckiest Guy', cursive;
        " onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">
          <div style="font-size: 18px; color: ${colors.gold}; text-shadow: 1px 1px 0px #000; min-width: 36px;">
            ${medal || `#${index + 1}`}
          </div>
          <img src="${avatarUrl}" alt="${entry.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid ${colors.gold}; margin: 0 8px;" onerror="this.src='https://files.catbox.moe/25ekkd.png'">
          <div style="font-size: 16px; color: #fff; text-shadow: 1px 1px 0px #000; flex: 1; margin: 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${entry.name}
          </div>
          <div style="font-size: 18px; color: ${colors.yellow}; text-shadow: 1px 1px 0px #000;">
            ${entry.score.toLocaleString()}
          </div>
        </div>
      `;
    }).join('');

    console.log('🔍 [DEBUG] Generated leaderboard HTML length:', leaderboardHTML.length);
    console.log('🔍 [DEBUG] Leaderboard HTML preview:', leaderboardHTML.substring(0, 200));

    const uiHTML = `
      <div id="game-over-container" style="
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(180deg, ${colors.charcoal} 0%, ${colors.ink} 100%);
        z-index: 2147483647 !important;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Luckiest Guy', cursive;
        pointer-events: auto !important;
        touch-action: auto !important;
      ">
        <div style="
          max-width: 600px;
          width: 100%;
          padding: 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 100vh;
          overflow-y: auto;
        ">

          <!-- Game Over Title -->
          <div style="
            font-size: 40px;
            text-align: center;
            color: #ff3333;
            text-shadow: 3px 3px 0px #000000;
            animation: gameOverPulse 1s ease-in-out infinite alternate;
            font-family: 'Luckiest Guy', cursive;
            line-height: 1;
          ">GAME OVER</div>

          ${newHighScoreText}

          <!-- Star Rating -->
          <div style="display: flex; justify-content: center; gap: 8px; margin: 4px 0;">
            ${this.getStarRatingHTML()}
          </div>

          <!-- Score Card with Tri-Color Border -->
          <div style="
            position: relative;
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.12), transparent 60%), ${colors.ink};
            border-radius: 16px;
            padding: 16px;
            isolation: isolate;
          ">
            <!-- Tri-color border -->
            <div style="
              content: '';
              position: absolute;
              inset: 0;
              border-radius: 16px;
              padding: 3px;
              background: linear-gradient(135deg, ${colors.purple} 0%, ${colors.purple} 33.33%, ${colors.yellow} 33.33%, ${colors.yellow} 66.66%, ${colors.green} 66.66%, ${colors.green} 100%);
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              pointer-events: none;
              z-index: 0;
              opacity: 1;
            "></div>

            <div style="position: relative; z-index: 1;">
              <div style="font-size: 16px; color: ${colors.gold}; text-shadow: 1px 1px 0px rgba(0,0,0,0.5); margin-bottom: 4px; text-transform: uppercase; text-align: center;">
                YOUR SCORE
              </div>
              <div style="font-size: 36px; color: #fff; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); text-align: center; line-height: 1;">
                ${this.score}
              </div>
              <div style="font-size: 14px; color: #fff; text-align: center; margin-top: 4px;">🪙 ${this.coinsCollected} XRP</div>
            </div>
          </div>

          <!-- Honey Points Card -->
          <div style="
            background: linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.1) 100%);
            border-radius: 12px;
            padding: 12px;
            border: 2px solid rgba(255,215,0,0.3);
            box-shadow: 0 0 20px rgba(255,215,0,0.2);
          ">
            <div style="
              font-size: 32px;
              text-align: center;
              margin-bottom: 8px;
              filter: drop-shadow(0 0 8px rgba(255,215,0,0.6));
            ">🍯</div>

            <div style="
              font-size: 24px;
              color: ${colors.gold};
              text-align: center;
              text-shadow: 2px 2px 0px rgba(0,0,0,0.5);
              margin-bottom: 8px;
              font-family: 'Luckiest Guy', cursive;
            ">
              +${this.honeyPointsEarned.toFixed(1)} HONEY POINTS
            </div>

            ${this.honeyPointsEarned > 0 ? `
            <div style="
              font-size: 14px;
              color: rgba(255,255,255,0.9);
              text-align: center;
              margin-top: 8px;
              padding: 8px;
              background: rgba(0,0,0,0.3);
              border-radius: 8px;
            ">
              <div style="margin-bottom: 4px;">
                📊 <span style="color: ${colors.yellow};">${this.honeyMinutesToday.toFixed(1)}</span> / ${this.honeyMaxMinutes} minutes today
              </div>
              ${this.honeyRemainingMinutes > 0
                ? `<div style="color: ${colors.green};">⏱️ ${this.honeyRemainingMinutes.toFixed(1)} minutes left!</div>`
                : `<div style="color: #ff79c6;">🔥 Daily limit reached!</div>`
              }
            </div>
            ` : `
            <div style="
              font-size: 13px;
              color: rgba(255,255,255,0.7);
              text-align: center;
              margin-top: 8px;
              padding: 8px;
              background: rgba(0,0,0,0.3);
              border-radius: 8px;
            ">
              ${BEARParkAPI.isAuthenticated()
                ? '⚠️ No honey earned (game too short or daily limit reached)'
                : '🔒 Connect wallet at bearpark.xyz to earn honey!'}
            </div>
            `}
          </div>

          <!-- Name Entry Form (only shown if NOT authenticated) -->
          ${BEARParkAPI.isAuthenticated() ? '' : `
          <div id="name-entry-container" style="
            background: linear-gradient(180deg, rgba(237,183,35,0.12) 0%, #1a1d22 100%);
            border-radius: 12px;
            padding: 12px;
            border-bottom: 3px solid;
            border-image: linear-gradient(to right, ${colors.purple} 0%, ${colors.purple} 33.33%, ${colors.yellow} 33.33%, ${colors.yellow} 66.66%, ${colors.green} 66.66%, ${colors.green} 100%) 1;
          ">
            <div style="
              font-size: 14px;
              color: ${colors.gold};
              text-shadow: 1px 1px 0px #000;
              margin-bottom: 8px;
              text-align: center;
              font-family: 'Luckiest Guy', cursive;
            ">ENTER YOUR NAME</div>

            <input
              id="player-name-input"
              type="text"
              maxlength="12"
              placeholder="Your Name"
              style="
                width: 100%;
                padding: 10px;
                font-size: 18px;
                font-family: 'Luckiest Guy', cursive;
                text-align: center;
                background: rgba(255, 255, 255, 0.9);
                border: 3px solid ${colors.gold};
                border-radius: 8px;
                outline: none;
                color: #000;
                margin-bottom: 8px;
                box-sizing: border-box;
                pointer-events: auto;
                touch-action: manipulation;
              "
            />

            <button
              id="submit-name-btn"
              style="
                width: 100%;
                padding: 10px;
                font-size: 18px;
                font-family: 'Luckiest Guy', cursive;
                background: linear-gradient(135deg, ${colors.gold} 0%, #d4a617 100%);
                color: #000;
                border: 2px solid rgba(255,255,255,.5);
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 3px 12px rgba(237,183,35,.5);
                transition: all 0.2s ease;
                text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
                pointer-events: auto;
                touch-action: manipulation;
              "
              onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 4px 16px rgba(237,183,35,.7)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 3px 12px rgba(237,183,35,.5)';"
              onmousedown="this.style.transform='scale(0.97)';"
              onmouseup="this.style.transform='scale(1.03)';"
              ontouchstart="this.style.transform='scale(0.97)';"
              ontouchend="this.style.transform='scale(1)';"
            >
              SUBMIT SCORE
            </button>

            <div style="
              font-size: 11px;
              color: rgba(255,255,255,0.6);
              text-align: center;
              margin-top: 8px;
              font-family: Arial, sans-serif;
            ">
              Connect your wallet at <a href="https://bearpark.xyz" target="_blank" style="color: ${colors.gold}; text-decoration: underline;">bearpark.xyz</a> to save your scores!
            </div>
          </div>
          `}

          <!-- Leaderboard Title -->
          <div style="
            font-size: 20px;
            color: ${colors.gold};
            text-shadow: 2px 2px 0px #000;
            text-align: center;
            text-transform: uppercase;
            font-family: 'Luckiest Guy', cursive;
          ">🏆 TOP 10 PLAYERS 🏆</div>

          <!-- Leaderboard -->
          <div style="
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.08), transparent 60%), ${colors.ink};
            border-radius: 12px;
            padding: 10px;
            max-height: 340px;
            overflow-y: auto;
          ">
            ${leaderboardHTML || '<div style="color: #fff; font-size: 14px; text-align: center;">No scores yet!</div>'}
          </div>

          <!-- Retry Button -->
          <button
            id="tap-retry-btn"
            style="
              width: 100%;
              padding: 12px;
              font-size: 24px;
              font-family: 'Luckiest Guy', cursive;
              background: linear-gradient(135deg, #ff3333 0%, #cc0000 100%);
              color: #fff;
              border: 3px solid rgba(255,255,255,.3);
              border-radius: 12px;
              cursor: pointer;
              box-shadow: 0 4px 16px rgba(255,51,51,.5);
              transition: all 0.2s ease;
              text-shadow: 2px 2px 0px #000;
              animation: blink 1s ease-in-out infinite alternate;
              pointer-events: auto;
              touch-action: manipulation;
            "
            onmouseover="this.style.transform='scale(1.03)'; this.style.boxShadow='0 5px 20px rgba(255,51,51,.7)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(255,51,51,.5)';"
            onmousedown="this.style.transform='scale(0.97)';"
            onmouseup="this.style.transform='scale(1.03)';"
            ontouchstart="this.style.transform='scale(0.97)';"
            ontouchend="this.style.transform='scale(1)';"
          >
            TAP TO RETRY
          </button>

          <!-- Main Menu Button -->
          <button
            id="main-menu-btn"
            style="
              width: 100%;
              padding: 10px;
              font-size: 18px;
              font-family: 'Luckiest Guy', cursive;
              background: rgba(255,255,255,0.1);
              color: #fff;
              border: 2px solid rgba(255,255,255,.3);
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-shadow: 2px 2px 0px #000;
              pointer-events: auto;
              touch-action: manipulation;
            "
            onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='${colors.gold}';"
            onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,.3)';"
            ontouchstart="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='${colors.gold}';"
            ontouchend="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,.3)';"
          >
            MAIN MENU
          </button>

          <!-- Back to BEAR Park Button -->
          <button
            id="back-to-bearpark-btn"
            style="
              width: 100%;
              padding: 10px;
              font-size: 18px;
              font-family: 'Luckiest Guy', cursive;
              background: linear-gradient(135deg, ${colors.purple} 0%, ${colors.yellow} 50%, ${colors.green} 100%);
              color: #fff;
              border: 2px solid rgba(255,255,255,.3);
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-shadow: 2px 2px 0px #000;
              pointer-events: auto;
              touch-action: manipulation;
              box-shadow: 0 3px 12px rgba(237,183,35,.3);
            "
            onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 16px rgba(237,183,35,.5)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 3px 12px rgba(237,183,35,.3)';"
            onmousedown="this.style.transform='scale(0.98)';"
            onmouseup="this.style.transform='scale(1.02)';"
            ontouchstart="this.style.transform='scale(0.98)';"
            ontouchend="this.style.transform='scale(1)';"
          >
            🏠 BACK TO BEAR PARK
          </button>

        </div>

        <!-- Custom Animations -->
        <style>
          @keyframes gameOverPulse {
            from { transform: scale(1); }
            to { transform: scale(1.05); }
          }

          @keyframes blink {
            from { opacity: 0.8; }
            to { opacity: 1; }
          }

          @keyframes sparkle {
            from {
              filter: brightness(1);
              transform: scale(1);
            }
            to {
              filter: brightness(1.3);
              transform: scale(1.05);
            }
          }

          @keyframes starPop {
            0% {
              transform: scale(0) rotate(0deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.3) rotate(180deg);
            }
            100% {
              transform: scale(1) rotate(360deg);
              opacity: 1;
            }
          }

          input:focus {
            border-color: ${colors.purple} !important;
            box-shadow: 0 0 0 4px rgba(104, 12, 217, 0.3) !important;
          }

          @media (max-width: 600px) {
            #game-over-container > div:first-child {
              padding-top: 20px;
            }
          }
        </style>
      </div>
    `;

    // Add DOM element to scene
    this.uiContainer = utils.initUIDom(this, uiHTML);
    
    // Setup name submission
    this.setupNameSubmission();
  }

  setupInputs(): void {
    // Clear previous event listeners
    this.input.off('pointerdown');

    // Create keyboard input
    this.enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Setup retry button click handler
    const retryBtn = document.getElementById('tap-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.returnToTitle();
      });
    }

    // Setup main menu button click handler
    const menuBtn = document.getElementById('main-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.returnToTitle();
      });
    }

    // Setup back to BEAR Park button click handler
    const bearParkBtn = document.getElementById('back-to-bearpark-btn');
    if (bearParkBtn) {
      bearParkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Redirect to BEAR Park home
        window.location.href = 'https://www.bearpark.xyz';
      });
    }

    // Listen for key events
    this.enterKey?.on('down', () => {
      // Check if input is focused
      const input = document.getElementById('player-name-input') as HTMLInputElement;
      if (input && document.activeElement === input) {
        return; // Don't restart if typing in input
      }
      this.returnToTitle();
    });
    this.spaceKey?.on('down', () => {
      // Check if input is focused
      const input = document.getElementById('player-name-input') as HTMLInputElement;
      if (input && document.activeElement === input) {
        return; // Don't restart if typing in input
      }
      this.returnToTitle();
    });
  }

  setupNameSubmission(): void {
    const submitBtn = document.getElementById('submit-name-btn');
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
    
    if (submitBtn && nameInput) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const name = nameInput.value.trim();
        if (name.length > 0) {
          this.submitScore(name);
        }
      });
      
      // Handle all keyboard events in the input to prevent interference
      nameInput.addEventListener('keydown', (e) => {
        // Prevent Phaser from handling keyboard events while typing
        e.stopPropagation();
      });
      
      nameInput.addEventListener('keypress', (e) => {
        // Prevent Phaser from handling keyboard events while typing
        e.stopPropagation();
        
        if (e.key === 'Enter') {
          e.preventDefault();
          const name = nameInput.value.trim();
          if (name.length > 0) {
            this.submitScore(name);
          }
        }
      });
      
      nameInput.addEventListener('keyup', (e) => {
        // Prevent Phaser from handling keyboard events while typing
        e.stopPropagation();
      });
    }
  }

  async loadLeaderboard(): Promise<void> {
    // Fetch leaderboard from BEAR Park central API
    console.log('🔍 [DEBUG] Loading leaderboard from BEAR Park API...');
    try {
      const centralLeaderboard = await BEARParkAPI.getLeaderboard(10);
      console.log('🔍 [DEBUG] Central leaderboard response:', centralLeaderboard);
      console.log('🔍 [DEBUG] Central leaderboard length:', centralLeaderboard?.length);

      if (centralLeaderboard && centralLeaderboard.length > 0) {
        // Transform central leaderboard entries to match local format
        console.log('🔍 [DEBUG] Raw central leaderboard entries:', JSON.stringify(centralLeaderboard, null, 2));
        this.leaderboard = centralLeaderboard.map(entry => {
          const displayName = BEARParkAPI.formatDisplayName(entry);
          console.log('🔍 [DEBUG] Entry:', entry, 'Display name:', displayName);

          // Parse avatar_nft JSON to get imageUrl
          let avatarUrl = 'https://files.catbox.moe/25ekkd.png'; // Default BEAR logo
          if (entry.avatar_nft) {
            try {
              const avatarData = typeof entry.avatar_nft === 'string' ? JSON.parse(entry.avatar_nft) : entry.avatar_nft;
              if (avatarData.imageUrl) {
                avatarUrl = avatarData.imageUrl;
              }
            } catch (e) {
              console.warn('Failed to parse avatar_nft for', displayName, e);
            }
          }

          return {
            name: displayName,
            score: entry.score,
            coins: entry.metadata?.coins || 0,
            date: entry.created_at || new Date().toISOString(),
            avatar: avatarUrl
          };
        });
        console.log('✅ Loaded BEAR Park central leaderboard:', this.leaderboard);
      } else {
        console.log('⚠️ [DEBUG] Central leaderboard is empty, using local fallback');
        // Fallback to local leaderboard if central API fails or is empty
        const saved = localStorage.getItem('flappyBearLeaderboard');
        if (saved) {
          this.leaderboard = JSON.parse(saved);
          console.log('ℹ️ Using local leaderboard as fallback:', this.leaderboard);
        } else {
          this.leaderboard = [];
          console.log('⚠️ [DEBUG] No local leaderboard found - leaderboard is empty');
        }
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error loading central leaderboard:', error);
      // Fallback to local leaderboard
      const saved = localStorage.getItem('flappyBearLeaderboard');
      if (saved) {
        this.leaderboard = JSON.parse(saved);
        console.log('ℹ️ Using local leaderboard as fallback after error:', this.leaderboard);
      } else {
        this.leaderboard = [];
        console.log('⚠️ [DEBUG] No local leaderboard found after error');
      }
    }
    console.log('🔍 [DEBUG] Final leaderboard state:', this.leaderboard);
  }

  async submitScore(name: string): Promise<void> {
    if (this.nameSubmitted) return;

    console.log('🔍 [DEBUG] submitScore called with name:', name);
    console.log('🔍 [DEBUG] Score:', this.score, 'Coins:', this.coinsCollected);
    console.log('🔍 [DEBUG] Is authenticated:', BEARParkAPI.isAuthenticated());
    console.log('🔍 [DEBUG] Wallet address:', BEARParkAPI.getWalletAddress());

    this.nameSubmitted = true;
    this.playerName = name;

    // Save to local storage for offline backup
    const newEntry: LeaderboardEntry = {
      name: name,
      score: this.score,
      coins: this.coinsCollected,
      date: new Date().toISOString()
    };

    // Update local leaderboard
    const saved = localStorage.getItem('flappyBearLeaderboard');
    const localLeaderboard = saved ? JSON.parse(saved) : [];
    localLeaderboard.push(newEntry);
    localLeaderboard.sort((a, b) => b.score - a.score);
    localStorage.setItem('flappyBearLeaderboard', JSON.stringify(localLeaderboard.slice(0, 10)));
    console.log('🔍 [DEBUG] Saved to local leaderboard:', localLeaderboard.slice(0, 10));

    // Submit score to BEAR Park central leaderboard
    try {
      console.log('🔍 [DEBUG] Submitting score to BEAR Park API...');
      const result = await BEARParkAPI.submitScore(this.score, {
        coins: this.coinsCollected,
        player_name: name
      });
      console.log('🔍 [DEBUG] Submit score result:', result);

      if (result.success && result.is_high_score) {
        console.log('🎉 New BEAR Park high score!');
      } else if (result.success) {
        console.log('✅ Score submitted successfully (not a high score)');
      } else {
        console.log('⚠️ [DEBUG] Score submission returned success: false');
      }

      // Reload leaderboard from central API to show updated rankings
      console.log('🔍 [DEBUG] Reloading leaderboard after submission...');
      await this.loadLeaderboard();

      // For authenticated users, we need to update the UI to show the new leaderboard
      if (BEARParkAPI.isAuthenticated()) {
        console.log('🔍 [DEBUG] Recreating UI for authenticated user...');
        if (this.uiContainer) {
          this.uiContainer.destroy();
        }
        this.createDOMUI();
        this.setupInputs();
        console.log('🔍 [DEBUG] UI recreated successfully');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error submitting to BEAR Park:', error);
      // If submission fails, add to local leaderboard
      this.leaderboard.push(newEntry);
      this.leaderboard.sort((a, b) => b.score - a.score);
      this.leaderboard = this.leaderboard.slice(0, 10);
    }

    // Play UI click sound (only if manual submission)
    if (!BEARParkAPI.isAuthenticated()) {
      this.sound.play("ui_click", { volume: 0.3 });
    }

    // Hide name entry form (if it exists)
    const nameContainer = document.getElementById('name-entry-container');
    if (nameContainer) {
      nameContainer.style.display = 'none';
    }

    // Recreate UI for manual submissions to show updated leaderboard
    if (!BEARParkAPI.isAuthenticated()) {
      if (this.uiContainer) {
        this.uiContainer.destroy();
      }
      this.createDOMUI();
      this.setupInputs();
    }
  }

  returnToTitle(): void {
    // Prevent multiple triggers
    if (this.isRestarting) return;
    this.isRestarting = true;

    // Play UI click sound
    this.sound.play("ui_click", { volume: 0.3 });

    console.log(`💀 PLAYER DIED - AGGRESSIVE BOSS BONUS CLEARING`);

    // ULTRA AGGRESSIVE: Use GameScene's static method
    import('./GameScene').then((module) => {
      module.default.aggressiveClearBossBonuses();
    });

    // Also clear the old way for IMMEDIATE safety
    localStorage.removeItem("flappyBearSpeedMultiplier");
    localStorage.removeItem("flappyBearAccumulatedScore");
    sessionStorage.removeItem("flappyBearSpeedMultiplier");
    sessionStorage.removeItem("flappyBearAccumulatedScore");

    console.log("💥 ULTRA AGGRESSIVE CLEAR: All boss bonuses ELIMINATED after death");

    // CRITICAL: Re-enable canvas input for gameplay
    if (this.game.canvas) {
      this.game.canvas.style.pointerEvents = 'auto';
      this.game.canvas.style.touchAction = 'auto';
      console.log('🔍 [DEBUG] Canvas input re-enabled for gameplay');
    }

    // DON'T stop background music - let it continue playing!
    // Music is managed globally by MusicManager

    // Clear event listeners
    this.input.off('pointerdown');
    if (this.enterKey) {
      this.enterKey.off('down');
    }
    if (this.spaceKey) {
      this.spaceKey.off('down');
    }

    // Stop all game-related scenes
    this.scene.stop("UIScene");
    this.scene.stop(this.currentLevelKey!);

    // Return to title screen
    this.scene.start("TitleScreen");
  }

  update(): void {
    // Game Over UI scene doesn't need special update logic
  }
}
