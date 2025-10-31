import Phaser from 'phaser';
import * as utils from '../utils';

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
    const newHighScoreText = this.isNewHighScore 
      ? `<div class="text-yellow-300 font-bold mb-2" style="
           font-size: 28px;
           text-shadow: 3px 3px 0px #000000;
           animation: sparkle 0.5s ease-in-out infinite alternate;
         ">✨ NEW HIGH SCORE! ✨</div>`
      : '';
    
    // Generate leaderboard HTML
    const leaderboardHTML = this.leaderboard.map((entry, index) => {
      const isCurrentPlayer = entry.score === this.score && !this.nameSubmitted;
      const bgColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : '#34495E'));
      const textColor = index < 3 ? '#000000' : '#FFFFFF';
      
      return `
        <div class="flex items-center justify-between px-4 py-2 ${isCurrentPlayer ? 'game-3d-container-clickable-[#3498DB]' : ''}" style="background-color: ${bgColor}; border-radius: 8px;">
          <div class="flex items-center gap-3">
            <div class="font-bold" style="font-size: 20px; color: ${textColor}; min-width: 30px;">#${index + 1}</div>
            <div class="font-bold" style="font-size: 18px; color: ${textColor};">${entry.name}</div>
          </div>
          <div class="flex gap-6">
            <div class="font-bold" style="font-size: 18px; color: ${textColor};">${entry.score}</div>
            <div style="font-size: 16px; color: ${textColor};">🪙 ${entry.coins}</div>
          </div>
        </div>
      `;
    }).join('');
    
    const uiHTML = `
      <div id="game-over-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-supercell flex flex-col overflow-y-auto" style="background: linear-gradient(180deg, rgba(44, 62, 80, 0.95) 0%, rgba(52, 73, 94, 0.95) 100%);">
        <!-- Main Content Container -->
        <div class="flex flex-col items-center justify-start gap-6 p-6 pt-12 text-center pointer-events-auto pb-32">
          
          <!-- Game Over Title -->
          <div id="game-over-title" class="text-red-400 font-bold pointer-events-none" style="
            font-size: 56px;
            text-shadow: 5px 5px 0px #000000;
            animation: gameOverBounce 0.8s ease-in-out;
          ">GAME OVER</div>
          
          ${newHighScoreText}

          <!-- Star Rating -->
          <div class="flex gap-3 mb-2">
            ${this.getStarRatingHTML()}
          </div>

          <!-- Score Display -->
          <div class="game-3d-container-[#3498DB] px-8 py-4 w-full max-w-sm">
            <div class="text-white font-bold mb-1" style="font-size: 24px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              YOUR SCORE
            </div>
            <div class="text-yellow-300 font-bold" style="font-size: 48px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5);">
              ${this.score}
            </div>
            <div class="text-white mt-1" style="font-size: 18px;">🪙 ${this.coinsCollected} XRP Collected</div>
          </div>
          
          <!-- Name Entry Form -->
          <div id="name-entry-container" class="w-full max-w-sm">
            <div class="game-3d-container-[#6B46C1] px-6 py-4">
              <div class="text-white font-bold mb-3" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                ENTER YOUR NAME
              </div>
              <input 
                id="player-name-input" 
                type="text" 
                maxlength="12" 
                placeholder="Your Name" 
                class="w-full px-4 py-3 text-center font-bold pointer-events-auto"
                style="
                  font-size: 24px;
                  background-color: rgba(255, 255, 255, 0.9);
                  border: 4px solid #2C3E50;
                  border-radius: 8px;
                  outline: none;
                  font-family: SupercellMagic;
                "
              />
              <button 
                id="submit-name-btn" 
                class="w-full mt-3 game-3d-container-clickable-[#27AE60] px-6 py-3 font-bold pointer-events-auto cursor-pointer"
                style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5); color: white;"
              >
                SUBMIT
              </button>
            </div>
          </div>

          <!-- Leaderboard -->
          <div class="w-full max-w-sm">
            <div class="text-white font-bold mb-3" style="font-size: 28px; text-shadow: 3px 3px 0px #000000;">
              🏆 TOP 10 PLAYERS 🏆
            </div>
            <div class="game-3d-container-slot-[#2C3E50] p-3">
              <div class="flex flex-col gap-2">
                ${leaderboardHTML || '<div class="text-white" style="font-size: 18px;">No scores yet!</div>'}
              </div>
            </div>
          </div>

          <!-- Tap to Retry Button -->
          <button 
            id="tap-retry-btn" 
            class="game-3d-container-clickable-[#E74C3C] px-12 py-4 font-bold pointer-events-auto cursor-pointer mt-4"
            style="
              font-size: 32px;
              text-shadow: 3px 3px 0px #000000;
              color: white;
              transition: all 0.2s ease;
              animation: blink 1s ease-in-out infinite alternate;
            "
            onmouseover="this.style.transform='scale(1.1)'; this.style.filter='brightness(1.2)';"
            onmouseout="this.style.transform='scale(1)'; this.style.filter='brightness(1)';"
            onmousedown="this.style.transform='scale(0.95)';"
            onmouseup="this.style.transform='scale(1.1)';"
            ontouchstart="this.style.transform='scale(0.95)';"
            ontouchend="this.style.transform='scale(1)';"
          >
            TAP TO RETRY
          </button>

        </div>

        <!-- Custom Animations -->
        <style>
          @keyframes gameOverBounce {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes blink {
            from { opacity: 0.7; }
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
          
          #tap-retry-btn:hover {
            transform: scale(1.1);
            filter: brightness(1.2);
          }
          
          #tap-retry-btn:active {
            transform: scale(0.95);
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

    // Listen for mouse/touch click events anywhere on screen (as fallback)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only restart if not clicking on input, buttons, or leaderboard area
      const target = pointer.event?.target as HTMLElement;
      if (target && (
        target.id === 'player-name-input' || 
        target.id === 'submit-name-btn' || 
        target.id === 'tap-retry-btn' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT'
      )) {
        return; // Don't restart when interacting with UI elements
      }
      this.returnToTitle();
    });

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
