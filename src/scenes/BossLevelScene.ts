import Phaser from "phaser";
import * as utils from "../utils";
import { FlappyBear } from "../FlappyBear";
import { GaryGenslerBoss } from "../GaryGenslerBoss";
import { Missile } from "../Missile";
import { MusicManager } from "../MusicManager";

/**
 * BossLevelScene - Gary Gensler boss fight after reaching score threshold
 */
export class BossLevelScene extends Phaser.Scene {
  // Game objects
  public bear!: FlappyBear;
  public boss!: GaryGenslerBoss;
  public missiles!: Phaser.GameObjects.Group;
  
  // Game state
  public gameStarted: boolean = false;
  public gameOver: boolean = false;
  public bossDefeated: boolean = false;
  
  // Input
  public spaceKey?: Phaser.Input.Keyboard.Key;
  public missileKey?: Phaser.Input.Keyboard.Key; // X key for missiles
  
  // Background
  public backgrounds: Phaser.GameObjects.Image[] = [];
  
  // Timing
  public lastMissileTime: number = 0;
  public missileCooldown: number = 1500; // 1.5 seconds between missiles
  
  // Music
  private musicManager: MusicManager;

  constructor() {
    super({
      key: "BossLevelScene",
    });
    this.musicManager = MusicManager.getInstance();
  }

  create(): void {
    // FORCE RESET all scene state for fresh boss fight
    console.log("🔄 BOSS SCENE CREATE - RESETTING STATE");
    this.gameStarted = false;
    this.gameOver = false;
    this.bossDefeated = false;
    this.lastMissileTime = 0;
    this.backgrounds = [];
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    
    // Create background
    this.createBackground();
    
    // Create bear
    this.createBear();
    
    // Create boss
    this.createBoss();
    
    // Create projectile groups
    this.missiles = this.add.group();
    
    // Setup input
    this.setupInput();
    
    // Setup collisions
    this.setupCollisions();
    
    // Setup boss events
    this.setupBossEvents();
    
    // Bear death is now handled directly by bear.takeDamage()
    
    // Start boss music
    this.startBossMusic();
    
    // Launch boss UI
    this.scene.launch("BossUIScene", { 
      gameSceneKey: this.scene.key 
    });
    
    // Setup pause/resume handlers
    this.setupPauseResumeHandlers();
    
    console.log("✅ Boss level started! Fight Gary Gensler! Bear health:", this.bear.health, "gameOver:", this.gameOver);
  }

  createBackground(): void {
    // Use same background as title screen for consistency
    const bg = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      "title_screen_background"
    );
    bg.setOrigin(0.5, 0.5);
    bg.setScrollFactor(0);
    bg.setDepth(-10);
    
    // Scale to cover the screen while maintaining aspect ratio
    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    
    this.backgrounds.push(bg);
  }

  createBear(): void {
    // Create bear on the left side
    this.bear = new FlappyBear(
      this,
      this.scale.width * 0.2, // 20% from left edge
      this.scale.height * 0.5  // Center vertically
    );
    
    // Set gravity
    this.bear.body.setGravityY(600); // Reduced gravity for boss fight
    
    // Disable world bounds collision for boss fight (bear can touch top/bottom safely)
    this.bear.body.setCollideWorldBounds(false);
    
    console.log("Bear created with health:", this.bear.health, "maxHealth:", this.bear.maxHealth);
  }

  createBoss(): void {
    // Create boss on the right side
    this.boss = new GaryGenslerBoss(
      this,
      this.scale.width * 0.8, // 80% from left edge (right side)
      this.scale.height * 0.5  // Center vertically
    );
  }

  setupInput(): void {
    // Space for flapping
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // X key for missiles
    this.missileKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    
    // Mouse/Touch for flapping
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Check if it's not the missile button area (bottom right)
      if (pointer.x < this.scale.width - 120 || pointer.y < this.scale.height - 120) {
        this.handleFlapInput();
      }
    });
  }

  setupCollisions(): void {
    // Bear vs boss lasers
    utils.addOverlap(
      this,
      this.bear,
      this.boss.lasersGroup,
      this.handleLaserHit,
      undefined,
      this
    );
    
    // Missiles vs boss
    utils.addOverlap(
      this,
      this.missiles,
      this.boss,
      this.handleMissileHit,
      undefined,
      this
    );
    
    // Bear vs boss (contact damage)
    utils.addOverlap(
      this,
      this.bear,
      this.boss,
      this.handleBossContact,
      undefined,
      this
    );
  }

  setupBossEvents(): void {
    // Listen for boss defeated event
    this.events.on('bossDefeated', () => {
      this.handleBossDefeated();
    });
    
    // Listen for bear death event
    this.events.on('bearDied', () => {
      console.log("BossLevelScene received bearDied event");
      if (!this.gameOver) {
        console.log("Setting gameOver = true and calling handleGameOver()");
        this.gameOver = true;
        this.handleGameOver();
      } else {
        console.log("Game already over, ignoring bearDied event");
      }
    });
  }

  startBossMusic(): void {
    // Stop current music and play boss theme
    this.musicManager.stop();
    this.musicManager.playBossTheme(this);
  }

  handleFlapInput(): void {
    if (this.gameOver) return;
    
    if (!this.gameStarted) {
      this.startGame();
    }
    
    this.bear.flap();
  }

  handleMissileInput(): void {
    if (this.gameOver || !this.gameStarted) return;
    
    const currentTime = this.time.now;
    if (currentTime - this.lastMissileTime < this.missileCooldown) return;
    
    this.lastMissileTime = currentTime;
    
    // Fire missile from bear position
    const missile = new Missile(this, this.bear.x + 30, this.bear.y);
    this.missiles.add(missile);
    
    // Play missile sound
    this.sound.play("missile_launch", { volume: 0.3 });
  }

  startGame(): void {
    this.gameStarted = true;
    console.log("Boss fight started!");
  }

  getMissileCooldownProgress(): number {
    const timeSinceLastMissile = this.time.now - this.lastMissileTime;
    return Math.min(timeSinceLastMissile / this.missileCooldown, 1.0);
  }

  isMissileReady(): boolean {
    return (this.time.now - this.lastMissileTime) >= this.missileCooldown;
  }

  handleLaserHit(bear: FlappyBear, laser: any): void {
    if (bear.isInvulnerable || this.gameOver) return;
    
    // Remove laser
    laser.destroy();
    
    console.log("Bear hit by laser, health before damage:", bear.health);
    
    // Damage bear (bear.takeDamage will handle death and game over)
    bear.takeDamage(1);
    
    console.log("Bear health after laser damage:", bear.health, "isDead:", bear.isDead, "gameOver:", this.gameOver);
  }

  handleMissileHit(missile: Missile, boss: GaryGenslerBoss): void {
    console.log("Missile hit boss at:", missile.x, missile.y, "Boss at:", boss.x, boss.y);
    
    // Explode missile
    missile.explode();
    
    // Try to damage boss
    const damageDealt = boss.takeDamage(25, missile.x, missile.y);
    
    if (damageDealt) {
      // Show hit effect
      const hitText = this.add.text(missile.x, missile.y - 30, "HIT!", {
        fontSize: "28px",
        color: "#00ff00",
        fontFamily: "SupercellMagic",
        stroke: "#000000",
        strokeThickness: 3
      });
      
      this.tweens.add({
        targets: hitText,
        y: hitText.y - 50,
        alpha: 0,
        scale: 1.5,
        duration: 800,
        onComplete: () => hitText.destroy()
      });
      
      // Screen shake for successful hit
      this.cameras.main.shake(200, 0.01);
    } else {
      // Show visual feedback for invalid hit
      const missText = this.add.text(missile.x, missile.y - 30, "MISS!", {
        fontSize: "24px",
        color: "#ff0000",
        fontFamily: "SupercellMagic",
        stroke: "#000000",
        strokeThickness: 2
      });
      
      this.tweens.add({
        targets: missText,
        y: missText.y - 50,
        alpha: 0,
        duration: 1000,
        onComplete: () => missText.destroy()
      });
    }
  }

  handleBossContact(bear: FlappyBear, boss: GaryGenslerBoss): void {
    if (bear.isInvulnerable || this.gameOver) return;
    
    // Push bear away
    bear.body.setVelocityX(-200);
    
    console.log("Bear contacted boss, health before damage:", bear.health);
    
    // Damage bear (bear.takeDamage will handle death and game over)
    bear.takeDamage(1);
    
    console.log("Bear health after boss contact damage:", bear.health, "isDead:", bear.isDead, "gameOver:", this.gameOver);
  }

  handleBossDefeated(): void {
    this.bossDefeated = true;
    this.gameOver = true;
    
    console.log("Boss defeated! Victory!");
    
    // Stop boss music and return to normal
    this.musicManager.stop();
    this.musicManager.play();
    
    // Get accumulated game data
    const mainGameScene = this.scene.get("GameScene") as any;
    const currentScore = mainGameScene?.score || 0;
    const currentCoins = mainGameScene?.coinsCollected || 0;
    const currentSpeedMultiplier = parseFloat(localStorage.getItem("flappyBearSpeedMultiplier") || "1.0");
    
    // Add 200+ bonus points for defeating boss
    const bonusPoints = 250;
    const newScore = currentScore + bonusPoints;
    
    // Increase speed multiplier by 0.5x (1.0 -> 1.5, 1.5 -> 2.0, etc.)
    const newSpeedMultiplier = currentSpeedMultiplier + 0.5;
    
    // Track boss victories for trigger calculation
    const bossesDefeated = parseInt(localStorage.getItem("flappyBearBossesDefeated") || "0");
    localStorage.setItem("flappyBearBossesDefeated", (bossesDefeated + 1).toString());
    localStorage.setItem("flappyBearLastBossVictoryScore", newScore.toString());
    
    // Save the new speed multiplier and accumulated score
    localStorage.setItem("flappyBearSpeedMultiplier", newSpeedMultiplier.toString());
    localStorage.setItem("flappyBearAccumulatedScore", newScore.toString());
    
    // Stop boss UI scene
    this.scene.stop("BossUIScene");
    
    console.log(`Boss victory! +${bonusPoints} points, speed now ${newSpeedMultiplier}x`);
    
    // Show victory screen with bonus points
    this.showBossVictoryScreen(currentScore, bonusPoints, newScore, newSpeedMultiplier);
  }

  /**
   * Show boss victory screen with score breakdown
   */
  showBossVictoryScreen(previousScore: number, bonusPoints: number, newScore: number, newSpeedMultiplier: number): void {
    // Create victory overlay
    const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8);
    overlay.setOrigin(0, 0);
    overlay.setDepth(5000);
    overlay.setScrollFactor(0);
    
    // Victory text
    const victoryText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.2,
      "BOSS DEFEATED!",
      {
        fontFamily: "SupercellMagic",
        fontSize: "56px",
        color: "#00FF00",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center"
      }
    );
    victoryText.setOrigin(0.5, 0.5);
    victoryText.setDepth(5001);
    victoryText.setScrollFactor(0);
    
    // Score breakdown
    const scoreText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.45,
      `PREVIOUS SCORE: ${previousScore}\n+${bonusPoints} BOSS BONUS\n\nNEW SCORE: ${newScore}`,
      {
        fontFamily: "SupercellMagic",
        fontSize: "32px",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center"
      }
    );
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setDepth(5001);
    scoreText.setScrollFactor(0);
    
    // Speed indicator
    const speedText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.7,
      `SPEED INCREASED TO ${newSpeedMultiplier}X!`,
      {
        fontFamily: "SupercellMagic",
        fontSize: "28px",
        color: "#FF6600",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center"
      }
    );
    speedText.setOrigin(0.5, 0.5);
    speedText.setDepth(5001);
    speedText.setScrollFactor(0);
    
    // Continue instruction
    const continueText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.85,
      "GAME CONTINUES IN 3 SECONDS...",
      {
        fontFamily: "SupercellMagic",
        fontSize: "20px",
        color: "#CCCCCC",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center"
      }
    );
    continueText.setOrigin(0.5, 0.5);
    continueText.setDepth(5001);
    continueText.setScrollFactor(0);
    
    // Animate victory text
    this.tweens.add({
      targets: victoryText,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: "Back.easeOut"
    });
    
    // Animate score text
    this.tweens.add({
      targets: scoreText,
      alpha: { from: 0, to: 1 },
      y: { from: scoreText.y + 50, to: scoreText.y },
      duration: 1000,
      delay: 500,
      ease: "Power2.easeOut"
    });
    
    // Animate speed text
    this.tweens.add({
      targets: speedText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1.1 },
      duration: 800,
      delay: 1000,
      ease: "Back.easeOut"
    });
    
    // Auto-continue after 3 seconds
    this.time.delayedCall(3000, () => {
      this.scene.start("GameScene", {
        speedMultiplier: newSpeedMultiplier,
        accumulatedScore: newScore
      });
    });
  }

  handleGameOver(): void {
    // FORCE game over - remove guard to allow multiple calls
    console.log("🎮 FORCE GAME OVER - Boss fight failed! (gameOver was: " + this.gameOver + ")");
    this.gameOver = true;

    // Stop boss music
    this.musicManager.stop();
    this.musicManager.play();

    // NUCLEAR OPTION: Remove ALL possible blocking overlays from DOM
    console.log("💥 NUCLEAR CLEANUP: Removing all UI overlays");
    const allOverlays = document.querySelectorAll('[id*="ui-container"], [id*="boss-ui"]');
    allOverlays.forEach((overlay) => {
      console.log("🧹 Removing overlay:", overlay.id);
      overlay.remove();
    });

    // CRITICAL: Manually remove BossUIScene DOM before stopping scene
    const bossUIScene = this.scene.get("BossUIScene") as any;
    if (bossUIScene && bossUIScene.uiContainer) {
      console.log("🧹 EMERGENCY: Manually destroying BossUIScene DOM");
      try {
        bossUIScene.uiContainer.destroy();
      } catch (e) {
        console.log("⚠️ Error destroying container, forcing removal");
      }
      bossUIScene.uiContainer = null;
    }

    // AGGRESSIVELY stop boss UI scene - try multiple methods
    console.log("🛑 STOPPING BossUIScene");
    if (this.scene.isActive("BossUIScene")) {
      this.scene.stop("BossUIScene");
    }

    // CRITICAL: Disable canvas input immediately to prevent blocking
    if (this.game.canvas) {
      this.game.canvas.style.pointerEvents = 'none';
      this.game.canvas.style.touchAction = 'none';
      console.log("🔒 Canvas input disabled before GameOver");
    }

    // ADDITIONAL: Disable ALL canvas elements just to be sure
    document.querySelectorAll('canvas').forEach(canvas => {
      (canvas as HTMLElement).style.pointerEvents = 'none';
      (canvas as HTMLElement).style.touchAction = 'none';
    });

    // Get current score from main game scene if available
    const mainGameScene = this.scene.get("GameScene") as any;
    const currentScore = mainGameScene?.score || 0;
    const coinsCollected = mainGameScene?.coinsCollected || 0;
    const bestScore = parseInt(localStorage.getItem("flappyBearBestScore") || "0");
    const isNewHighScore = currentScore > bestScore;

    // Update best score if needed
    if (isNewHighScore) {
      localStorage.setItem("flappyBearBestScore", currentScore.toString());
      console.log("New high score saved:", currentScore);
    }

    console.log("🚀 LAUNCHING GameOverUIScene with score:", currentScore);

    // Add a small delay to ensure DOM cleanup completes before showing GameOver
    setTimeout(() => {
      // IMMEDIATELY stop current boss scene and launch game over scene
      this.scene.start("GameOverUIScene", {
        currentLevelKey: "GameScene", // Return to main game scene
        score: currentScore,
        bestScore: Math.max(currentScore, bestScore),
        coinsCollected: coinsCollected,
        isNewHighScore: isNewHighScore
      });
    }, 100); // 100ms delay to ensure cleanup
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;
    
    // PRIORITY CHECK: Bear death override - check FIRST before anything else
    if (this.bear && (this.bear.health <= 0 || this.bear.isDead) && !this.gameOver) {
      console.log("UPDATE LOOP: Bear is dead (health=" + this.bear.health + ", isDead=" + this.bear.isDead + ") - FORCING game over");
      this.gameOver = true;
      this.handleGameOver();
      return; // Exit immediately
    }
    
    // Update bear
    if (this.bear && this.bear.active) {
      this.bear.update(time, delta);
    }
    
    // Update boss
    if (this.boss && this.boss.active && this.gameStarted) {
      this.boss.update(time, delta, this.bear.y);
    }
    
    // Update missiles
    this.missiles.children.entries.forEach((missile: any) => {
      if (missile.update) {
        missile.update();
      }
    });
    
    // Handle input
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.handleFlapInput();
    }
    
    if (this.missileKey && Phaser.Input.Keyboard.JustDown(this.missileKey)) {
      if (this.isMissileReady()) {
        this.handleMissileInput();
      }
    }
    
    // Apply top boundary - prevent bear from going too high without ending game
    if (this.bear.y < 50) {
      this.bear.y = 50;
      this.bear.body.setVelocityY(0);
    }
    
    // Check if bear falls off bottom of screen (death condition)
    if (this.bear.y > this.scale.height + 100 && !this.gameOver) {
      console.log("Bear fell off screen");
      this.gameOver = true;
      this.handleGameOver();
    }
  }

  setupPauseResumeHandlers(): void {
    console.log("🎮 Setting up pause/resume handlers for boss scene");
    
    // Handle scene pause event
    this.events.on('pause', () => {
      console.log("⏸️ BOSS SCENE PAUSED");
      
      // Stop any running tweens to prevent issues
      this.tweens.pauseAll();
      
      // Pause boss behavior (if method exists)
      if (this.boss && (this.boss as any).pauseBehavior) {
        (this.boss as any).pauseBehavior();
      }
    });
    
    // Handle scene resume event  
    this.events.on('resume', () => {
      console.log("▶️ BOSS SCENE RESUMED");
      
      // Resume tweens
      this.tweens.resumeAll();
      
      // Resume boss behavior (if method exists)
      if (this.boss && (this.boss as any).resumeBehavior) {
        (this.boss as any).resumeBehavior();
      }
      
      // Ensure bear is in correct state
      if (this.bear && !this.bear.isDead && !this.gameOver) {
        console.log("✅ Bear state ok after resume - health:", this.bear.health);
      }
    });
  }

  shutdown(): void {
    console.log("🧹 BOSS SCENE SHUTDOWN - Cleaning up");
    
    // Stop music
    if (this.musicManager) {
      this.musicManager.stop();
    }
    
    // Clear input listeners
    this.input.removeAllListeners();
    
    // Clear scene events
    this.events.removeAllListeners();
    
    // Force reset flags
    this.gameStarted = false;
    this.gameOver = false;
    this.bossDefeated = false;
    this.lastMissileTime = 0;
    
    console.log("✅ BOSS SCENE CLEANUP COMPLETE");
  }
}