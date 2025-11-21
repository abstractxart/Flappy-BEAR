import Phaser from 'phaser';
import * as utils from '../utils';
import { MusicManager } from '../MusicManager';

/**
 * TitleScreen - Main menu for Flappy Bear
 */
export class TitleScreen extends Phaser.Scene {
  // UI elements
  uiContainer!: Phaser.GameObjects.DOMElement;
  
  // Input controls - HTML event handlers
  keydownHandler?: (event: KeyboardEvent) => void;
  clickHandler?: (event: Event) => void;
  
  // Audio
  backgroundMusic!: Phaser.Sound.BaseSound;
  
  // State flags
  isStarting: boolean = false;
  
  // Best score display
  bestScore: number = 0;
  totalXRP: number = 0;
  totalGoldenBears: number = 0;

  constructor() {
    super({
      key: "TitleScreen",
    });
    this.isStarting = false;
  }

  init(): void {
    // Reset start flag
    this.isStarting = false;
    
    // Load best score and coin stats from localStorage
    this.bestScore = parseInt(localStorage.getItem("flappyBearBestScore") || "0");
    this.totalXRP = parseInt(localStorage.getItem("flappyBearTotalXRP") || "0");
    this.totalGoldenBears = parseInt(localStorage.getItem("flappyBearTotalGoldenBears") || "0");
  }

  create(): void {
    // Create repeating castle background
    this.createBackground();
    
    // Initialize sounds first
    this.initializeSounds();
    
    // Create DOM UI (includes background)
    this.createDOMUI();

    // Set up input controls
    this.setupInputs();

    // Play background music
    this.playBackgroundMusic();
    
    // Listen for scene shutdown to cleanup event listeners
    this.events.once('shutdown', () => {
      this.cleanupEventListeners();
    });
  }
  
  createBackground(): void {
    // Create static background image
    const bg = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      "title_screen_background"
    );
    bg.setOrigin(0.5, 0.5);
    
    // Scale to cover the screen while maintaining aspect ratio
    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    
    bg.setScrollFactor(0);
    bg.setDepth(-10);
  }

  createDOMUI(): void {
    let uiHTML = `
      <div id="title-screen-container" class="absolute top-0 left-0 w-full h-full pointer-events-none z-[1000] font-supercell flex flex-col justify-between items-center">
        <!-- Gradient Overlay for better readability -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>
        

        
        <!-- Mute Button (Top Right) -->
        <div class="absolute top-8 right-8 z-[1001]">
          <button id="mute-button" class="game-3d-container-clickable-[#FFD700] px-6 py-4 pointer-events-auto cursor-pointer hover:scale-110 transition-transform" style="min-width: 80px;">
            <div class="text-amber-900 font-bold text-center" style="font-size: 32px; text-shadow: 1px 1px 0px rgba(255,255,255,0.3);">
              <span id="mute-icon">MUTE</span>
            </div>
          </button>
        </div>
        
        <!-- Main Content Container -->
        <div class="flex flex-col justify-between w-full h-full relative z-10 py-8">
          
          <!-- Top Section - Game Title -->
          <div class="flex-1 flex flex-col items-center justify-center">
            <div id="game-title-container" class="flex-shrink-0 flex items-center justify-center">
              <img id="game-title-image" 
                   src="https://cdn-gambo-public.gambo.ai/assets/bOrJvKX990-4wH9aHMUqQ.png" 
                   alt="Flappy $Bear" 
                   class="max-h-[1000px] mx-20 object-contain pointer-events-none"
                   style="filter: drop-shadow(8px 8px 16px rgba(0,0,0,0.9)); animation: titleFloat 3s ease-in-out infinite;" />
            </div>
          </div>
          
          <!-- Bottom Section - Play Button and Stats -->
          <div class="flex flex-col items-center gap-6">
            <!-- Play Button -->
            <button id="play-button" class="game-3d-container-clickable-[#FFD700] px-20 py-6 pointer-events-auto cursor-pointer transition-all" style="
              min-width: 400px;
              animation: playButtonPulse 2s ease-in-out infinite;
            ">
              <div class="flex items-center justify-center gap-4">
                <div class="text-amber-900 font-bold text-center" style="font-size: 56px; text-shadow: 2px 2px 0px rgba(255,255,255,0.3);">
                  PLAY
                </div>
              </div>
            </button>
            
            <!-- Stats Container -->
            <div class="flex gap-4 items-stretch justify-center">
            <!-- Best Score -->
            <div class="game-3d-container-[#2C3E50] px-10 py-5" style="min-width: 260px;">
              <div class="text-yellow-400 font-bold" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                BEST SCORE
              </div>
              <div class="text-white font-bold" style="font-size: 48px; text-shadow: 4px 4px 0px rgba(0,0,0,0.5); background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                ${this.bestScore}
              </div>
            </div>
            
            <!-- Total XRP and $BEAR Collected -->
            <div class="game-3d-container-[#6B46C1] px-8 py-5" style="min-width: 360px;">
              <div class="text-yellow-300 font-bold mb-3" style="font-size: 18px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                TOTAL XRP & BEAR COLLECTED
              </div>
              <div class="flex gap-6 justify-center">
                <!-- XRP Count -->
                <div class="flex flex-col items-center">
                  <div class="text-gray-200" style="font-size: 16px; text-shadow: 1px 1px 0px rgba(0,0,0,0.5);">
                    XRP
                  </div>
                  <div class="text-white font-bold" style="font-size: 40px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5); background: linear-gradient(180deg, #9370DB 0%, #6B46C1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    ${this.totalXRP}
                  </div>
                </div>
                <!-- Golden Bear Count -->
                <div class="flex flex-col items-center">
                  <div class="text-gray-200" style="font-size: 16px; text-shadow: 1px 1px 0px rgba(0,0,0,0.5);">
                    BEAR
                  </div>
                  <div class="text-white font-bold" style="font-size: 40px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5); background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    ${this.totalGoldenBears}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

        </div>

        <!-- Custom Animations and Styles -->
        <style>
          @keyframes titleBlink {
            from { opacity: 0.4; }
            to { opacity: 1; }
          }
          
          @keyframes titleFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes playButtonPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); }
            50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(255, 215, 0, 0.9); }
          }
          

          
          #play-button:hover {
            transform: scale(1.1) !important;
            box-shadow: 0 0 50px rgba(255, 215, 0, 1) !important;
          }
          
          #play-button:active {
            transform: scale(0.95) !important;
          }
        </style>
      </div>
    `;

    // Add DOM element to the scene
    this.uiContainer = utils.initUIDom(this, uiHTML);
    
    // Setup mute button
    this.setupMuteButton();
    
    // Setup play button
    this.setupPlayButton();
  }
  
  setupMuteButton(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const muteButton = this.uiContainer.node.querySelector("#mute-button");
    const muteIcon = this.uiContainer.node.querySelector("#mute-icon");
    
    if (muteButton && muteIcon) {
      // Check if already muted from localStorage
      const isMuted = localStorage.getItem("flappyBearAllSoundsMuted") === "true";
      muteIcon.textContent = isMuted ? "UNMUTE" : "MUTE";
      
      // Apply initial mute state
      if (isMuted) {
        this.sound.mute = true;
        const musicManager = MusicManager.getInstance();
        musicManager.setMuted(true);
      }
      
      // Add click handler
      muteButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const newMutedState = !this.sound.mute;
        
        // Mute/unmute all sounds
        this.sound.mute = newMutedState;
        
        // Also mute/unmute music through MusicManager
        const musicManager = MusicManager.getInstance();
        musicManager.setMuted(newMutedState);
        
        // Update text
        muteIcon.textContent = newMutedState ? "UNMUTE" : "MUTE";
        
        // Save state
        localStorage.setItem("flappyBearAllSoundsMuted", newMutedState.toString());
        
        // Play UI click sound (if unmuting)
        if (!newMutedState) {
          this.sound.play("ui_click", { volume: 0.3 });
        }
      });
    }
  }
  
  setupPlayButton(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const playButton = this.uiContainer.node.querySelector("#play-button");
    
    if (playButton) {
      // Add click handler
      playButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startGame();
      });
    }
  }
  
  setupInputs(): void {
    // Add Phaser pointer input (for mouse and touch)
    this.input.on('pointerdown', () => {
      this.startGame();
    });

    // Add Phaser keyboard input for spacebar and enter
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    
    if (spaceKey) {
      spaceKey.on('down', () => {
        this.startGame();
      });
    }
    
    if (enterKey) {
      enterKey.on('down', () => {
        this.startGame();
      });
    }

    // Also add HTML event listeners as backup
    const handleStart = (event: Event) => {
      event.preventDefault();
      this.startGame();
    };

    // Listen for Enter and Space key events on the document
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.startGame();
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    
    // Add click event to the UI container
    if (this.uiContainer && this.uiContainer.node) {
      this.uiContainer.node.addEventListener('click', handleStart);
    }

    // Store event listeners for cleanup
    this.keydownHandler = handleKeyDown;
    this.clickHandler = handleStart;
  }

  initializeSounds(): void {
    // Initialize music using global MusicManager
    const musicManager = MusicManager.getInstance();
    musicManager.init(this);
  }

  playBackgroundMusic(): void {
    // Play music using global MusicManager
    const musicManager = MusicManager.getInstance();
    musicManager.play();
  }

  startGame(): void {
    // Prevent multiple triggers
    if (this.isStarting) return;
    this.isStarting = true;
    
    // Play UI click sound
    this.sound.play("ui_click", { volume: 0.3 });

    // RESET ALL GAME STATE when starting a new game
    console.log("🎮 STARTING NEW GAME - Resetting all game state");
    
    // Reset speed multiplier back to 1.0x
    localStorage.setItem("flappyBearSpeedMultiplier", "1.0");
    
    // Reset accumulated score back to 0
    localStorage.setItem("flappyBearAccumulatedScore", "0");
    
    // Reset bosses defeated count
    localStorage.setItem("flappyBearBossesDefeated", "0");
    
    // Reset last boss victory score
    localStorage.setItem("flappyBearLastBossVictoryScore", "0");
    
    console.log("✅ Game state reset: Speed=1.0x, Score=0, Bosses=0");

    // Clean up event listeners
    this.cleanupEventListeners();

    // DON'T stop background music - let it continue playing!
    // Music is managed globally by MusicManager

    // Add transition effect
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    // Start game scene after delay
    this.time.delayedCall(500, () => {
      console.log("🎮 TITLE SCREEN START - AGGRESSIVE BOSS BONUS CLEARING");
      
      // ULTRA AGGRESSIVE: Import and use GameScene's aggressive clear method
      import('./GameScene').then((module) => {
        module.default.aggressiveClearBossBonuses();
      });
      
      // Also clear the old way for IMMEDIATE safety
      localStorage.removeItem("flappyBearSpeedMultiplier");
      localStorage.removeItem("flappyBearAccumulatedScore");
      sessionStorage.removeItem("flappyBearSpeedMultiplier");
      sessionStorage.removeItem("flappyBearAccumulatedScore");
      
      console.log("💥 TITLE START: All boss bonuses ELIMINATED - starting fresh");
      
      this.scene.start("GameScene");
    });
  }

  cleanupEventListeners(): void {
    // Remove HTML event listeners
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    
    if (this.clickHandler && this.uiContainer && this.uiContainer.node) {
      this.uiContainer.node.removeEventListener('click', this.clickHandler);
    }
  }

  update(): void {
    // Title screen doesn't need special update logic
  }
}
