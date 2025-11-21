import Phaser from "phaser";
import * as utils from "../utils";
import { MusicManager } from "../MusicManager";

/**
 * BossUIScene - UI for boss fight with health bars and missile button
 */
export class BossUIScene extends Phaser.Scene {
  private uiContainer: Phaser.GameObjects.DOMElement | null = null;
  private currentGameSceneKey: string | null = null;
  private uiUpdateTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({
      key: "BossUIScene",
    });
  }

  init(data: { gameSceneKey?: string; bossType?: string; currentLevelKey?: string }) {
    this.currentGameSceneKey = data.currentLevelKey || data.gameSceneKey || "BossLevelScene";
  }

  create(): void {
    this.createDOMUI();
    this.setupMissileButton();
    this.setupPauseButton();
    this.setupMuteButton();
    
    // Update UI every frame
    this.uiUpdateTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: this.updateUI,
      callbackScope: this
    });
    
    // Setup pause/resume handlers
    this.setupPauseResumeHandlers();
  }

  createDOMUI(): void {
    const uiHTML = `
      <div id="boss-ui-container" class="absolute top-0 left-0 w-full h-full pointer-events-none z-[1000] font-supercell">
        
        <!-- Pause & Mute Buttons (Top Right) -->
        <div class="absolute top-4 right-4 flex gap-3 pointer-events-auto">
          <button id="pause-button" class="game-3d-container-clickable-[#F39C12] px-4 py-3 cursor-pointer hover:scale-110 transition-transform">
            <div class="text-white font-bold text-center" style="font-size: 24px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              ⏸️
            </div>
          </button>
          <button id="mute-button" class="game-3d-container-clickable-[#2C3E50] px-4 py-3 cursor-pointer hover:scale-110 transition-transform">
            <div class="text-white font-bold text-center" style="font-size: 24px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              <span id="mute-icon">🔊</span>
            </div>
          </button>
        </div>
        
        <!-- Top UI Bar -->
        <div class="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto">
          
          <!-- Player Health Bar -->
          <div class="game-3d-container-slot-[#2C3E50] p-2 w-80">
            <div class="text-white font-bold text-center mb-1" style="font-size: 16px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              BEAR HEALTH
            </div>
            <div class="relative h-6 bg-gray-700 rounded overflow-hidden">
              <div id="player-health-fill" class="game-3d-container-progress-fill-[#27AE60] h-full transition-all duration-300" style="width: 100%;">
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                <span id="player-health-text" class="text-white font-bold text-sm">3/3</span>
              </div>
            </div>
          </div>
          
          <!-- Boss Health Bar -->
          <div class="game-3d-container-slot-[#8B0000] p-2 w-80">
            <div class="text-yellow-300 font-bold text-center mb-1" style="font-size: 18px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
              <span id="boss-name">BOSS</span> - PHASE <span id="boss-phase">1</span>
            </div>
            <div class="relative h-8 bg-gray-700 rounded overflow-hidden">
              <div id="boss-health-fill" class="game-3d-container-progress-fill-[#E74C3C] h-full transition-all duration-300" style="width: 100%;">
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                <span id="boss-health-text" class="text-white font-bold">300/300</span>
              </div>
            </div>
          </div>
          
          <!-- Phase Instructions -->
          <div id="phase-instructions" class="game-3d-container-[#6B46C1] px-4 py-2 max-w-sm text-center">
            <div class="text-yellow-300 font-bold" style="font-size: 14px; text-shadow: 1px 1px 0px rgba(0,0,0,0.5);">
              PHASE 1: SHOOT ANYWHERE ON BOSS
            </div>
          </div>
        </div>
        
        <!-- Mobile Missile Button -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div class="relative">
            <!-- Cooldown overlay -->
            <div id="missile-cooldown-overlay" class="absolute inset-0 bg-gray-800 bg-opacity-70 rounded-full flex items-center justify-center" style="width: 140px; height: 140px;">
              <div class="text-white font-bold text-xl" id="missile-cooldown-text">0.0s</div>
            </div>
            <!-- Main button -->
            <button id="missile-button" class="game-3d-container-clickable-[#FF6B00] p-5 rounded-full cursor-pointer select-none" style="
              width: 140px; 
              height: 140px; 
              touch-action: manipulation; 
              user-select: none; 
              -webkit-user-select: none; 
              -webkit-touch-callout: none;
              pointer-events: auto;
              position: relative;
              z-index: 100;
              outline: none;
              border: none;
              background: inherit;
            ">
              <div class="text-white font-bold text-2xl pointer-events-none">🚀</div>
              <div class="text-white font-bold text-sm mt-1 pointer-events-none">MISSILE</div>
            </button>
            <!-- Ready indicator -->
            <div id="missile-ready-glow" class="absolute inset-0 rounded-full border-4 border-green-400 opacity-0 animate-pulse" style="width: 140px; height: 140px;"></div>
          </div>
        </div>
        
        <!-- Instructions -->
        <div class="absolute bottom-6 left-6 pointer-events-none">
          <div class="game-3d-container-[#2C3E50] px-4 py-2">
            <div class="text-white font-bold text-center" style="font-size: 14px; text-shadow: 1px 1px 0px rgba(0,0,0,0.5);">
              SPACE: Flap | X: Missile | TAP CENTER: Missile
            </div>
          </div>
        </div>
        
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  setupMissileButton(): void {
    if (!this.uiContainer || !this.uiContainer.node) {
      console.log("❌ No UI container or node for missile button setup");
      return;
    }
    
    const missileButton = this.uiContainer.node.querySelector("#missile-button") as HTMLElement;
    const cooldownOverlay = this.uiContainer.node.querySelector("#missile-cooldown-overlay") as HTMLElement;
    
    if (!missileButton) {
      console.log("❌ Missile button element not found!");
      return;
    }
    
    console.log("🚀 Setting up missile button event handlers");
    
    // Ensure proper CSS properties for touch/click
    missileButton.style.pointerEvents = "auto";
    missileButton.style.touchAction = "manipulation";
    missileButton.style.userSelect = "none";
    (missileButton.style as any).webkitUserSelect = "none";
    (missileButton.style as any).webkitTouchCallout = "none";
    
    // Handle missile firing
    const handleMissileActivation = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("🚀 Missile button activated via", e.type, "at", Date.now());
      
      // Check if the boss scene exists and is active
      if (!this.currentGameSceneKey) {
        console.log("❌ No current game scene key");
        return;
      }
      
      const bossScene = this.scene.get(this.currentGameSceneKey) as any;
      if (!bossScene) {
        console.log("❌ Boss scene not found:", this.currentGameSceneKey);
        return;
      }
      
      if (!bossScene.scene.isActive()) {
        console.log("❌ Boss scene not active");
        return;
      }
      
      // Check if methods exist
      if (!bossScene.handleMissileInput || !bossScene.isMissileReady) {
        console.log("❌ Boss scene missing missile methods");
        return;
      }
      
      // Check if missile is ready before firing
      if (bossScene.isMissileReady()) {
        console.log("✅ Firing missile from UI button");
        bossScene.handleMissileInput();
        
        // Strong visual feedback for successful missile fire
        missileButton.style.transform = "scale(0.8)";
        missileButton.style.backgroundColor = "#00FF00";
        missileButton.style.boxShadow = "0 0 20px #00FF00";
        
        this.time.delayedCall(150, () => {
          missileButton.style.transform = "";
          missileButton.style.backgroundColor = "";
          missileButton.style.boxShadow = "";
        });
        
        // Create floating "FIRED!" text for debug
        this.createDebugText("FIRED!", missileButton, "#00FF00");
        
      } else {
        console.log("⏳ Missile not ready yet - cooldown active");
        
        // Visual feedback for cooldown
        missileButton.style.filter = "brightness(0.5)";
        missileButton.style.backgroundColor = "#FF0000";
        
        this.time.delayedCall(300, () => {
          missileButton.style.filter = "";
          missileButton.style.backgroundColor = "";
        });
        
        // Create floating "COOLDOWN!" text for debug
        this.createDebugText("COOLDOWN!", missileButton, "#FF0000");
      }
    };
    
    // Clean up any existing handlers
    if ((missileButton as any)._clickHandler) {
      missileButton.removeEventListener("click", (missileButton as any)._clickHandler);
    }
    if ((missileButton as any)._touchHandler) {
      missileButton.removeEventListener("touchend", (missileButton as any)._touchHandler);
    }
    
    // Store handlers for cleanup
    (missileButton as any)._clickHandler = handleMissileActivation;
    (missileButton as any)._touchHandler = handleMissileActivation;
    
    // Add event listeners with explicit options
    missileButton.addEventListener("click", handleMissileActivation, { 
      passive: false, 
      capture: false 
    });
    
    missileButton.addEventListener("touchend", handleMissileActivation, { 
      passive: false, 
      capture: false 
    });
    
    // Handle touch feedback
    missileButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("👆 Missile button touch start");
      missileButton.style.transform = "scale(0.95)";
    }, { passive: false });
    
    missileButton.addEventListener("touchmove", (e) => {
      e.preventDefault(); // Prevent scrolling
    }, { passive: false });
    
    missileButton.addEventListener("touchcancel", () => {
      console.log("🚫 Missile button touch cancelled");
      missileButton.style.transform = "";
    });
    
    // Handle mouse feedback
    missileButton.addEventListener("mousedown", (e) => {
      e.preventDefault();
      console.log("🖱️ Missile button mouse down");
      missileButton.style.transform = "scale(0.95)";
    });
    
    missileButton.addEventListener("mouseup", () => {
      missileButton.style.transform = "";
    });
    
    missileButton.addEventListener("mouseleave", () => {
      missileButton.style.transform = "";
    });
    
    // Make sure cooldown overlay doesn't block events
    if (cooldownOverlay) {
      cooldownOverlay.style.pointerEvents = "none";
      console.log("🔧 Cooldown overlay set to not block pointer events");
    }
    
    // Force enable pointer events on the button container
    const buttonContainer = missileButton.parentElement;
    if (buttonContainer) {
      buttonContainer.style.pointerEvents = "auto";
    }
    
    console.log("✅ Missile button setup complete with enhanced touch/click handling");
  }

  createDebugText(text: string, element: HTMLElement, color: string): void {
    // Create debug text that floats up from the button
    const rect = element.getBoundingClientRect();
    const debugText = document.createElement("div");
    debugText.textContent = text;
    debugText.style.position = "fixed";
    debugText.style.left = `${rect.left + rect.width / 2}px`;
    debugText.style.top = `${rect.top}px`;
    debugText.style.color = color;
    debugText.style.fontSize = "24px";
    debugText.style.fontWeight = "bold";
    debugText.style.fontFamily = "SupercellMagic";
    debugText.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
    debugText.style.pointerEvents = "none";
    debugText.style.zIndex = "10000";
    debugText.style.transform = "translateX(-50%)";
    debugText.style.transition = "all 1s ease-out";
    
    document.body.appendChild(debugText);
    
    // Animate up and fade out
    setTimeout(() => {
      debugText.style.transform = "translateX(-50%) translateY(-100px)";
      debugText.style.opacity = "0";
    }, 50);
    
    // Remove after animation
    setTimeout(() => {
      if (debugText.parentNode) {
        debugText.parentNode.removeChild(debugText);
      }
    }, 1100);
  }

  updateUI(): void {
    if (!this.currentGameSceneKey || !this.uiContainer || !this.uiContainer.node) return;
    
    const bossScene = this.scene.get(this.currentGameSceneKey) as any;
    if (!bossScene || !bossScene.bear || !bossScene.boss) return;
    
    // Update player health
    const playerHealthFill = this.uiContainer.node.querySelector("#player-health-fill") as HTMLElement;
    const playerHealthText = this.uiContainer.node.querySelector("#player-health-text");
    
    if (playerHealthFill && playerHealthText) {
      const healthPercentage = (bossScene.bear.health / bossScene.bear.maxHealth) * 100;
      playerHealthFill.style.width = `${healthPercentage}%`;
      playerHealthText.textContent = `${bossScene.bear.health}/${bossScene.bear.maxHealth}`;
      
      // Change color based on health
      if (healthPercentage > 60) {
        playerHealthFill.className = "game-3d-container-progress-fill-[#27AE60] h-full transition-all duration-300";
      } else if (healthPercentage > 30) {
        playerHealthFill.className = "game-3d-container-progress-fill-[#F39C12] h-full transition-all duration-300";
      } else {
        playerHealthFill.className = "game-3d-container-progress-fill-[#E74C3C] h-full transition-all duration-300";
      }
    }
    
    // Update boss health
    const bossHealthFill = this.uiContainer.node.querySelector("#boss-health-fill") as HTMLElement;
    const bossHealthText = this.uiContainer.node.querySelector("#boss-health-text");
    const bossPhase = this.uiContainer.node.querySelector("#boss-phase");
    const bossName = this.uiContainer.node.querySelector("#boss-name");
    
    if (bossHealthFill && bossHealthText && bossPhase) {
      const healthPercentage = bossScene.boss.getHealthPercentage();
      bossHealthFill.style.width = `${healthPercentage}%`;
      bossHealthText.textContent = `${bossScene.boss.health}/${bossScene.boss.maxHealth}`;
      bossPhase.textContent = bossScene.boss.currentPhase.toString();
      
      // Update boss name based on scene
      if (bossName) {
        if (this.currentGameSceneKey === "SecondBossLevelScene") {
          bossName.textContent = "SECOND BOSS";
        } else {
          bossName.textContent = "GARY GENSLER";
        }
      }
    }
    
    // Update phase instructions
    const phaseInstructions = this.uiContainer.node.querySelector("#phase-instructions") as HTMLElement;
    if (phaseInstructions) {
      const phase = bossScene.boss.currentPhase;
      let instruction = "";
      
      if (this.currentGameSceneKey === "SecondBossLevelScene") {
        // Second boss - hit anywhere for all phases
        switch (phase) {
          case 1:
            instruction = "PHASE 1: SHOOT ANYWHERE ON BOSS";
            break;
          case 2:
            instruction = "PHASE 2: TWIN FIREBALLS - SHOOT ANYWHERE";
            break;
          case 3:
            instruction = "PHASE 3: MULTI-ATTACK - SHOOT ANYWHERE";
            break;
        }
      } else {
        // Gary Gensler boss - now accepts hits anywhere (same as second boss)
        switch (phase) {
          case 1:
            instruction = "PHASE 1: SHOOT ANYWHERE ON GARY";
            break;
          case 2:
            instruction = "PHASE 2: MOUTH LASER - SHOOT ANYWHERE";
            break;
          case 3:
            instruction = "PHASE 3: THIRD EYE - SHOOT ANYWHERE";
            break;
        }
      }
      
      const instructionElement = phaseInstructions.querySelector("div");
      if (instructionElement) {
        instructionElement.textContent = instruction;
      }
    }
    
    // Update missile button cooldown
    this.updateMissileButton(bossScene);
  }

  updateMissileButton(bossScene: any): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const cooldownOverlay = this.uiContainer.node.querySelector("#missile-cooldown-overlay") as HTMLElement;
    const cooldownText = this.uiContainer.node.querySelector("#missile-cooldown-text") as HTMLElement;
    const readyGlow = this.uiContainer.node.querySelector("#missile-ready-glow") as HTMLElement;
    const missileButton = this.uiContainer.node.querySelector("#missile-button") as HTMLElement;
    
    if (!cooldownOverlay || !cooldownText || !readyGlow || !missileButton) return;
    
    const isReady = bossScene.isMissileReady();
    const cooldownProgress = bossScene.getMissileCooldownProgress();
    
    if (isReady) {
      // Missile is ready - hide cooldown, show glow
      cooldownOverlay.style.opacity = "0";
      readyGlow.style.opacity = "1";
      missileButton.style.filter = "brightness(1.2)";
    } else {
      // Missile is on cooldown
      const remainingTime = bossScene.missileCooldown - (bossScene.time.now - bossScene.lastMissileTime);
      const remainingSeconds = Math.max(0, remainingTime / 1000);
      
      cooldownOverlay.style.opacity = "1";
      cooldownText.textContent = `${remainingSeconds.toFixed(1)}s`;
      readyGlow.style.opacity = "0";
      missileButton.style.filter = "brightness(0.7)";
    }
  }

  setupPauseButton(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;
    
    const pauseButton = this.uiContainer.node.querySelector("#pause-button");
    
    if (pauseButton) {
      pauseButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log("⏸️ Pause button clicked in boss fight - Scene:", this.currentGameSceneKey);
        
        // Launch pause menu scene
        this.scene.launch("PauseMenuScene", {
          gameSceneKey: this.currentGameSceneKey
        });
        
        // Pause the boss scene
        if (this.currentGameSceneKey) {
          console.log("⏸️ Pausing boss scene:", this.currentGameSceneKey);
          this.scene.pause(this.currentGameSceneKey);
        }
        
        console.log("✅ Pause setup complete");
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
      muteButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
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
        
        console.log("Boss UI: Mute toggled to", newMutedState);
      });
    }
  }

  setupPauseResumeHandlers(): void {
    console.log("🎮 Setting up pause/resume handlers for BossUIScene");
    
    // Don't disable the missile button based on pause events since the check is done in the handler
    // The missile button handler already checks if the boss scene is active
    console.log("✅ Pause/resume handlers setup complete (minimal interference mode)");
  }

  shutdown(): void {
    console.log("🧹 BOSS UI SCENE SHUTDOWN");

    // Stop UI update timer
    if (this.uiUpdateTimer) {
      this.uiUpdateTimer.destroy();
    }

    // Clean up event listeners
    if (this.uiContainer && this.uiContainer.node) {
      const missileButton = this.uiContainer.node.querySelector("#missile-button");
      if (missileButton && (missileButton as any)._missileHandler) {
        const handler = (missileButton as any)._missileHandler;
        missileButton.removeEventListener("click", handler);
        missileButton.removeEventListener("touchend", handler);
        console.log("🧹 Missile button event listeners cleaned up");
      }

      const pauseButton = this.uiContainer.node.querySelector("#pause-button");
      if (pauseButton) {
        pauseButton.removeEventListener("click", () => {});
      }

      const muteButton = this.uiContainer.node.querySelector("#mute-button");
      if (muteButton) {
        muteButton.removeEventListener("click", () => {});
      }
    }

    // CRITICAL: Destroy the DOM element to prevent it from blocking GameOverUIScene
    if (this.uiContainer) {
      console.log("🧹 Destroying BossUIScene DOM element");
      this.uiContainer.destroy();
      this.uiContainer = null;
    }

    console.log("✅ BOSS UI SCENE CLEANUP COMPLETE");
  }
}