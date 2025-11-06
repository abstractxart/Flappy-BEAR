import Phaser from 'phaser';
import * as utils from '../utils';
import { BEARParkAPI } from '../BEARParkAPI';

interface LeaderboardEntry {
  name: string;
  score: number;
  coins: number;
  date: string;
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
  }) {
    // Receive data from game scene
    this.currentLevelKey = data.currentLevelKey || "GameScene";
    this.score = data.score || 0;
    this.bestScore = data.bestScore || 0;
    this.coinsCollected = data.coinsCollected || 0;
    this.isNewHighScore = data.isNewHighScore || false;
    
    // Reset restart flag
    this.isRestarting = false;
    this.nameSubmitted = false;
    this.playerName = "";
    
    // Load leaderboard
    this.loadLeaderboard();
  }

  create(): void {
    // Create DOM UI
    this.createDOMUI();
    // Setup input controls
    this.setupInputs();
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
          font-size: 56px;
          filter: drop-shadow(3px 3px 5px rgba(0,0,0,0.8));
          animation: ${isFilled ? 'starPop' : 'none'} 0.5s ease-out ${animationDelay}s both;
        ">${star}</div>
      `;
    }
    
    return html;
  }

  createDOMUI(): void {
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

    // Generate leaderboard HTML with BEAR Park style
    const leaderboardHTML = this.leaderboard.map((entry, index) => {
      const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
      const borderColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : colors.gold));
      const borderWidth = index === 0 ? '6px' : (index === 1 ? '5px' : (index === 2 ? '5px' : '4px'));
      const bgGradient = index === 0
        ? 'linear-gradient(135deg, rgba(237, 183, 35, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%)'
        : (index === 1
          ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(169, 169, 169, 0.15) 100%)'
          : (index === 2
            ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(184, 115, 51, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(104, 12, 217, 0.15) 0%, rgba(7, 174, 8, 0.15) 100%)'));

      return `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 12px;
          background: ${bgGradient};
          border-left: ${borderWidth} solid ${borderColor};
          transition: all 0.2s ease;
          font-family: 'Luckiest Guy', cursive;
        " onmouseover="this.style.transform='translateX(8px)'" onmouseout="this.style.transform='translateX(0)'">
          <div style="font-size: 24px; color: ${colors.gold}; text-shadow: 2px 2px 0px #000; min-width: 50px;">
            ${medal || `#${index + 1}`}
          </div>
          <div style="font-size: 20px; color: #fff; text-shadow: 2px 2px 0px #000; flex: 1; margin: 0 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${entry.name}
          </div>
          <div style="font-size: 24px; color: ${colors.yellow}; text-shadow: 2px 2px 0px #000;">
            ${entry.score.toLocaleString()}
          </div>
        </div>
      `;
    }).join('');

    const uiHTML = `
      <div id="game-over-container" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: linear-gradient(180deg, ${colors.charcoal} 0%, ${colors.ink} 100%);
        z-index: 10000;
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        font-family: 'Luckiest Guy', cursive;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          padding-bottom: calc(160px + env(safe-area-inset-bottom));
        ">

          <!-- Game Over Title -->
          <div style="
            font-size: 64px;
            text-align: center;
            color: #ff3333;
            text-shadow: 5px 5px 0px #000000;
            margin-bottom: 20px;
            animation: gameOverPulse 1s ease-in-out infinite alternate;
            font-family: 'Luckiest Guy', cursive;
          ">GAME OVER</div>

          ${newHighScoreText}

          <!-- Star Rating -->
          <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 20px;">
            ${this.getStarRatingHTML()}
          </div>

          <!-- Score Card with Tri-Color Border -->
          <div style="
            position: relative;
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.12), transparent 60%), ${colors.ink};
            border-radius: 28px;
            padding: 32px;
            margin-bottom: 24px;
            isolation: isolate;
          ">
            <!-- Tri-color border -->
            <div style="
              content: '';
              position: absolute;
              inset: 0;
              border-radius: 28px;
              padding: 4px;
              background: linear-gradient(135deg, ${colors.purple} 0%, ${colors.purple} 33.33%, ${colors.yellow} 33.33%, ${colors.yellow} 66.66%, ${colors.green} 66.66%, ${colors.green} 100%);
              -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask-composite: exclude;
              pointer-events: none;
              z-index: 0;
              opacity: 1;
            "></div>

            <div style="font-size: 24px; color: ${colors.gold}; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); margin-bottom: 8px; text-transform: uppercase; text-align: center;">
              YOUR SCORE
            </div>
            <div style="font-size: 56px; color: #fff; text-shadow: 4px 4px 0px rgba(0,0,0,0.5); text-align: center;">
              ${this.score}
            </div>
            <div style="font-size: 18px; color: #fff; text-align: center; margin-top: 8px;">🪙 ${this.coinsCollected} XRP Collected</div>
          </div>

          <!-- Name Entry Form -->
          <div id="name-entry-container" style="
            background: linear-gradient(180deg, rgba(237,183,35,0.12) 0%, #1a1d22 100%);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 24px;
            border-bottom: 4px solid;
            border-image: linear-gradient(to right, ${colors.purple} 0%, ${colors.purple} 33.33%, ${colors.yellow} 33.33%, ${colors.yellow} 66.66%, ${colors.green} 66.66%, ${colors.green} 100%) 1;
          ">
            <div style="
              font-size: 20px;
              color: ${colors.gold};
              text-shadow: 2px 2px 0px #000;
              margin-bottom: 12px;
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
                padding: 16px;
                font-size: 24px;
                font-family: 'Luckiest Guy', cursive;
                text-align: center;
                background: rgba(255, 255, 255, 0.9);
                border: 4px solid ${colors.gold};
                border-radius: 12px;
                outline: none;
                color: #000;
                margin-bottom: 12px;
                box-sizing: border-box;
              "
            />

            <button
              id="submit-name-btn"
              style="
                width: 100%;
                padding: 16px;
                font-size: 28px;
                font-family: 'Luckiest Guy', cursive;
                background: linear-gradient(135deg, ${colors.gold} 0%, #d4a617 100%);
                color: #000;
                border: 3px solid rgba(255,255,255,.5);
                border-radius: 12px;
                cursor: pointer;
                box-shadow: 0 4px 16px rgba(237,183,35,.5);
                transition: all 0.2s ease;
                text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
              "
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(237,183,35,.7)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(237,183,35,.5)';"
              onmousedown="this.style.transform='scale(0.95)';"
              onmouseup="this.style.transform='scale(1.05)';"
            >
              SUBMIT SCORE
            </button>
          </div>

          <!-- Leaderboard Title -->
          <div style="
            font-size: 32px;
            color: ${colors.gold};
            text-shadow: 3px 3px 0px #000;
            text-align: center;
            margin-bottom: 16px;
            text-transform: uppercase;
            font-family: 'Luckiest Guy', cursive;
          ">🏆 TOP 10 PLAYERS 🏆</div>

          <!-- Leaderboard -->
          <div style="
            background: radial-gradient(500px 200px at 50% -20%, rgba(118,174,255,.08), transparent 60%), ${colors.ink};
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 24px;
          ">
            ${leaderboardHTML || '<div style="color: #fff; font-size: 18px; text-align: center;">No scores yet!</div>'}
          </div>

          <!-- Retry Button -->
          <button
            id="tap-retry-btn"
            style="
              width: 100%;
              padding: 20px;
              font-size: 36px;
              font-family: 'Luckiest Guy', cursive;
              background: linear-gradient(135deg, #ff3333 0%, #cc0000 100%);
              color: #fff;
              border: 4px solid rgba(255,255,255,.3);
              border-radius: 16px;
              cursor: pointer;
              box-shadow: 0 6px 20px rgba(255,51,51,.5);
              transition: all 0.2s ease;
              text-shadow: 3px 3px 0px #000;
              animation: blink 1s ease-in-out infinite alternate;
              margin-bottom: 16px;
            "
            onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 8px 24px rgba(255,51,51,.7)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 6px 20px rgba(255,51,51,.5)';"
            onmousedown="this.style.transform='scale(0.95)';"
            onmouseup="this.style.transform='scale(1.05)';"
          >
            TAP TO RETRY
          </button>

          <!-- Main Menu Button -->
          <button
            id="main-menu-btn"
            style="
              width: 100%;
              padding: 16px;
              font-size: 24px;
              font-family: 'Luckiest Guy', cursive;
              background: rgba(255,255,255,0.1);
              color: #fff;
              border: 3px solid rgba(255,255,255,.3);
              border-radius: 12px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-shadow: 2px 2px 0px #000;
            "
            onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='${colors.gold}';"
            onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,255,255,.3)';"
          >
            MAIN MENU
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

  loadLeaderboard(): void {
    const saved = localStorage.getItem('flappyBearLeaderboard');
    if (saved) {
      this.leaderboard = JSON.parse(saved);
    } else {
      this.leaderboard = [];
    }
  }

  submitScore(name: string): void {
    if (this.nameSubmitted) return;
    
    this.nameSubmitted = true;
    this.playerName = name;
    
    // Add to leaderboard
    const newEntry: LeaderboardEntry = {
      name: name,
      score: this.score,
      coins: this.coinsCollected,
      date: new Date().toISOString()
    };
    
    this.leaderboard.push(newEntry);
    
    // Sort by score (descending)
    this.leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    this.leaderboard = this.leaderboard.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('flappyBearLeaderboard', JSON.stringify(this.leaderboard));

    // Submit score to BEAR Park central leaderboard
    BEARParkAPI.submitScore(this.score, {
      coins: this.coinsCollected,
      player_name: name
    }).then(result => {
      if (result.success && result.is_high_score) {
        console.log('🎉 New BEAR Park high score!');
      }
    }).catch(error => {
      console.error('Error submitting to BEAR Park:', error);
    });

    // Play UI click sound
    this.sound.play("ui_click", { volume: 0.3 });
    
    // Hide name entry form
    const nameContainer = document.getElementById('name-entry-container');
    if (nameContainer) {
      nameContainer.style.display = 'none';
    }
    
    // Recreate UI to show updated leaderboard
    if (this.uiContainer) {
      this.uiContainer.destroy();
    }
    this.createDOMUI();
    this.setupInputs();
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
