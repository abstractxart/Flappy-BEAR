import Phaser from "phaser";
import * as utils from "../utils";
import { MusicManager } from "../MusicManager";

/**
 * UIScene - Displays HUD during gameplay
 */
export default class UIScene extends Phaser.Scene {
  private currentGameSceneKey: string | null;
  private uiContainer: Phaser.GameObjects.DOMElement | null;
  
  // Score tracking
  private currentScore: number = 0;
  private currentCoins: number = 0;
  private currentGoldenBears: number = 0;
  private pipesPassed: number = 0;
  private xrpTokenPoints: number = 0;
  private goldenBearTokenPoints: number = 0;
  private pipePoints: number = 0;
  
  // Power-up tracking
  private jesterHatStacks: number = 0;
  private powerUpTimerInterval: NodeJS.Timeout | null = null;
  private powerUpEndTime: number = 0;
  
  // Achievement toast queue
  private achievementQueue: Array<{name: string, description: string}> = [];
  private isShowingAchievement: boolean = false;

  constructor() {
    super({
      key: "UIScene",
    });
    this.currentGameSceneKey = null;
    this.uiContainer = null;
  }
  
  init(data: { gameSceneKey?: string }) {
    // Receive current game scene key
    this.currentGameSceneKey = data.gameSceneKey || null;
    this.currentScore = 0;
    this.currentCoins = 0;
    this.currentGoldenBears = 0;
    this.pipesPassed = 0;
    this.xrpTokenPoints = 0;
    this.goldenBearTokenPoints = 0;
    this.pipePoints = 0;
    this.jesterHatStacks = 0;
  }
  
  create(): void {
    // Create DOM UI
    this.createDOMUI();
    
    // Listen for score updates from game scene
    if (this.currentGameSceneKey) {
      const gameScene = this.scene.get(this.currentGameSceneKey);
      
      gameScene.events.on("scoreUpdated", (score: number) => {
        this.currentScore = score;
        this.updateScoreDisplay();
      });
      
      gameScene.events.on("coinsUpdated", (coins: number, goldenBears: number, xrpPoints: number, goldenPoints: number) => {
        this.currentCoins = coins;
        this.currentGoldenBears = goldenBears;
        this.xrpTokenPoints = xrpPoints;
        this.goldenBearTokenPoints = goldenPoints;
        this.updateCoinsDisplay();
      });
      
      gameScene.events.on("pipesUpdated", (pipesPassed: number, pipePoints: number) => {
        this.pipesPassed = pipesPassed;
        this.pipePoints = pipePoints;
        this.updatePipesDisplay();
      });
      
      // Listen for jester hat power-up events
      gameScene.events.on("jesterHatActivated", (stacks: number) => {
        this.jesterHatStacks = stacks;
        this.showPowerUpTimer(5000); // 5 seconds
        this.updateJesterHatStackDisplay();
      });
      
      gameScene.events.on("jesterHatDeactivated", () => {
        this.jesterHatStacks = 0;
        this.hidePowerUpTimer();
      });
      
      // Listen for streak updates
      gameScene.events.on("streakUpdated", (streak: number) => {
        this.updateStreakDisplay(streak);
      });
      
      // Listen for streak lost events
      gameScene.events.on("streakLost", (previousStreak: number) => {
        this.handleStreakLost(previousStreak);
      });
      
      // Listen for achievement unlocks
      gameScene.events.on("achievementUnlocked", (data: { name: string, description: string }) => {
        this.showAchievementToast(data.name, data.description);
      });
    }
  }
  
  createDOMUI(): void {
    const uiHTML = `
      <div id="game-ui-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-supercell">
        <!-- Top HUD -->
        <div class="flex justify-between items-start p-8 gap-4">
          <!-- Left Side - Token Stats -->
          <div class="flex flex-col gap-3">
            <!-- XRP Tokens -->
            <div class="game-3d-container-[#6B46C1] px-4 py-2 flex items-center gap-2" style="min-width: 180px;">
              <div class="text-white font-bold" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                XRP:
              </div>
              <div id="xrp-count-display" class="text-yellow-300 font-bold" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                0
              </div>
              <div class="text-gray-300 font-bold" style="font-size: 16px; text-shadow: 1px 1px 0px rgba(0,0,0,0.5);">
                (<span id="xrp-points-display">0</span>pts)
              </div>
            </div>
            
            <!-- Golden Bear Tokens -->
            <div class="game-3d-container-[#FFD700] px-4 py-2 flex items-center gap-2" style="min-width: 180px;">
              <div class="text-amber-900 font-bold" style="font-size: 20px; text-shadow: 1px 1px 0px rgba(255,255,255,0.3);">
                🐻:
              </div>
              <div id="golden-count-display" class="text-amber-900 font-bold" style="font-size: 20px; text-shadow: 1px 1px 0px rgba(255,255,255,0.3);">
                0
              </div>
              <div class="text-amber-800 font-bold" style="font-size: 16px; text-shadow: 1px 1px 0px rgba(255,255,255,0.2);">
                (<span id="golden-points-display">0</span>pts)
              </div>
            </div>
            
            <!-- Pipes Passed -->
            <div class="game-3d-container-[#4A5568] px-4 py-2 flex items-center gap-2" style="min-width: 180px;">
              <div class="text-orange-300 font-bold" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                ⚡:
              </div>
              <div id="pipes-count-display" class="text-white font-bold" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                0
              </div>
              <div class="text-gray-300 font-bold" style="font-size: 16px; text-shadow: 1px 1px 0px rgba(0,0,0,0.5);">
                (<span id="pipes-points-display">0</span>pts)
              </div>
            </div>
          </div>
          
          <!-- Center - Score Display -->
          <div class="flex-1 flex justify-center">
            <div class="game-3d-container-[#2C3E50] px-8 py-4" style="min-width: 200px;">
              <div id="score-display" class="text-white text-center font-bold" style="font-size: 48px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5);">
                0
              </div>
            </div>
          </div>
          
          <!-- Right Side - Pause & Mute Buttons -->
          <div class="flex justify-end gap-3" style="width: 200px;">
            <button id="pause-button" class="game-3d-container-clickable-[#F39C12] px-6 py-4 pointer-events-auto cursor-pointer hover:scale-110 transition-transform" style="min-width: 80px;">
              <div class="text-white font-bold text-center" style="font-size: 32px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                ⏸️
              </div>
            </button>
            <button id="mute-button" class="game-3d-container-clickable-[#2C3E50] px-6 py-4 pointer-events-auto cursor-pointer hover:scale-110 transition-transform" style="min-width: 80px;">
              <div class="text-white font-bold text-center" style="font-size: 32px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                <span id="mute-icon">🔊</span>
              </div>
            </button>
          </div>
        </div>
        
        <!-- Tap to Start Instruction (shown before game starts) -->
        <div id="start-instruction" class="absolute bottom-32 left-1/2 -translate-x-1/2 text-white font-bold text-center" style="
          font-size: 36px;
          text-shadow: 3px 3px 0px #000000;
          animation: instructionBlink 1s ease-in-out infinite alternate;
        ">
          TAP TO START
        </div>
        
        <!-- Power-Up Timer (Jester Hat) - Positioned to the left -->
        <div id="powerup-timer-container" class="absolute top-48 left-1/3 -translate-x-1/2 hidden" style="z-index: 1001;">
          <div class="game-3d-container-[#FF6B00] px-6 py-2 flex items-center gap-3">
            <div class="text-white font-bold text-center" style="font-size: 16px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              🎪 INVINCIBLE
            </div>
            <div id="jester-stack-indicator" class="game-3d-container-clickable-[#FFD700] px-2 py-1 hidden">
              <div class="text-amber-900 font-bold" style="font-size: 14px; text-shadow: 1px 1px 0px rgba(255,255,255,0.3);">
                x<span id="jester-stack-count">1</span>
              </div>
            </div>
            <div class="text-yellow-300 font-bold" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              <span id="powerup-timer-seconds">5.0</span>s
            </div>
          </div>
        </div>
        
        <!-- Streak Counter -->
        <div id="streak-counter" class="absolute top-64 left-1/2 -translate-x-1/2 hidden" style="z-index: 1000;">
          <div class="game-3d-container-[#3498DB] px-6 py-3">
            <div class="text-white font-bold text-center" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              🔥 STREAK: <span id="streak-count">0</span>
            </div>
          </div>
        </div>
        
        <!-- Achievement Toast Container -->
        <div id="achievement-toast-container" class="absolute top-24 left-1/2 -translate-x-1/2" style="z-index: 2000;">
        </div>
        
        <!-- Mobile Missile Button (for boss fights) -->
        <div id="mobile-missile-button" class="absolute bottom-6 right-6 pointer-events-auto hidden">
          <button id="missile-action-button" class="game-3d-container-clickable-[#FF6B00] p-4 rounded-full hover:scale-110 transition-transform" style="width: 100px; height: 100px;">
            <img src="https://cdn-game-mcp.gambo.ai/375765b5-6398-4858-8581-3d0fdff4c7b5/images/mobile_missile_button.png" 
                 alt="Missile" 
                 class="w-full h-full object-contain pointer-events-none" />
          </button>
        </div>
      </div>
      
      <style>
        @keyframes instructionBlink {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
        
        @keyframes powerUpPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes achievementSlideIn {
          from {
            transform: translateY(-100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes achievementSlideOut {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100px);
            opacity: 0;
          }
        }
        
        #powerup-timer-container {
          animation: powerUpPulse 0.5s ease-in-out infinite;
        }
        
        @keyframes streakWiggle {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-10px); }
          20% { transform: translateX(10px); }
          30% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          50% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          70% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
          90% { transform: translateX(-2px); }
        }
      </style>
    `;
    
    this.uiContainer = utils.initUIDom(this, uiHTML);
    
    // Setup buttons
    this.setupMuteButton();
    this.setupPauseButton();
    
    // Hide start instruction when game starts
    if (this.currentGameSceneKey) {
      const gameScene = this.scene.get(this.currentGameSceneKey) as any;
      
      // Check if game has started
      this.time.addEvent({
        delay: 100,
        callback: () => {
          if (gameScene.gameStarted) {
            this.hideStartInstruction();
          }
        },
        repeat: 50
      });
    }
  }
  
  setupMuteButton(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const muteButton = this.uiContainer.node.querySelector("#mute-button");
    const muteIcon = this.uiContainer.node.querySelector("#mute-icon");
    
    if (muteButton && muteIcon) {
      // Check if already muted from localStorage
      const isMuted = localStorage.getItem("flappyBearAllSoundsMuted") === "true";
      muteIcon.textContent = isMuted ? "🔇" : "🔊";
      
      // Apply initial mute state
      if (isMuted) {
        this.sound.mute = true;
        const musicManager = MusicManager.getInstance();
        musicManager.setMuted(true);
      }
      
      // Add click handler
      muteButton.addEventListener("click", () => {
        const newMutedState = !this.sound.mute;
        
        // Mute/unmute all sounds
        this.sound.mute = newMutedState;
        
        // Also mute/unmute music through MusicManager
        const musicManager = MusicManager.getInstance();
        musicManager.setMuted(newMutedState);
        
        // Update icon
        muteIcon.textContent = newMutedState ? "🔇" : "🔊";
        
        // Save state
        localStorage.setItem("flappyBearAllSoundsMuted", newMutedState.toString());
        
        // Play UI click sound (if unmuting)
        if (!newMutedState) {
          this.sound.play("ui_click", { volume: 0.3 });
        }
      });
    }
  }
  
  setupPauseButton(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const pauseButton = this.uiContainer.node.querySelector("#pause-button");
    
    if (pauseButton) {
      pauseButton.addEventListener("click", () => {
        // Play click sound if not muted
        if (!this.sound.mute) {
          this.sound.play("ui_click", { volume: 0.3 });
        }
        
        // Pause the game
        if (this.currentGameSceneKey) {
          const gameScene = this.scene.get(this.currentGameSceneKey) as any;
          if (gameScene && gameScene.gameStarted && !gameScene.gameOver) {
            // Pause game scene
            this.scene.pause(this.currentGameSceneKey);
            
            // Launch pause menu
            this.scene.launch("PauseMenuScene", {
              gameSceneKey: this.currentGameSceneKey
            });
          }
        }
      });
    }
  }
  
  hideStartInstruction(): void {
    if (this.uiContainer && this.uiContainer.node) {
      const instruction = this.uiContainer.node.querySelector("#start-instruction");
      if (instruction) {
        (instruction as HTMLElement).style.display = "none";
      }
    }
  }
  
  updateScoreDisplay(): void {
    if (this.uiContainer && this.uiContainer.node) {
      const scoreElement = this.uiContainer.node.querySelector("#score-display");
      if (scoreElement) {
        scoreElement.textContent = this.currentScore.toString();
      }
    }
  }
  
  updateCoinsDisplay(): void {
    if (this.uiContainer && this.uiContainer.node) {
      // Update XRP token count
      const xrpCountElement = this.uiContainer.node.querySelector("#xrp-count-display");
      if (xrpCountElement) {
        xrpCountElement.textContent = this.currentCoins.toString();
      }
      
      // Update XRP points
      const xrpPointsElement = this.uiContainer.node.querySelector("#xrp-points-display");
      if (xrpPointsElement) {
        xrpPointsElement.textContent = this.xrpTokenPoints.toFixed(1);
      }
      
      // Update Golden Bear token count
      const goldenCountElement = this.uiContainer.node.querySelector("#golden-count-display");
      if (goldenCountElement) {
        goldenCountElement.textContent = this.currentGoldenBears.toString();
      }
      
      // Update Golden Bear points
      const goldenPointsElement = this.uiContainer.node.querySelector("#golden-points-display");
      if (goldenPointsElement) {
        goldenPointsElement.textContent = this.goldenBearTokenPoints.toFixed(1);
      }
    }
  }
  
  updateJesterHatStackDisplay(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const stackIndicator = this.uiContainer.node.querySelector("#jester-stack-indicator") as HTMLElement;
    const stackCount = this.uiContainer.node.querySelector("#jester-stack-count");
    
    if (stackIndicator && stackCount) {
      if (this.jesterHatStacks > 1) {
        stackIndicator.classList.remove("hidden");
        stackCount.textContent = this.jesterHatStacks.toString();
      } else {
        stackIndicator.classList.add("hidden");
      }
    }
  }
  
  updatePipesDisplay(): void {
    if (this.uiContainer && this.uiContainer.node) {
      // Update pipes passed count
      const pipesCountElement = this.uiContainer.node.querySelector("#pipes-count-display");
      if (pipesCountElement) {
        pipesCountElement.textContent = this.pipesPassed.toString();
      }
      
      // Update pipes points
      const pipesPointsElement = this.uiContainer.node.querySelector("#pipes-points-display");
      if (pipesPointsElement) {
        pipesPointsElement.textContent = this.pipePoints.toFixed(1);
      }
    }
  }
  
  showPowerUpTimer(duration: number): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const container = this.uiContainer.node.querySelector("#powerup-timer-container") as HTMLElement;
    if (!container) return;
    
    // Show the timer
    container.classList.remove("hidden");
    
    // Set end time
    this.powerUpEndTime = Date.now() + duration;
    
    // Clear any existing interval
    if (this.powerUpTimerInterval) {
      clearInterval(this.powerUpTimerInterval);
    }
    
    // Update timer every 100ms
    this.powerUpTimerInterval = setInterval(() => {
      this.updatePowerUpTimer();
    }, 100);
  }
  
  updatePowerUpTimer(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const timeLeft = Math.max(0, this.powerUpEndTime - Date.now());
    const seconds = (timeLeft / 1000).toFixed(1);
    
    // Update seconds display
    const secondsElement = this.uiContainer.node.querySelector("#powerup-timer-seconds");
    if (secondsElement) {
      secondsElement.textContent = seconds;
    }
    
    // If time is up, hide the timer
    if (timeLeft <= 0) {
      this.hidePowerUpTimer();
    }
  }
  
  hidePowerUpTimer(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const container = this.uiContainer.node.querySelector("#powerup-timer-container") as HTMLElement;
    if (container) {
      container.classList.add("hidden");
    }
    
    // Clear interval
    if (this.powerUpTimerInterval) {
      clearInterval(this.powerUpTimerInterval);
      this.powerUpTimerInterval = null;
    }
  }
  
  updateStreakDisplay(streak: number): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const streakCounter = this.uiContainer.node.querySelector("#streak-counter") as HTMLElement;
    const streakCount = this.uiContainer.node.querySelector("#streak-count");
    
    if (!streakCounter || !streakCount) return;
    
    if (streak >= 3) {
      // Show streak counter when at 3 or more
      streakCounter.classList.remove("hidden");
      streakCount.textContent = streak.toString();
    } else {
      // Hide when below 3
      streakCounter.classList.add("hidden");
    }
  }

  /**
   * Handle streak lost event - wiggle the UI elements
   */
  handleStreakLost(previousStreak: number): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    // Only create wiggle effect if there was actually a streak to lose (3+)
    if (previousStreak < 3) return;
    
    // Get UI elements to wiggle
    const elementsToWiggle = [
      this.uiContainer.node.querySelector("#score-display"),
      this.uiContainer.node.querySelector("#streak-counter"),
      this.uiContainer.node.querySelector("#xrp-count-display")?.parentElement,
      this.uiContainer.node.querySelector("#golden-count-display")?.parentElement,
      this.uiContainer.node.querySelector("#pipes-count-display")?.parentElement
    ];
    
    // Apply wiggle animation to each element
    elementsToWiggle.forEach((element) => {
      if (element) {
        const htmlElement = element as HTMLElement;
        
        // Add wiggle animation
        htmlElement.style.animation = "streakWiggle 0.6s ease-in-out";
        
        // Change color temporarily to red to indicate loss
        const originalColor = htmlElement.style.color;
        htmlElement.style.color = "#FF4444";
        
        // Remove animation and restore color after it completes
        setTimeout(() => {
          htmlElement.style.animation = "";
          htmlElement.style.color = originalColor;
        }, 600);
      }
    });
    
    // Also wiggle the entire streak counter if it was visible
    const streakCounter = this.uiContainer.node.querySelector("#streak-counter") as HTMLElement;
    if (streakCounter && !streakCounter.classList.contains("hidden")) {
      // Make it flash red before hiding
      streakCounter.style.animation = "streakWiggle 0.6s ease-in-out";
      streakCounter.style.backgroundColor = "#FF4444";
      
      setTimeout(() => {
        streakCounter.style.animation = "";
        streakCounter.style.backgroundColor = "";
        // Hide it after the animation since streak is now 0
        streakCounter.classList.add("hidden");
      }, 600);
    }
  }
  
  showAchievementToast(name: string, description: string): void {
    // Achievements disabled - they get in the way of gameplay
    return;
  }
  
  showNextAchievement(): void {
    // If queue is empty, stop
    if (this.achievementQueue.length === 0) {
      this.isShowingAchievement = false;
      return;
    }
    
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const container = this.uiContainer.node.querySelector("#achievement-toast-container");
    if (!container) return;
    
    // Mark as showing
    this.isShowingAchievement = true;
    
    // Get next achievement from queue
    const achievement = this.achievementQueue.shift();
    if (!achievement) return;
    
    // Create toast element
    const toast = document.createElement("div");
    toast.className = "game-3d-container-[#27AE60] px-8 py-4 mb-3";
    toast.style.minWidth = "400px";
    toast.style.animation = "achievementSlideIn 0.5s ease-out";
    toast.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="text-4xl">🏆</div>
        <div class="flex-1">
          <div class="text-yellow-300 font-bold" style="font-size: 20px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
            ACHIEVEMENT UNLOCKED!
          </div>
          <div class="text-white font-bold" style="font-size: 18px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
            ${achievement.name}
          </div>
          <div class="text-gray-200" style="font-size: 14px;">
            ${achievement.description}
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after 3 seconds and show next
    setTimeout(() => {
      toast.style.animation = "achievementSlideOut 0.5s ease-in";
      setTimeout(() => {
        toast.remove();
        // Show next achievement in queue
        this.showNextAchievement();
      }, 500);
    }, 3000);
  }
  
  shutdown(): void {
    // Clean up interval when scene shuts down
    if (this.powerUpTimerInterval) {
      clearInterval(this.powerUpTimerInterval);
      this.powerUpTimerInterval = null;
    }
  }
}

