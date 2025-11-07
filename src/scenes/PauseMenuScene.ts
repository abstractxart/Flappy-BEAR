import Phaser from "phaser";
import * as utils from "../utils";
import { MusicManager } from "../MusicManager";

/**
 * PauseMenuScene - Displayed when game is paused
 */
export default class PauseMenuScene extends Phaser.Scene {
  private uiContainer: Phaser.GameObjects.DOMElement | null = null;
  private currentGameSceneKey: string | null = null;
  private musicManager: MusicManager;
  private musicVolume: number = 0.6;
  private sfxVolume: number = 0.3;

  constructor() {
    super({ key: "PauseMenuScene" });
    this.musicManager = MusicManager.getInstance();
  }

  init(data: { gameSceneKey?: string }) {
    this.currentGameSceneKey = data.gameSceneKey || "GameScene";
    
    // Load saved volume settings
    this.musicVolume = parseFloat(localStorage.getItem("flappyBearMusicVolume") || "0.6");
    this.sfxVolume = parseFloat(localStorage.getItem("flappyBearSFXVolume") || "0.3");
  }

  create(): void {
    // Create semi-transparent overlay
    const overlay = this.add.rectangle(
      0, 0,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    );
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(999);

    // Create pause menu UI
    this.createPauseMenuUI();
  }

  createPauseMenuUI(): void {
    const uiHTML = `
      <div id="pause-menu-container" class="fixed top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none z-[1000] font-supercell">
        <!-- Pause Menu Card -->
        <div class="game-3d-container-[#2C3E50] px-12 py-8 pointer-events-auto" style="min-width: 500px; max-width: 600px;">
          
          <!-- Title -->
          <div class="text-center mb-8">
            <div class="text-white font-bold" style="font-size: 56px; text-shadow: 4px 4px 0px rgba(0,0,0,0.5);">
              PAUSED
            </div>
          </div>

          <!-- Settings Section -->
          <div class="mb-8">
            <!-- Music Volume -->
            <div class="mb-6">
              <div class="text-white font-bold mb-3" style="font-size: 24px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                🎵 Music Volume
              </div>
              <div class="flex items-center gap-4">
                <input 
                  type="range" 
                  id="music-volume-slider" 
                  min="0" 
                  max="100" 
                  value="${Math.round(this.musicVolume * 100)}"
                  class="flex-1 h-3 rounded-full cursor-pointer appearance-none bg-gray-700"
                  style="accent-color: #3498DB;"
                />
                <div id="music-volume-display" class="text-white font-bold" style="font-size: 20px; min-width: 50px; text-align: right;">
                  ${Math.round(this.musicVolume * 100)}%
                </div>
              </div>
            </div>

            <!-- SFX Volume -->
            <div class="mb-6">
              <div class="text-white font-bold mb-3" style="font-size: 24px; text-shadow: 2px 2px 0px rgba(0,0,0,0.5);">
                🔊 Sound Effects
              </div>
              <div class="flex items-center gap-4">
                <input 
                  type="range" 
                  id="sfx-volume-slider" 
                  min="0" 
                  max="100" 
                  value="${Math.round(this.sfxVolume * 100)}"
                  class="flex-1 h-3 rounded-full cursor-pointer appearance-none bg-gray-700"
                  style="accent-color: #E74C3C;"
                />
                <div id="sfx-volume-display" class="text-white font-bold" style="font-size: 20px; min-width: 50px; text-align: right;">
                  ${Math.round(this.sfxVolume * 100)}%
                </div>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex flex-col gap-4">
            <!-- Resume Button -->
            <button id="resume-button" class="game-3d-container-clickable-[#27AE60] px-8 py-4 cursor-pointer hover:scale-105 transition-transform">
              <div class="text-white font-bold text-center" style="font-size: 32px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5);">
                ▶ RESUME
              </div>
            </button>

            <!-- Restart Button -->
            <button id="restart-button" class="game-3d-container-clickable-[#F39C12] px-8 py-4 cursor-pointer hover:scale-105 transition-transform">
              <div class="text-white font-bold text-center" style="font-size: 28px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5);">
                🔄 RESTART
              </div>
            </button>

            <!-- Main Menu Button -->
            <button id="main-menu-button" class="game-3d-container-clickable-[#E74C3C] px-8 py-4 cursor-pointer hover:scale-105 transition-transform">
              <div class="text-white font-bold text-center" style="font-size: 28px; text-shadow: 3px 3px 0px rgba(0,0,0,0.5);">
                🏠 MAIN MENU
              </div>
            </button>
          </div>

          <!-- Controls Help -->
          <div class="mt-8 game-3d-container-slot-[#34495E] px-6 py-4">
            <div class="text-gray-300 text-center" style="font-size: 16px;">
              <div class="font-bold text-yellow-300 mb-2">CONTROLS</div>
              <div>SPACE / CLICK - Flap</div>

              <div>ESC / P - Pause</div>
            </div>
          </div>
        </div>
      </div>

      <style>
        /* Custom slider styles */
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      </style>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
    
    // Setup button handlers
    this.setupButtonHandlers();
    
    // Setup volume slider handlers
    this.setupVolumeSliders();
  }

  setupButtonHandlers(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;

    // Resume button
    const resumeButton = this.uiContainer.node.querySelector("#resume-button");
    if (resumeButton) {
      resumeButton.addEventListener("click", () => {
        this.sound.play("ui_click", { volume: this.sfxVolume });
        this.resumeGame();
      });
    }

    // Restart button
    const restartButton = this.uiContainer.node.querySelector("#restart-button");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        this.sound.play("ui_click", { volume: this.sfxVolume });
        this.restartGame();
      });
    }

    // Main menu button
    const mainMenuButton = this.uiContainer.node.querySelector("#main-menu-button");
    if (mainMenuButton) {
      mainMenuButton.addEventListener("click", () => {
        this.sound.play("ui_click", { volume: this.sfxVolume });
        this.goToMainMenu();
      });
    }
  }

  setupVolumeSliders(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;

    // Music volume slider
    const musicSlider = this.uiContainer.node.querySelector("#music-volume-slider") as HTMLInputElement;
    const musicDisplay = this.uiContainer.node.querySelector("#music-volume-display");
    
    if (musicSlider && musicDisplay) {
      musicSlider.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        this.musicVolume = value / 100;
        musicDisplay.textContent = `${value}%`;
        
        // Update music volume
        this.musicManager.setVolume(this.musicVolume);
        
        // Save to localStorage
        localStorage.setItem("flappyBearMusicVolume", this.musicVolume.toString());
      });
    }

    // SFX volume slider
    const sfxSlider = this.uiContainer.node.querySelector("#sfx-volume-slider") as HTMLInputElement;
    const sfxDisplay = this.uiContainer.node.querySelector("#sfx-volume-display");
    
    if (sfxSlider && sfxDisplay) {
      sfxSlider.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        this.sfxVolume = value / 100;
        sfxDisplay.textContent = `${value}%`;
        
        // Save to localStorage
        localStorage.setItem("flappyBearSFXVolume", this.sfxVolume.toString());
        
        // Update all game sounds volume
        if (this.currentGameSceneKey) {
          const gameScene = this.scene.get(this.currentGameSceneKey) as any;
          if (gameScene && gameScene.updateSoundVolumes) {
            gameScene.updateSoundVolumes(this.sfxVolume);
          }
        }
        
        // Play test sound
        this.sound.play("ui_click", { volume: this.sfxVolume });
      });
    }
  }

  resumeGame(): void {
    console.log("🎮 RESUMING GAME - Current scene:", this.currentGameSceneKey);
    
    if (this.currentGameSceneKey) {
      // Resume the game scene using the scene manager
      console.log("▶️ Resuming scene:", this.currentGameSceneKey);
      this.scene.resume(this.currentGameSceneKey);
      
      // Ensure BossUIScene is also running if this is a boss fight
      if (this.currentGameSceneKey.includes("Boss")) {
        const bossUIScene = this.scene.get("BossUIScene");
        if (bossUIScene && !bossUIScene.scene.isActive()) {
          console.log("▶️ Resuming BossUIScene");
          this.scene.resume("BossUIScene");
        }
      }
    }
    
    // Stop pause menu
    console.log("❌ Stopping PauseMenuScene");
    this.scene.stop();
    
    console.log("✅ Resume complete");
  }

  restartGame(): void {
    console.log("⏸️➡️🔄 PAUSE MENU RESTART - AGGRESSIVE BOSS BONUS CLEARING");
    
    // ULTRA AGGRESSIVE: Import and use GameScene's aggressive clear method
    import('./GameScene').then((module) => {
      module.default.aggressiveClearBossBonuses();
    });
    
    // Also clear the old way for IMMEDIATE safety
    localStorage.removeItem("flappyBearSpeedMultiplier");
    localStorage.removeItem("flappyBearAccumulatedScore");
    sessionStorage.removeItem("flappyBearSpeedMultiplier");
    sessionStorage.removeItem("flappyBearAccumulatedScore");
    
    console.log("💥 PAUSE RESTART: All boss bonuses ELIMINATED");
    
    // Stop current game scene
    if (this.currentGameSceneKey) {
      this.scene.stop(this.currentGameSceneKey);
      this.scene.stop("UIScene");
      
      // Also stop BossUIScene if it's running
      const bossUIScene = this.scene.get("BossUIScene");
      if (bossUIScene && bossUIScene.scene.isActive()) {
        this.scene.stop("BossUIScene");
      }
    }
    
    // Stop pause menu
    this.scene.stop();
    
    // Restart game scene with fresh state
    this.scene.start("GameScene");
  }

  goToMainMenu(): void {
    console.log("⏸️➡️🏠 PAUSE MENU TO MAIN MENU - AGGRESSIVE BOSS BONUS CLEARING");
    
    // ULTRA AGGRESSIVE: Import and use GameScene's aggressive clear method
    import('./GameScene').then((module) => {
      module.default.aggressiveClearBossBonuses();
    });
    
    // Also clear the old way for IMMEDIATE safety
    localStorage.removeItem("flappyBearSpeedMultiplier");
    localStorage.removeItem("flappyBearAccumulatedScore");
    sessionStorage.removeItem("flappyBearSpeedMultiplier");
    sessionStorage.removeItem("flappyBearAccumulatedScore");
    
    console.log("💥 PAUSE TO MENU: All boss bonuses ELIMINATED");
    
    // Stop all scenes
    if (this.currentGameSceneKey) {
      this.scene.stop(this.currentGameSceneKey);
      this.scene.stop("UIScene");
      
      // Also stop BossUIScene if it's running
      const bossUIScene = this.scene.get("BossUIScene");
      if (bossUIScene && bossUIScene.scene.isActive()) {
        this.scene.stop("BossUIScene");
      }
    }
    this.scene.stop();
    
    // Go to title screen
    this.scene.start("TitleScreen");
  }

  shutdown(): void {
    // CRITICAL: Destroy the DOM element to prevent it from blocking other UI scenes
    if (this.uiContainer) {
      console.log("🧹 Destroying PauseMenuScene DOM element");
      this.uiContainer.destroy();
      this.uiContainer = null;
    }
  }
}
