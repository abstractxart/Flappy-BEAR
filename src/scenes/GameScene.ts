import Phaser from "phaser";
import { FlappyBear } from "../FlappyBear";
import { CryptoPipe } from "../CryptoPipe";
import { EnemyBee } from "../EnemyBee";
import * as utils from "../utils";
import { MusicManager } from "../MusicManager";
import { HoneyPointsAPI } from "../HoneyPointsAPI";
import { gameplayConfig, enemyConfig, powerUpConfig, nearMissConfig, bossConfig } from "../gameConfig.json";

/**
 * Main GameScene - Flappy Bear gameplay
 */
export default class GameScene extends Phaser.Scene {
  // Player
  bear!: FlappyBear;

  // Game objects groups
  tubes!: Phaser.GameObjects.Group;
  coins!: Phaser.GameObjects.Group;
  enemies!: Phaser.GameObjects.Group;
  powerUps!: Phaser.GameObjects.Group;

  // Background elements
  backgrounds!: Phaser.GameObjects.TileSprite[];
  
  // Spawning
  tubeSpawnTimer?: Phaser.Time.TimerEvent;
  tubeSpawnInterval: number;
  
  // Scroll speed
  currentScrollSpeed: number;
  baseScrollSpeed: number; // Base speed without power-up multiplier
  currentGapSize: number;
  isJesterHatActive: boolean;
  
  // Scoring
  score: number;
  coinsCollected: number;
  goldenBearsCollected: number;
  xrpTokenPoints: number;
  goldenBearTokenPoints: number;
  pipePoints: number;
  consecutiveCoins: number;
  tubesPassedCount: number;
  
  // Best score
  bestScore: number;
  totalLifetimeCoins: number;
  
  // Difficulty
  difficultyLevel: number;
  
  // Streak tracking
  consecutiveTubesPassed: number;
  lastMilestoneScore: number;
  previousScore: number;
  perfectPassCount: number;
  
  // Achievements tracking
  achievementsUnlocked: Set<string>;
  
  // Sounds
  bgMusic?: Phaser.Sound.BaseSound;
  coinSound?: Phaser.Sound.BaseSound;
  comboSound?: Phaser.Sound.BaseSound;
  tubeHitSound?: Phaser.Sound.BaseSound;
  pipePassSound?: Phaser.Sound.BaseSound;
  
  // Input
  spaceKey?: Phaser.Input.Keyboard.Key;
  
  // State
  gameStarted: boolean;
  gameOver: boolean;
  
  // Time-based speed increase
  gameStartTime: number;
  lastSpeedIncreaseTime: number;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { speedMultiplier?: number; accumulatedScore?: number } = {}): void {
    console.log(`🎮 GameScene init - AGGRESSIVE CHECK before showing any animations`);
    
    // ULTRA AGGRESSIVE: Check localStorage FIRST, ignore any passed data if localStorage is cleared
    const savedSpeedMultiplier = localStorage.getItem("flappyBearSpeedMultiplier");
    const savedAccumulatedScore = localStorage.getItem("flappyBearAccumulatedScore");
    
    let speedMultiplier: number;
    let accumulatedScore: number;
    
    if (savedSpeedMultiplier && savedAccumulatedScore) {
      // localStorage has boss bonuses - use them and show animation
      speedMultiplier = parseFloat(savedSpeedMultiplier);
      accumulatedScore = parseInt(savedAccumulatedScore);
      console.log(`🚀 INIT: Using boss bonuses from localStorage - ${speedMultiplier}x speed`);
      
      // Show speed indicator animation
      if (speedMultiplier > 1.0) {
        this.time.delayedCall(1000, () => {
          const speedText = this.add.text(
            this.scale.width / 2,
            this.scale.height * 0.3,
            `${speedMultiplier}X SPEED!`,
            {
              fontFamily: "SupercellMagic",
              fontSize: "48px",
              color: "#FF6600",
              stroke: "#000000",
              strokeThickness: 4,
              align: "center"
            }
          );
          speedText.setOrigin(0.5, 0.5);
          speedText.setDepth(2000);
          speedText.setScrollFactor(0);
          
          this.tweens.add({
            targets: speedText,
            scale: { from: 0.5, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 2000,
            ease: "Power2",
            onComplete: () => speedText.destroy()
          });
        });
      }
    } else {
      // localStorage cleared - IGNORE any passed data, use fresh defaults
      speedMultiplier = 1.0;
      accumulatedScore = 0;
      console.log(`🔄 INIT: Boss bonuses cleared - NO ANIMATION, fresh 1.0x speed start`);
      // NO speed animation shown when localStorage is cleared
    }
    
    // Store values for use in create()
    (this as any).initialSpeedMultiplier = speedMultiplier;
    (this as any).initialAccumulatedScore = accumulatedScore;
  }

  create(): void {
    // Initialize state
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.coinsCollected = 0;
    this.goldenBearsCollected = 0;
    this.xrpTokenPoints = 0;
    this.goldenBearTokenPoints = 0;
    this.pipePoints = 0;
    this.consecutiveCoins = 0;
    this.tubesPassedCount = 0;
    this.difficultyLevel = 0;
    this.isJesterHatActive = false;
    this.consecutiveTubesPassed = 0;
    this.lastMilestoneScore = 0;
    this.previousScore = 0;
    this.perfectPassCount = 0;
    
    // Load achievements
    const savedAchievements = localStorage.getItem("flappyBearAchievements");
    this.achievementsUnlocked = savedAchievements 
      ? new Set(JSON.parse(savedAchievements))
      : new Set();
    
    // Load best score from localStorage
    this.bestScore = parseInt(localStorage.getItem("flappyBearBestScore") || "0");
    this.totalLifetimeCoins = parseInt(localStorage.getItem("flappyBearTotalCoins") || "0");
    
    // AGGRESSIVE FIX: Always check localStorage first - if cleared, override any cached values
    const savedSpeedMultiplier = localStorage.getItem("flappyBearSpeedMultiplier");
    const savedAccumulatedScore = localStorage.getItem("flappyBearAccumulatedScore");
    
    let speedMultiplier: number;
    let accumulatedScore: number;
    
    if (savedSpeedMultiplier && savedAccumulatedScore) {
      // localStorage has values - use them (boss victory continue)
      speedMultiplier = parseFloat(savedSpeedMultiplier);
      accumulatedScore = parseInt(savedAccumulatedScore);
      console.log("🚀 USING BOSS VICTORY BONUSES from localStorage");
    } else {
      // localStorage cleared or empty - FORCE RESET regardless of instance values
      speedMultiplier = 1.0;
      accumulatedScore = 0;
      // Clear any cached instance values to prevent carryover
      (this as any).initialSpeedMultiplier = 1.0;
      (this as any).initialAccumulatedScore = 0;
      console.log("🔄 AGGRESSIVE RESET: Boss bonuses cleared, starting fresh");
    }
    
    // Set scroll speed and gap (with multiplier applied)
    this.baseScrollSpeed = gameplayConfig.tubeScrollSpeed.value * speedMultiplier;
    this.currentScrollSpeed = this.baseScrollSpeed;
    this.currentGapSize = gameplayConfig.tubeGapSize.value;
    this.tubeSpawnInterval = gameplayConfig.tubeSpawnInterval.value / speedMultiplier; // Faster spawning
    
    // Start with accumulated score if available
    this.score = accumulatedScore;
    
    console.log(`🎮 GameScene create - Speed: ${speedMultiplier}x (${this.currentScrollSpeed}px/s), Score: ${this.score}, Gap: ${this.currentGapSize}`);

    // Create parallax background
    this.createBackground();
    
    // Create bear
    this.bear = new FlappyBear(this, 200, this.scale.height / 2);
    this.bear.body.setGravityY(0); // No gravity until game starts
    
    // Create groups
    this.tubes = this.add.group();
    this.coins = this.add.group();
    this.enemies = this.add.group();
    this.powerUps = this.add.group();
    
    // Setup input
    this.setupInput();
    
    // Setup collisions
    this.setupCollisions();
    
    // Setup sounds
    this.initializeSounds();
    
    // Listen for bear death
    this.events.on("bearDied", this.handleGameOver, this);
    
    // Launch UI scene
    this.scene.launch("UIScene", { gameSceneKey: this.scene.key });
  }

  /**
   * AGGRESSIVE BOSS BONUS RESET - Force clear all bonuses everywhere
   */
  static aggressiveClearBossBonuses(): void {
    console.log("💥 AGGRESSIVE CLEAR: Forcing boss bonus reset everywhere");
    
    // Clear localStorage
    localStorage.removeItem("flappyBearSpeedMultiplier");
    localStorage.removeItem("flappyBearAccumulatedScore");
    
    // Also clear any other potential caching locations
    sessionStorage.removeItem("flappyBearSpeedMultiplier");
    sessionStorage.removeItem("flappyBearAccumulatedScore");
    
    console.log("✅ AGGRESSIVE CLEAR: All boss bonuses eliminated");
  }

  /**
   * Create parallax scrolling background
   */
  createBackground(): void {
    this.backgrounds = [];
    
    // Create pixel castle repeating background
    const bg = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      "pixel_castle_background"
    );
    bg.setOrigin(0, 0);
    bg.setScrollFactor(0);
    bg.setDepth(-10);
    
    this.backgrounds.push(bg);
  }

  /**
   * Setup input controls
   */
  setupInput(): void {
    // Keyboard
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const pKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    
    // Pause with ESC or P key (but not when game is over or GameOverUIScene is active)
    if (escKey) {
      escKey.on('down', () => {
        if (this.gameStarted && !this.gameOver) {
          this.pauseGame();
        }
      });
    }
    
    if (pKey) {
      pKey.on('down', () => {
        if (this.gameStarted && !this.gameOver) {
          this.pauseGame();
        }
      });
    }
    
    // Mouse/Touch
    this.input.on("pointerdown", () => {
      this.handleFlapInput();
    });
  }

  /**
   * Handle flap input
   */
  handleFlapInput(): void {
    if (this.gameOver) return;
    
    if (!this.gameStarted) {
      this.startGame();
    }
    
    this.bear.flap();
  }

  /**
   * Start the game
   */
  startGame(): void {
    this.gameStarted = true;

    // Enable gravity
    this.bear.body.setGravityY(this.bear.gravity);

    // Initialize time tracking for speed increases
    this.gameStartTime = this.time.now;
    this.lastSpeedIncreaseTime = this.time.now;

    // Start spawning tubes with random variance
    this.scheduleNextTubeSpawn();
  }
  
  /**
   * Schedule next tube spawn with random variance for spontaneity
   */
  scheduleNextTubeSpawn(): void {
    const variance = gameplayConfig.tubeSpawnVariance.value;
    const randomDelay = this.tubeSpawnInterval + Phaser.Math.Between(-variance / 2, variance / 2);
    
    this.tubeSpawnTimer = this.time.delayedCall(randomDelay, () => {
      this.spawnTubePair();
      this.scheduleNextTubeSpawn(); // Schedule next one
    });
  }

  /**
   * Setup collision detection
   */
  setupCollisions(): void {
    // Bear vs tubes
    utils.addOverlap(
      this,
      this.bear,
      this.tubes,
      this.handleTubeCollision,
      undefined,
      this
    );
    
    // Bear vs coins
    utils.addOverlap(
      this,
      this.bear,
      this.coins,
      this.handleCoinCollection,
      undefined,
      this
    );
    
    // Bear vs enemies
    utils.addOverlap(
      this,
      this.bear,
      this.enemies,
      this.handleEnemyCollision,
      undefined,
      this
    );
    
    // Bear vs power-ups
    utils.addOverlap(
      this,
      this.bear,
      this.powerUps,
      this.handlePowerUpCollection,
      undefined,
      this
    );
  }

  /**
   * Initialize sounds
   */
  initializeSounds(): void {
    // Use global MusicManager for background music
    const musicManager = MusicManager.getInstance();
    musicManager.init(this);
    musicManager.play();
    
    // Load saved SFX volume
    const savedSFXVolume = parseFloat(localStorage.getItem("flappyBearSFXVolume") || "0.3");
    
    this.coinSound = this.sound.add("xrp_coin_pickup", { volume: savedSFXVolume });
    this.comboSound = this.sound.add("combo_pickup", { volume: savedSFXVolume });
    this.tubeHitSound = this.sound.add("tube_hit", { volume: savedSFXVolume });
    this.pipePassSound = this.sound.add("pipe_pass_success", { volume: savedSFXVolume * 0.83 });
    
    // Apply global mute state if saved
    const isMuted = localStorage.getItem("flappyBearAllSoundsMuted") === "true";
    if (isMuted) {
      this.sound.mute = true;
      musicManager.setMuted(true);
    }
  }
  
  /**
   * Update sound volumes (called from pause menu)
   */
  updateSoundVolumes(volume: number): void {
    if (this.coinSound) (this.coinSound as any).volume = volume;
    if (this.comboSound) (this.comboSound as any).volume = volume;
    if (this.tubeHitSound) (this.tubeHitSound as any).volume = volume;
    if (this.pipePassSound) (this.pipePassSound as any).volume = volume * 0.83;
  }
  
  /**
   * Check if a UI scene is currently active
   */
  isUISceneActive(sceneKey: string): boolean {
    const scene = this.scene.get(sceneKey);
    return scene && scene.scene.isActive() && scene.scene.isVisible();
  }

  /**
   * Check if boss fight should be triggered
   */
  checkBossTrigger(): void {
    const currentBossTriggerScore = this.getCurrentBossTriggerScore();
    if (this.score >= currentBossTriggerScore && !this.gameOver) {
      this.triggerBossLevel();
    }
  }

  /**
   * Get the current boss trigger score based on previous victories
   */
  getCurrentBossTriggerScore(): number {
    const baseScore = bossConfig.bossTriggerScore.value; // 123
    const bossesDefeated = parseInt(localStorage.getItem("flappyBearBossesDefeated") || "0");
    
    // First boss at 589, then each subsequent boss needs +589 points from current score
    if (bossesDefeated === 0) {
      return baseScore; // First boss at 589 points
    } else {
      // For subsequent bosses, use the accumulated score + 589
      const lastBossVictoryScore = parseInt(localStorage.getItem("flappyBearLastBossVictoryScore") || "589");
      return lastBossVictoryScore + 589;
    }
  }

  triggerBossLevel(): void {
    const currentBossTriggerScore = this.getCurrentBossTriggerScore();
    console.log(`${currentBossTriggerScore} points reached! Triggering boss level!`);
    
    // Stop game mechanics
    this.gameOver = true;
    
    // Cancel tube spawning
    if (this.tubeSpawnTimer) {
      this.tubeSpawnTimer.destroy();
    }
    
    // Create dramatic transition
    this.createBossTransition();
  }

  /**
   * Create boss transition effect
   */
  createBossTransition(): void {
    // Fade out current scene
    this.cameras.main.fadeOut(2000, 0, 0, 0);
    
    // Determine which boss to fight based on number of bosses defeated
    const bossesDefeated = parseInt(localStorage.getItem("flappyBearBossesDefeated") || "0");
    const currentBossTriggerScore = this.getCurrentBossTriggerScore();
    
    let bossName = "GARY GENSLER";
    let bossScene = "BossLevelScene";
    
    // Alternate between bosses or add new ones
    if (bossesDefeated % 2 === 1) {
      bossName = "SECOND BOSS";
      bossScene = "SecondBossLevelScene";
    }
    
    // Show boss announcement
    const bossText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      `${currentBossTriggerScore} POINTS REACHED!\nBOSS INCOMING!\n${bossName} APPEARS!`,
      {
        fontFamily: "SupercellMagic",
        fontSize: "42px",
        color: "#FF0000",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center"
      }
    );
    bossText.setOrigin(0.5, 0.5);
    bossText.setDepth(3000);
    bossText.setScrollFactor(0);
    
    // Animate boss text
    this.tweens.add({
      targets: bossText,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 1000,
      ease: "Back.easeOut"
    });
    
    // Start boss level after longer transition
    this.time.delayedCall(5000, () => {
      // Stop UI scene
      this.scene.stop("UIScene");
      
      // Start appropriate boss level
      this.scene.start(bossScene);
    });
  }

  /**
   * Pause the game
   */
  pauseGame(): void {
    this.scene.pause();
    this.scene.launch("PauseMenuScene", { gameSceneKey: this.scene.key });
  }

  /**
   * Spawn a pair of full-height tubes with gap
   * Top pipe extends from gap top to beyond screen top
   * Bottom pipe extends from gap bottom to beyond screen bottom
   */
  spawnTubePair(): void {
    const extraHeight = 200; // Extra height beyond screen edges to ensure no sky visible
    
    // Make first few pipes easier with larger gap
    const baseGapSize = this.currentGapSize;
    let effectiveGapSize = this.tubesPassedCount < 3 
      ? baseGapSize * 1.5  // 50% larger gap for first 3 pipes
      : this.tubesPassedCount < 6
      ? baseGapSize * 1.25 // 25% larger gap for next 3 pipes
      : baseGapSize;        // Normal gap size after that
    
    // During jester hat mode, make gaps MUCH larger for easy gliding and bonus points
    // Each stack increases gap size further
    if (this.isJesterHatActive) {
      const bonusGapMultiplier = 1.6 + (this.bear.jesterHatStacks * 0.2); // 1.6x to 2.0x+ gap
      effectiveGapSize = baseGapSize * bonusGapMultiplier;
    }
    
    // Calculate gap position - must leave room for gap in the middle
    const minGapTop = 150; // Minimum distance from top of screen to top of gap
    const maxGapTop = this.scale.height - 150 - effectiveGapSize; // Maximum distance
    
    // During jester hat mode, center gaps more for easier navigation
    let gapTopY: number;
    if (this.isJesterHatActive) {
      // Keep gaps centered in middle third of screen for easy gliding
      const centerY = this.scale.height / 2;
      const centerRange = 100; // Reduce variation during bonus mode
      gapTopY = centerY - effectiveGapSize / 2 + Phaser.Math.Between(-centerRange, centerRange);
      gapTopY = Phaser.Math.Clamp(gapTopY, minGapTop, maxGapTop);
    } else {
      // Normal random placement
      gapTopY = Phaser.Math.Between(minGapTop, maxGapTop);
    }
    
    const gapBottomY = gapTopY + effectiveGapSize;
    
    // Calculate pipe lengths (how far they extend from their anchor points)
    const topPipeLength = gapTopY + extraHeight; // Extends beyond screen top
    const bottomPipeLength = this.scale.height - gapBottomY + extraHeight; // Extends beyond screen bottom
    
    const spawnX = this.scale.width + 50;
    
    // Randomly choose pipe type (Bitcoin or Ethereum)
    const pipeType = Math.random() < 0.5 ? "bitcoin" : "ethereum";
    
    // Default pipe color is normal (will be overridden by color cycling if jester hat is active)
    const pipeColor: "normal" = "normal";
    
    // Create top pipe (extends from gap top upward beyond screen top)
    const topPipe = new CryptoPipe(
      this,
      spawnX,
      gapTopY,
      pipeType,
      "top",
      topPipeLength,
      pipeColor
    );
    topPipe.setVelocity(-this.currentScrollSpeed, 0);
    topPipe.gapTopY = gapTopY;
    topPipe.gapBottomY = gapBottomY;
    
    // If jester hat is active, start color cycling immediately
    if (this.isJesterHatActive) {
      topPipe.startColorCycling(this);
    }
    
    this.tubes.add(topPipe);
    
    // Create bottom pipe (extends from gap bottom downward beyond screen bottom)
    const bottomPipe = new CryptoPipe(
      this,
      spawnX,
      gapBottomY,
      pipeType,
      "bottom",
      bottomPipeLength,
      pipeColor
    );
    bottomPipe.setVelocity(-this.currentScrollSpeed, 0);
    bottomPipe.gapTopY = gapTopY;
    bottomPipe.gapBottomY = gapBottomY;
    
    // If jester hat is active, start color cycling immediately
    if (this.isJesterHatActive) {
      bottomPipe.startColorCycling(this);
    }
    
    this.tubes.add(bottomPipe);
    
    // Spawn jester hat power-up with stack-based spawn chances
    // Stack 0 (no hat): Normal chance (8%)
    // Stack 1 (first hat active): SOMETIMES chance for stack 2 (12%)
    // Stack 2 (two hats): RARELY chance for stack 3 (4%)
    // Stack 3 (max): No more spawning (0%)
    let jesterHatChance = 0;
    
    if (!this.isJesterHatActive) {
      // No hat active - normal spawn rate
      jesterHatChance = powerUpConfig.jesterHatSpawnChance.value;
    } else if (this.bear.jesterHatStacks === 1) {
      // First stack active - SOMETIMES spawn second (12% chance)
      jesterHatChance = 0.12;
    } else if (this.bear.jesterHatStacks === 2) {
      // Second stack active - RARELY spawn third (4% chance)
      jesterHatChance = 0.04;
    } else {
      // Already at max stacks (3) - no more spawning
      jesterHatChance = 0;
    }
    
    if (Math.random() < jesterHatChance) {
      const powerUpY = gapTopY + effectiveGapSize / 2;
      this.spawnJesterHat(spawnX + 300, powerUpY); // Spawn ahead of pipes
    }
    // Spawn magnet power-up
    else if (Math.random() < powerUpConfig.magnetSpawnChance.value) {
      const powerUpY = gapTopY + effectiveGapSize / 2;
      this.spawnMagnet(spawnX + 250, powerUpY);
    }
    // Otherwise spawn tokens using enhanced scattered placement system
    else if (Math.random() < gameplayConfig.tokenSpawnChance.value) {
      this.spawnScatteredCoins(spawnX, gapTopY, gapBottomY, effectiveGapSize);
    }
    
    // Spawn enemy bee based on difficulty level
    const enemySpawnChance = Math.min(
      enemyConfig.enemySpawnChance.value + (this.difficultyLevel * enemyConfig.enemySpawnIncreasePerLevel.value),
      enemyConfig.maxEnemySpawnChance.value
    );
    
    if (Math.random() < enemySpawnChance) {
      this.spawnEnemyFormation(spawnX + 200, gapTopY, gapBottomY, effectiveGapSize);
    }
  }

  /**
   * Spawn dynamic enemy formations with swarm patterns
   */
  spawnEnemyFormation(baseX: number, gapTopY: number, gapBottomY: number, gapSize: number): void {
    const formations = [
      'single_enemy',     // Single enemy (classic)
      'horizontal_line',  // 3 enemies in horizontal line
      'vertical_patrol',  // 2 enemies patrolling up/down
      'v_formation',      // 3 enemies in V formation
      'swarm_cluster'     // 4-5 enemies in loose cluster
    ];
    
    // Higher difficulty = more likely to spawn complex formations
    const formationWeights = [
      40 - (this.difficultyLevel * 3), // single_enemy becomes less likely
      20 + (this.difficultyLevel * 1), // horizontal_line becomes more likely
      15 + (this.difficultyLevel * 1), // vertical_patrol becomes more likely
      15 + (this.difficultyLevel * 2), // v_formation becomes more likely
      10 + (this.difficultyLevel * 2)  // swarm_cluster becomes more likely
    ];
    
    const formation = this.weightedRandomChoice(formations, formationWeights);
    const avoidGapBuffer = 80;
    
    switch (formation) {
      case 'single_enemy':
        // Classic single enemy spawn
        let singleY: number;
        if (Math.random() < 0.5) {
          singleY = Phaser.Math.Between(100, Math.max(100, gapTopY - avoidGapBuffer));
        } else {
          singleY = Phaser.Math.Between(
            Math.min(gapBottomY + avoidGapBuffer, this.scale.height - 100),
            this.scale.height - 100
          );
        }
        this.spawnEnemy(baseX, singleY);
        break;
        
      case 'horizontal_line':
        // 3 enemies in horizontal line above or below gap
        const lineY = Math.random() < 0.5 
          ? gapTopY - avoidGapBuffer - 30
          : gapBottomY + avoidGapBuffer + 30;
        
        for (let i = 0; i < 3; i++) {
          this.spawnEnemy(baseX + (i * 100), lineY + (i * 15)); // Slight vertical offset
        }
        break;
        
      case 'vertical_patrol':
        // 2 enemies that patrol up and down
        const patrolX = baseX + 50;
        const topPatrolY = gapTopY - avoidGapBuffer;
        const bottomPatrolY = gapBottomY + avoidGapBuffer;
        
        const topPatrol = this.spawnEnemy(patrolX, topPatrolY, 'patrol');
        const bottomPatrol = this.spawnEnemy(patrolX + 150, bottomPatrolY, 'patrol');
        
        // Add patrol movement
        this.createPatrolMovement(topPatrol, topPatrolY - 50, topPatrolY + 50);
        this.createPatrolMovement(bottomPatrol, bottomPatrolY - 50, bottomPatrolY + 50);
        break;
        
      case 'v_formation':
        // 3 enemies in V formation
        const vCenterY = Math.random() < 0.5 
          ? gapTopY - avoidGapBuffer - 40
          : gapBottomY + avoidGapBuffer + 40;
        
        this.spawnEnemy(baseX, vCenterY);                    // Lead enemy
        this.spawnEnemy(baseX + 80, vCenterY + 30);          // Right wing
        this.spawnEnemy(baseX + 80, vCenterY - 30);          // Left wing
        break;
        
      case 'swarm_cluster':
        // 4-5 enemies in loose cluster formation
        const swarmCenterY = Math.random() < 0.5 
          ? gapTopY - avoidGapBuffer - 60
          : gapBottomY + avoidGapBuffer + 60;
        
        const swarmSize = 4 + Math.floor(Math.random() * 2); // 4-5 enemies
        const swarmPositions = [
          { x: 0, y: 0 },
          { x: 60, y: -20 },
          { x: 60, y: 20 },
          { x: 120, y: 0 },
          { x: 30, y: -40 },
          { x: 30, y: 40 }
        ];
        
        for (let i = 0; i < swarmSize; i++) {
          const pos = swarmPositions[i];
          this.spawnEnemy(baseX + pos.x, swarmCenterY + pos.y);
        }
        break;
    }
  }

  /**
   * Weighted random choice helper
   */
  weightedRandomChoice(options: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < options.length; i++) {
      random -= Math.max(0, weights[i]);
      if (random <= 0) {
        return options[i];
      }
    }
    
    return options[0]; // Fallback
  }

  /**
   * Create patrol movement for enemies
   */
  createPatrolMovement(enemy: any, minY: number, maxY: number): void {
    if (!enemy || !enemy.active) return;
    
    this.tweens.add({
      targets: enemy,
      y: maxY,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  /**
   * Spawn an enemy bee with optional behavior type
   */
  spawnEnemy(x: number, y: number, behavior: string = 'normal'): any {
    const enemy = new EnemyBee(this, x, y, this.currentScrollSpeed);
    (enemy as any).behavior = behavior;
    this.enemies.add(enemy);
    return enemy;
  }
  
  /**
   * Spawn jester hat power-up
   */
  spawnJesterHat(x: number, y: number): void {
    console.log("🎩 Spawning jester hat at", x, y);
    const jesterHat = this.add.image(x, y, "jester_hat_powerup");
    utils.initScale(jesterHat, { x: 0.5, y: 0.5 }, undefined, 60);
    this.physics.add.existing(jesterHat);
    (jesterHat.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (jesterHat.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.currentScrollSpeed);
    this.powerUps.add(jesterHat);
    console.log("🎩 Jester hat added to powerUps group. Group size:", this.powerUps.getLength());
    
    // Add bobbing animation
    this.tweens.add({
      targets: jesterHat,
      y: y - 15,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    
    // Add sparkle effect
    this.tweens.add({
      targets: jesterHat,
      angle: { from: -10, to: 10 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  
  /**
   * Spawn magnet power-up
   */
  spawnMagnet(x: number, y: number): void {
    console.log("🧲 Spawning magnet at", x, y);
    const magnet = this.add.circle(x, y, 20, 0x00FFFF);
    magnet.setStrokeStyle(3, 0x00FFFF);
    this.physics.add.existing(magnet);
    (magnet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (magnet.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.currentScrollSpeed);
    (magnet as any).powerUpType = "magnet";
    this.powerUps.add(magnet);
    
    // Add pulsing animation
    this.tweens.add({
      targets: magnet,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  
  /**
   * Enhanced scattered coin placement system with risk/reward positioning
   */
  spawnScatteredCoins(baseX: number, gapTopY: number, gapBottomY: number, gapSize: number): void {
    const patterns = [
      'safe_center',      // Safe: centered in gap (lower reward)
      'risky_edges',      // Risky: near pipe walls (higher reward)
      'trail_pattern',    // Trail: multiple coins in a path
      'cluster_formation', // Cluster: tight group requiring precision
      'moving_coins'      // Dynamic: coins that move up/down
    ];
    
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    switch (pattern) {
      case 'safe_center':
        // Single coin in center - safe but standard reward
        this.spawnToken(baseX, gapTopY + gapSize / 2);
        break;
        
      case 'risky_edges':
        // Coins near pipe walls - high risk, high reward
        const edgeOffset = 30; // Distance from pipe walls
        const numEdgeCoins = Math.random() < 0.3 ? 2 : 1; // 30% chance for 2 coins
        
        for (let i = 0; i < numEdgeCoins; i++) {
          const coinY = i === 0 
            ? gapTopY + edgeOffset      // Near top pipe
            : gapBottomY - edgeOffset;  // Near bottom pipe
          this.spawnToken(baseX + (i * 100), coinY, true); // High value coins
        }
        break;
        
      case 'trail_pattern':
        // Trail of 3-4 coins requiring weaving
        const trailLength = 3 + Math.floor(Math.random() * 2); // 3-4 coins
        const trailSpacing = 80;
        const trailStartY = gapTopY + gapSize * 0.2;
        const trailEndY = gapTopY + gapSize * 0.8;
        
        for (let i = 0; i < trailLength; i++) {
          const progress = i / (trailLength - 1);
          const coinX = baseX + (i * trailSpacing);
          const coinY = trailStartY + (trailEndY - trailStartY) * progress + 
                       Math.sin(progress * Math.PI * 2) * 20; // Sine wave pattern
          this.spawnToken(coinX, coinY);
        }
        break;
        
      case 'cluster_formation':
        // Tight cluster requiring precision flying
        const clusterCenterY = gapTopY + gapSize / 2;
        const clusterPositions = [
          { x: 0, y: 0 },           // Center
          { x: -40, y: -25 },       // Top-left
          { x: 40, y: -25 },        // Top-right
          { x: -40, y: 25 },        // Bottom-left
          { x: 40, y: 25 }          // Bottom-right
        ];
        
        const numCoins = 3 + Math.floor(Math.random() * 2); // 3-4 coins in cluster
        for (let i = 0; i < numCoins; i++) {
          const pos = clusterPositions[i];
          this.spawnToken(baseX + pos.x, clusterCenterY + pos.y);
        }
        break;
        
      case 'moving_coins':
        // Dynamic coins that move up and down
        const movingCoinY = gapTopY + gapSize / 2;
        const movingCoin = this.spawnToken(baseX, movingCoinY);
        
        // Add vertical movement
        this.tweens.add({
          targets: movingCoin,
          y: gapTopY + 40,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        
        // Visual indicator for moving coin
        this.tweens.add({
          targets: movingCoin,
          scale: { from: movingCoin.scale * 1.0, to: movingCoin.scale * 1.2 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
        break;
    }
  }

  /**
   * Spawn a token (XRP or Golden Bear) with optional high value
   */
  spawnToken(x: number, y: number, isHighValue: boolean = false): any {
    // Higher chance of golden bear for high-value spawns
    const goldenBearChance = isHighValue 
      ? gameplayConfig.goldenBearTokenChance.value * 2 
      : gameplayConfig.goldenBearTokenChance.value;
    
    const isGoldenBear = Math.random() < goldenBearChance;
    const tokenKey = isGoldenBear ? "golden_bear_token" : "xrp_token";
    
    const token = this.add.image(x, y, tokenKey);
    utils.initScale(token, { x: 0.5, y: 0.5 }, undefined, 50);
    this.physics.add.existing(token);
    (token.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (token.body as Phaser.Physics.Arcade.Body).setVelocityX(-this.currentScrollSpeed);
    (token as any).isGoldenBear = isGoldenBear;
    (token as any).isHighValue = isHighValue;
    this.coins.add(token);
    
    // Add spin animation
    this.tweens.add({
      targets: token,
      angle: 360,
      duration: isHighValue ? 1500 : 2000, // Faster spin for high-value
      repeat: -1,
      ease: "Linear"
    });
    
    // Enhanced effects for high-value coins
    if (isHighValue) {
      // Sparkle effect for high-value coins
      this.tweens.add({
        targets: token,
        alpha: { from: 0.8, to: 1.0 },
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
    
    // Add glow effect for golden bear token
    if (isGoldenBear) {
      this.tweens.add({
        targets: token,
        scale: { from: token.scale * 0.95, to: token.scale * 1.05 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
    
    return token;
  }

  /**
   * Handle tube collision
   */
  handleTubeCollision(bear: any, tube: any): void {
    if (this.gameOver) return;
    
    // Check for jester hat invincibility
    if (this.bear.hasJesterHat) {
      // Invincible! No damage taken
      return;
    }
    
    // Reset streak on collision
    this.handleStreakLoss();
    
    this.tubeHitSound?.play();
    this.screenShake(6, 400);
    this.bear.die();
    this.handleGameOver();
  }

  /**
   * Handle enemy collision
   */
  handleEnemyCollision(bear: any, enemy: any): void {
    if (this.gameOver) return;
    
    // Check for jester hat invincibility
    if (this.bear.hasJesterHat) {
      // Invincible! Destroy the enemy instead
      enemy.destroy();
      
      // Play satisfying sound
      this.coinSound?.play();
      
      // Add points for defeating enemy while invincible
      this.score += 3;
      this.events.emit("scoreUpdated", this.score);
      
      // Check for boss trigger
      this.checkBossTrigger();
      if (this.gameOver) return;
      
      // Create defeat effect
      this.createEnemyDefeatedEffect(enemy.x, enemy.y);
      return;
    }
    
    // Reset streak on collision
    this.handleStreakLoss();
    
    this.tubeHitSound?.play();
    this.screenShake(6, 400);
    this.bear.die();
    this.handleGameOver();
    
    // Destroy the enemy
    enemy.destroy();
  }
  
  /**
   * Create enemy defeated visual effect with enhanced particles
   */
  createEnemyDefeatedEffect(x: number, y: number): void {
    // Create floating score popup for enemy defeat
    this.createScorePopup(x, y, 3, "#FF6B00");
    
    // Enhanced particle explosion for enemy defeat
    this.createParticleExplosion(x, y, 0xFF6B00, 12, "enemy_defeat");
    
    // Screen shake for enemy defeat
    this.enhancedScreenShake(3, 200, "enemy_defeat");
  }
  
  /**
   * Create floating score popup animation
   */
  createScorePopup(x: number, y: number, points: number | string, color: string, isCombo: boolean = false): void {
    const displayText = typeof points === 'string' 
      ? points 
      : isCombo ? `+${points} x2!` : `+${points}`;
    const fontSize = isCombo || typeof points === 'string' ? "36px" : "28px";
    
    const scoreText = this.add.text(x, y, displayText, {
      fontFamily: "SupercellMagic",
      fontSize: fontSize,
      color: color,
      stroke: "#000000",
      strokeThickness: 4
    });
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setDepth(1000);
    
    // Animate upward and fade out
    this.tweens.add({
      targets: scoreText,
      y: y - 60,
      alpha: 0,
      scale: isCombo || typeof points === 'string' ? 1.5 : 1.2,
      duration: 1200,
      ease: "Power2",
      onComplete: () => scoreText.destroy()
    });
  }
  
  /**
   * Screen shake effect
   */
  screenShake(intensity: number = 2, duration: number = 200): void {
    this.cameras.main.shake(duration, intensity / 1000);
  }

  /**
   * Enhanced screen shake with different shake types
   */
  enhancedScreenShake(intensity: number, duration: number, type: string = "default"): void {
    const shakeConfigs = {
      "default": { intensity: intensity / 1000, duration },
      "enemy_defeat": { intensity: intensity * 0.8 / 1000, duration: duration * 0.8 },
      "coin_collect": { intensity: intensity * 0.4 / 1000, duration: duration * 0.5 },
      "collision": { intensity: intensity * 1.5 / 1000, duration: duration * 1.2 },
      "power_up": { intensity: intensity * 0.6 / 1000, duration: duration * 0.7 }
    };
    
    const config = shakeConfigs[type] || shakeConfigs["default"];
    this.cameras.main.shake(config.duration, config.intensity);
  }

  /**
   * Create particle explosion effect
   */
  createParticleExplosion(x: number, y: number, color: number, particleCount: number = 8, type: string = "default"): void {
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 100 + Math.random() * 50;
      const size = 3 + Math.random() * 4;
      
      const particle = this.add.circle(x, y, size, color);
      particle.setDepth(1000);
      particles.push(particle);
      
      // Calculate velocity based on angle
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;
      
      // Animate particle
      this.tweens.add({
        targets: particle,
        x: x + velocityX * 0.5,
        y: y + velocityY * 0.5,
        alpha: 0,
        scale: type === "coin_collect" ? 1.5 : 0.5,
        duration: type === "coin_collect" ? 800 : 600,
        ease: "Power2",
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Create coin collection sparkle effect
   */
  createCoinSparkleEffect(x: number, y: number, isGoldenBear: boolean = false): void {
    const color = isGoldenBear ? 0xFFD700 : 0x00D4FF;
    const sparkleCount = isGoldenBear ? 16 : 12;
    
    // Main particle explosion
    this.createParticleExplosion(x, y, color, sparkleCount, "coin_collect");
    
    // Additional sparkle ring for golden bears
    if (isGoldenBear) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 25;
        const sparkleX = x + Math.cos(angle) * distance;
        const sparkleY = y + Math.sin(angle) * distance;
        
        const sparkle = this.add.circle(sparkleX, sparkleY, 2, 0xFFFFFF);
        sparkle.setDepth(1001);
        
        this.tweens.add({
          targets: sparkle,
          scale: 0,
          alpha: 0,
          duration: 1000,
          delay: i * 50,
          ease: "Power2",
          onComplete: () => sparkle.destroy()
        });
      }
    }
  }
  
  /**
   * Check and unlock achievement
   */
  checkAchievement(achievementId: string, achievementName: string, description: string): void {
    if (!this.achievementsUnlocked.has(achievementId)) {
      this.achievementsUnlocked.add(achievementId);
      
      // Save to localStorage
      localStorage.setItem(
        "flappyBearAchievements", 
        JSON.stringify([...this.achievementsUnlocked])
      );
      
      // Show achievement notification
      this.showAchievementToast(achievementName, description);
      
      // Play special sound
      this.sound.play("combo_pickup", { volume: 0.5 });
      
      // Screen shake for celebration
      this.screenShake(3, 300);
    }
  }
  
  /**
   * Show achievement toast notification
   */
  showAchievementToast(name: string, description: string): void {
    // Emit to UI scene to show toast
    this.events.emit("achievementUnlocked", { name, description });
  }
  
  /**
   * Check for score milestones and trigger effects
   */
  checkScoreMilestones(): void {
    const milestones = [10, 25, 50, 100, 150];
    
    for (const milestone of milestones) {
      if (this.previousScore < milestone && this.score >= milestone) {
        // Milestone reached!
        this.createMilestoneEffect(milestone);
        this.screenShake(3, 250);
        this.sound.play("combo_pickup", { volume: 0.5 });
      }
    }
    
    this.previousScore = this.score;
  }
  
  /**
   * Create milestone celebration effect
   */
  createMilestoneEffect(milestone: number): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    
    const milestoneText = this.add.text(centerX, centerY, `${milestone} POINTS!`, {
      fontFamily: "SupercellMagic",
      fontSize: "56px",
      color: "#FFD700",
      stroke: "#000000",
      strokeThickness: 6
    });
    milestoneText.setOrigin(0.5, 0.5);
    milestoneText.setDepth(2000);
    milestoneText.setScrollFactor(0);
    
    // Animate
    this.tweens.add({
      targets: milestoneText,
      scale: { from: 0.3, to: 1.5 },
      alpha: { from: 1, to: 0 },
      duration: 1000,
      ease: "Back.easeOut",
      onComplete: () => milestoneText.destroy()
    });
  }
  
  /**
   * Create stack 3 jester hat celebration effect
   */
  createStackMaxEffect(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 3;
    
    const stackText = this.add.text(centerX, centerY, "MAX STACK!\nSUPER SPEED!", {
      fontFamily: "SupercellMagic",
      fontSize: "64px",
      color: "#FF00FF",
      stroke: "#000000",
      strokeThickness: 8,
      align: "center"
    });
    stackText.setOrigin(0.5, 0.5);
    stackText.setDepth(2000);
    stackText.setScrollFactor(0);
    
    // Animate with pulse
    this.tweens.add({
      targets: stackText,
      scale: { from: 0.5, to: 1.3 },
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: "Power2",
      onComplete: () => stackText.destroy()
    });
  }
  
  /**
   * Check if bear passed any pipes and award points
   */
  checkPipePassing(): void {
    if (this.gameOver) return;
    
    this.tubes.children.entries.forEach((tube: any) => {
      if (tube instanceof CryptoPipe && !tube.scored) {
        // Check if bear has passed this pipe (bear's x is greater than pipe's x)
        if (this.bear.x > tube.x + 10) {
          tube.scored = true;
          
          // Only count once per pair (only count top pipes to avoid double counting)
          if (tube.orientation === "top") {
            // Check if bear's y position was within the gap when passing
            const bearWasInGap = this.bear.y >= tube.gapTopY && this.bear.y <= tube.gapBottomY;
            
            if (bearWasInGap) {
              // Track consecutive passes
              this.consecutiveTubesPassed++;
              
              // Award points for successfully passing through the gap
              this.tubesPassedCount++;
              let points = gameplayConfig.pointsPerTube.value;
              
              // Check for perfect pass (centered in gap)
              const gapCenter = (tube.gapTopY + tube.gapBottomY) / 2;
              const distanceFromCenter = Math.abs(this.bear.y - gapCenter);
              const gapSize = tube.gapBottomY - tube.gapTopY;
              const perfectPassThreshold = gapSize * 0.15; // Within 15% of gap size from center
              
              let isPerfectPass = false;
              if (distanceFromCenter <= perfectPassThreshold) {
                // PERFECT PASS! Bonus points
                const perfectBonus = Math.round(points * 0.5); // 50% bonus
                points += perfectBonus;
                isPerfectPass = true;
                this.perfectPassCount++;
                
                // Create special perfect pass effect
                this.createPerfectPassEffect(this.bear.x, this.bear.y);
                this.sound.play("combo_pickup", { volume: 0.35 });
                
                // Check perfect pass achievements
                if (this.perfectPassCount >= 5) {
                  this.checkAchievement("perfectionist", "🎯 Perfectionist", "Got 5 perfect passes in one run!");
                }
                if (this.perfectPassCount >= 10) {
                  this.checkAchievement("sharpshooter", "🏹 Sharpshooter", "Got 10 perfect passes in one run!");
                }
                if (this.perfectPassCount >= 20) {
                  this.checkAchievement("bullseye_master", "🎪 Bullseye Master", "Got 20 perfect passes in one run!");
                }
              }
              
              this.score += points;
              this.pipePoints += points;
              
              // Create floating score popup at bear position
              const popupColor = isPerfectPass ? "#FFD700" : "#FFFFFF";
              this.createScorePopup(this.bear.x, this.bear.y - 40, points, popupColor);
              
              // Enhanced combo screen shake
              if (this.consecutiveTubesPassed >= 10) {
                this.screenShake(6, 300); // BIG shake for 10+ combo
              } else if (this.consecutiveTubesPassed >= 5) {
                this.screenShake(4, 200); // Medium shake for 5+ combo
              } else {
                this.screenShake(1, 100); // Small shake for normal pass
              }
              
              // Check for streak bonuses
              this.checkStreakBonus();
              
              // Play pipe pass sound with pitch variation based on streak
              const pitchVariation = Math.min(this.consecutiveTubesPassed * 0.05, 0.3);
              this.pipePassSound?.play({ 
                detune: pitchVariation * 1200 // Convert to cents (100 cents = 1 semitone)
              });
              
              // Emit events
              this.events.emit("scoreUpdated", this.score);
              this.events.emit("pipesUpdated", this.tubesPassedCount, this.pipePoints);
              this.events.emit("streakUpdated", this.consecutiveTubesPassed);
              
              // Reset consecutive coins (missed the gap)
              this.consecutiveCoins = 0;
              
              // Check achievements
              this.checkPassingAchievements();
              
              // Check for boss trigger after reaching required score
              this.checkBossTrigger();
              if (this.gameOver) return; // Boss triggered, exit early
              
              // Increase difficulty
              this.updateDifficulty();
            } else {
              // Bear passed the pipe but missed the gap - STREAK LOST!
              this.handleStreakLoss();
              
              // Reset consecutive coins (missed the gap)
              this.consecutiveCoins = 0;
            }
          }
        }
      }
    });
  }
  
  /**
   * Check for streak bonuses
   */
  checkStreakBonus(): void {
    const streak = this.consecutiveTubesPassed;

    // 🔥 DOPAMINE RUSH - Tons of streak milestones for maximum satisfaction!
    if (streak === 3) {
      const bonus = 2;
      this.score += bonus;
      this.createStreakEffect("3 STREAK!", bonus, "#00FF00");
      this.sound.play("combo_pickup", { volume: 0.3 });
      this.screenShake(1, 100);
    } else if (streak === 5) {
      const bonus = 5;
      this.score += bonus;
      this.createStreakEffect("5 IN A ROW!", bonus, "#FFD700");
      this.sound.play("combo_pickup", { volume: 0.4 });
      this.screenShake(2, 150);
    } else if (streak === 7) {
      const bonus = 8;
      this.score += bonus;
      this.createStreakEffect("7 STREAK!\nLUCKY!", bonus, "#00FFFF");
      this.sound.play("combo_pickup", { volume: 0.45 });
      this.screenShake(2, 180);
    } else if (streak === 10) {
      const bonus = 15;
      this.score += bonus;
      this.createStreakEffect("10 IN A ROW!\n🔥 ON FIRE!", bonus, "#FF6B00");
      this.sound.play("new_high_score", { volume: 0.4 });
      this.screenShake(4, 250);
      this.createFireParticles();
    } else if (streak === 15) {
      const bonus = 25;
      this.score += bonus;
      this.createStreakEffect("15 STREAK!\n⚡ ELECTRIFYING!", bonus, "#FFFF00");
      this.sound.play("new_high_score", { volume: 0.45 });
      this.screenShake(5, 300);
      this.createLightningEffect();
    } else if (streak === 20) {
      const bonus = 40;
      this.score += bonus;
      this.createStreakEffect("20 IN A ROW!\n🚀 MEGA STREAK!", bonus, "#FF00FF");
      this.sound.play("new_high_score", { volume: 0.5 });
      this.screenShake(6, 400);
      this.cameras.main.zoomTo(1.1, 200);
      this.time.delayedCall(400, () => this.cameras.main.zoomTo(1.0, 300));
    } else if (streak === 25) {
      const bonus = 60;
      this.score += bonus;
      this.createStreakEffect("25 STREAK!\n💎 DIAMOND!", bonus, "#00FFFF");
      this.sound.play("new_high_score", { volume: 0.55 });
      this.screenShake(7, 450);
      this.createDiamondExplosion();
    } else if (streak === 30) {
      const bonus = 80;
      this.score += bonus;
      this.createStreakEffect("30 IN A ROW!\n👑 LEGENDARY!", bonus, "#FFD700");
      this.sound.play("new_high_score", { volume: 0.6 });
      this.screenShake(8, 500);
      this.cameras.main.zoomTo(1.15, 250);
      this.time.delayedCall(500, () => this.cameras.main.zoomTo(1.0, 350));
      this.createGoldenRain();
    } else if (streak === 40) {
      const bonus = 120;
      this.score += bonus;
      this.createStreakEffect("40 STREAK!\n🌟 MYTHICAL!", bonus, "#FF00FF");
      this.sound.play("new_high_score", { volume: 0.65 });
      this.screenShake(9, 550);
      this.createRainbowExplosion();
    } else if (streak === 50) {
      const bonus = 175;
      this.score += bonus;
      this.createStreakEffect("50 IN A ROW!\n⭐ GODLIKE!", bonus, "#FFFFFF");
      this.sound.play("new_high_score", { volume: 0.7 });
      this.screenShake(10, 600);
      this.cameras.main.zoomTo(1.2, 300);
      this.time.delayedCall(600, () => this.cameras.main.zoomTo(1.0, 400));
      this.createGodlikeAura();
    } else if (streak === 75) {
      const bonus = 300;
      this.score += bonus;
      this.createStreakEffect("75 STREAK!\n🔱 TRANSCENDENT!", bonus, "#FF6B00");
      this.sound.play("new_high_score", { volume: 0.75 });
      this.screenShake(12, 700);
      this.createTranscendentEffect();
    } else if (streak === 100) {
      const bonus = 500;
      this.score += bonus;
      this.createStreakEffect("💯 100 STREAK!\n🏆 IMMORTAL BEAR!", bonus, "#FFD700");
      this.sound.play("new_high_score", { volume: 0.8 });
      this.screenShake(15, 800);
      this.cameras.main.zoomTo(1.25, 350);
      this.time.delayedCall(700, () => this.cameras.main.zoomTo(1.0, 450));
      this.createImmortalExplosion();
    }

    // Emit streak update
    this.events.emit("scoreUpdated", this.score);

    // Check for boss trigger after any streak bonus
    this.checkBossTrigger();
  }

  /**
   * 🔥 DOPAMINE EFFECTS - Visual explosions for maximum satisfaction
   */
  createFireParticles(): void {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(100, this.scale.width - 100);
      const particle = this.add.circle(x, this.scale.height + 20, Phaser.Math.Between(5, 12), 0xFF6B00);
      particle.setDepth(1500);
      this.tweens.add({
        targets: particle,
        y: -50,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(800, 1500),
        delay: i * 50,
        ease: "Power2",
        onComplete: () => particle.destroy()
      });
    }
  }

  createLightningEffect(): void {
    // Flash the screen
    this.cameras.main.flash(200, 255, 255, 0, true);

    // Create lightning bolts
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(50, this.scale.width - 50);
      const bolt = this.add.rectangle(x, this.scale.height / 2, 4, this.scale.height, 0xFFFF00);
      bolt.setDepth(1600);
      bolt.setAlpha(0.8);
      this.tweens.add({
        targets: bolt,
        alpha: 0,
        scaleX: 3,
        duration: 150,
        delay: i * 40,
        onComplete: () => bolt.destroy()
      });
    }
  }

  createDiamondExplosion(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const diamond = this.add.rectangle(centerX, centerY, 15, 15, 0x00FFFF);
      diamond.setRotation(Math.PI / 4);
      diamond.setDepth(1700);
      this.tweens.add({
        targets: diamond,
        x: centerX + Math.cos(angle) * 400,
        y: centerY + Math.sin(angle) * 400,
        alpha: 0,
        scale: 2,
        rotation: diamond.rotation + Math.PI * 2,
        duration: 1000,
        ease: "Power2",
        onComplete: () => diamond.destroy()
      });
    }
  }

  createGoldenRain(): void {
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const coin = this.add.circle(x, -20, Phaser.Math.Between(8, 15), 0xFFD700);
      coin.setDepth(1500);
      this.tweens.add({
        targets: coin,
        y: this.scale.height + 50,
        rotation: Math.PI * 4,
        duration: Phaser.Math.Between(1500, 2500),
        delay: i * 30,
        ease: "Sine.easeIn",
        onComplete: () => coin.destroy()
      });
    }
  }

  createRainbowExplosion(): void {
    const colors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3];
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    colors.forEach((color, colorIndex) => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + (colorIndex * 0.1);
        const particle = this.add.circle(centerX, centerY, 10, color);
        particle.setDepth(1800);
        this.tweens.add({
          targets: particle,
          x: centerX + Math.cos(angle) * (200 + colorIndex * 30),
          y: centerY + Math.sin(angle) * (200 + colorIndex * 30),
          alpha: 0,
          scale: 0.5,
          duration: 1200,
          delay: colorIndex * 50,
          ease: "Power2",
          onComplete: () => particle.destroy()
        });
      }
    });
  }

  createGodlikeAura(): void {
    // Pulsing white rings
    for (let i = 0; i < 5; i++) {
      const ring = this.add.circle(this.bear.x, this.bear.y, 20, 0xFFFFFF, 0);
      ring.setStrokeStyle(4, 0xFFFFFF, 0.8);
      ring.setDepth(1900);
      this.tweens.add({
        targets: ring,
        scale: 15,
        alpha: 0,
        duration: 1500,
        delay: i * 200,
        ease: "Power2",
        onComplete: () => ring.destroy()
      });
    }

    // Screen flash
    this.cameras.main.flash(300, 255, 255, 255, true);
  }

  createTranscendentEffect(): void {
    // Spiral particles
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 4;
      const distance = i * 10;
      const x = this.scale.width / 2 + Math.cos(angle) * distance;
      const y = this.scale.height / 2 + Math.sin(angle) * distance;
      const particle = this.add.circle(this.scale.width / 2, this.scale.height / 2, 6, 0xFF6B00);
      particle.setDepth(2000);
      this.tweens.add({
        targets: particle,
        x: x,
        y: y,
        alpha: 0,
        scale: 2,
        duration: 1500,
        delay: i * 25,
        ease: "Power2",
        onComplete: () => particle.destroy()
      });
    }
  }

  createImmortalExplosion(): void {
    // MEGA explosion - all effects combined!
    this.createFireParticles();
    this.createGoldenRain();
    this.createRainbowExplosion();

    // Giant pulsing text
    const immortalText = this.add.text(this.scale.width / 2, this.scale.height / 2, "🏆 IMMORTAL 🏆", {
      fontFamily: "SupercellMagic",
      fontSize: "72px",
      color: "#FFD700",
      stroke: "#000000",
      strokeThickness: 8
    });
    immortalText.setOrigin(0.5, 0.5);
    immortalText.setDepth(3000);

    this.tweens.add({
      targets: immortalText,
      scale: { from: 0.5, to: 2 },
      alpha: { from: 1, to: 0 },
      rotation: { from: -0.1, to: 0.1 },
      duration: 2500,
      ease: "Power2",
      onComplete: () => immortalText.destroy()
    });

    // Multiple screen flashes
    this.cameras.main.flash(150, 255, 215, 0, true);
    this.time.delayedCall(200, () => this.cameras.main.flash(150, 255, 255, 255, true));
    this.time.delayedCall(400, () => this.cameras.main.flash(150, 255, 0, 255, true));
  }
  
  /**
   * Handle streak loss when player misses the gap
   */
  handleStreakLoss(): void {
    // Only show streak loss effect if player actually had a streak
    if (this.consecutiveTubesPassed > 0) {
      // Create streak lost effect
      this.createStreakLostEffect();
      
      // Play streak lost sound
      this.sound.play("tube_hit", { volume: 0.3, detune: -800 }); // Lower pitch for disappointment
      
      // Emit streak lost event to UI for wiggle effect
      this.events.emit("streakLost", this.consecutiveTubesPassed);
    }
    
    // Reset streak counter
    this.consecutiveTubesPassed = 0;
    
    // Emit streak update
    this.events.emit("streakUpdated", this.consecutiveTubesPassed);
  }

  /**
   * Create streak lost visual effect
   */
  createStreakLostEffect(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 8;  // Moved UP - was /3, now /8
    
    const streakLostText = this.add.text(centerX, centerY, "STREAK LOST!", {
      fontFamily: "SupercellMagic",
      fontSize: "42px",
      color: "#FF4444",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    });
    streakLostText.setOrigin(0.5, 0.5);
    streakLostText.setDepth(2000);
    streakLostText.setScrollFactor(0);
    
    // Animate with scale up and fade
    this.tweens.add({
      targets: streakLostText,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 1, to: 0 },
      duration: 1200,
      ease: "Power2.easeOut",
      onComplete: () => streakLostText.destroy()
    });
    
    // Screen shake for emphasis
    this.screenShake(4, 300);
  }

  /**
   * Create streak bonus effect
   */
  createStreakEffect(text: string, bonus: number, color: string): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 8;  // Moved UP - was /3, now /8
    
    const streakText = this.add.text(centerX, centerY, text, {
      fontFamily: "SupercellMagic",
      fontSize: "48px",
      color: color,
      stroke: "#000000",
      strokeThickness: 6,
      align: "center"
    });
    streakText.setOrigin(0.5, 0.5);
    streakText.setDepth(2000);
    streakText.setScrollFactor(0);
    
    const bonusText = this.add.text(centerX, centerY + 60, `+${bonus} BONUS!`, {
      fontFamily: "SupercellMagic",
      fontSize: "36px",
      color: "#FFFF00",
      stroke: "#000000",
      strokeThickness: 5
    });
    bonusText.setOrigin(0.5, 0.5);
    bonusText.setDepth(2000);
    bonusText.setScrollFactor(0);
    
    // Animate
    this.tweens.add({
      targets: [streakText, bonusText],
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      y: "-=50",
      duration: 1500,
      ease: "Power2",
      onComplete: () => {
        streakText.destroy();
        bonusText.destroy();
      }
    });
  }
  
  /**
   * Create perfect pass effect
   */
  createPerfectPassEffect(x: number, y: number): void {
    // Create "PERFECT!" text
    const perfectText = this.add.text(x, y + 50, "PERFECT!", {
      fontFamily: "SupercellMagic",
      fontSize: "28px",
      color: "#FFD700",
      stroke: "#000000",
      strokeThickness: 4
    });
    perfectText.setOrigin(0.5, 0.5);
    perfectText.setDepth(1500);
    
    // Animate
    this.tweens.add({
      targets: perfectText,
      y: y + 20,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: "Power2",
      onComplete: () => perfectText.destroy()
    });
    
    // Create star particles around the bear
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 30;
      const star = this.add.circle(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        4,
        0xFFD700
      );
      star.setDepth(1500);
      
      this.tweens.add({
        targets: star,
        x: star.x + Math.cos(angle) * 40,
        y: star.y + Math.sin(angle) * 40,
        alpha: 0,
        scale: 0,
        duration: 600,
        ease: "Power2",
        onComplete: () => star.destroy()
      });
    }
  }
  
  /**
   * Check achievements related to passing tubes
   */
  checkPassingAchievements(): void {
    // Score-based achievements
    if (this.score >= 10) {
      this.checkAchievement("first_flight", "🎈 First Flight", "Reached score 10!");
    }
    if (this.score >= 25) {
      this.checkAchievement("rising_star", "⭐ Rising Star", "Reached score 25!");
    }
    if (this.score >= 50) {
      this.checkAchievement("sky_master", "🦅 Sky Master", "Reached score 50!");
    }
    if (this.score >= 100) {
      this.checkAchievement("legend", "👑 Legend", "Reached score 100!");
    }
    if (this.score >= 200) {
      this.checkAchievement("immortal", "💎 Immortal", "Reached score 200!");
    }
    if (this.score >= 500) {
      this.checkAchievement("god_mode", "🌟 God Mode", "Reached score 500!");
    }
    
    // Pipe passing achievements
    if (this.tubesPassedCount >= 25) {
      this.checkAchievement("pipe_navigator", "🚀 Pipe Navigator", "Passed 25 pipes!");
    }
    if (this.tubesPassedCount >= 50) {
      this.checkAchievement("obstacle_master", "🏆 Obstacle Master", "Passed 50 pipes!");
    }
    if (this.tubesPassedCount >= 100) {
      this.checkAchievement("centurion", "💯 Centurion", "Passed 100 pipes!");
    }
    
    // Streak achievements
    if (this.consecutiveTubesPassed >= 15) {
      this.checkAchievement("hot_streak", "🔥 Hot Streak", "15 pipes in a row!");
    }
    if (this.consecutiveTubesPassed >= 30) {
      this.checkAchievement("unstoppable", "⚡ Unstoppable", "30 pipes in a row!");
    }
    
    // Power-up achievements
    if (this.isJesterHatActive && this.tubesPassedCount >= 10) {
      this.checkAchievement("invincible", "🎩 Invincible", "Passed 10 pipes with jester hat!");
    }
    if (this.bear.jesterHatStacks >= 3) {
      this.checkAchievement("triple_threat", "🎪 Triple Threat", "Stacked 3 jester hats!");
    }
  }
  
  /**
   * Handle power-up collection (supports stacking)
   */
  handlePowerUpCollection(bear: any, powerUp: any): void {
    if (this.gameOver) return;
    
    const powerUpType = powerUp.powerUpType || "jesterHat"; // Default to jester hat for backward compatibility
    
    if (powerUpType === "magnet") {
      // Activate magnet
      console.log("🧲 Magnet collected!");
      this.bear.activateMagnet(powerUpConfig.magnetDuration.value);
      this.sound.play("combo_pickup", { volume: 0.4 });
      this.screenShake(2, 200);
      this.createScorePopup(powerUp.x, powerUp.y, "MAGNET!", "#00FFFF");
      powerUp.destroy();
      return;
    }
    
    // Jester hat logic
    console.log("🎩 Jester hat collected! Current speed BEFORE:", this.currentScrollSpeed);
    
    // Activate jester hat power-up (will increment stack count)
    this.bear.activateJesterHat(powerUpConfig.jesterHatDuration.value);
    
    // Mark jester hat as active
    this.isJesterHatActive = true;
    
    // INSTANT SPEED BOOST with STACKING - Each hat adds significant speed
    // Stack 1: 2.0x speed
    // Stack 2: 2.5x speed  
    // Stack 3: 3.0x speed
    const stackMultiplier = 1.5 + (this.bear.jesterHatStacks * 0.5);
    this.currentScrollSpeed = this.baseScrollSpeed * stackMultiplier;
    
    // MUCH faster tube spawning for bonus point farming - more stacks = CRAZY fast spawning!
    // Stack 1: 35% of normal (2.86x faster) - tubes every ~770ms
    // Stack 2: 25% of normal (4x faster) - tubes every ~550ms
    // Stack 3: 18% of normal (5.56x faster) - tubes every ~400ms
    const spawnMultiplier = Math.max(0.18, 0.5 - (this.bear.jesterHatStacks * 0.15));
    this.tubeSpawnInterval = gameplayConfig.tubeSpawnInterval.value * spawnMultiplier;
    
    console.log("🚀 Speed AFTER power-up:", this.currentScrollSpeed, "Base:", this.baseScrollSpeed, "Stack:", this.bear.jesterHatStacks, "Multiplier:", stackMultiplier.toFixed(2));
    
    // IMMEDIATELY restart the spawn timer with new interval for instant effect
    if (this.tubeSpawnTimer) {
      this.tubeSpawnTimer.remove();
    }
    this.scheduleNextTubeSpawn();
    
    // Update all moving objects' speeds INSTANTLY
    this.updateAllObjectSpeeds();
    console.log("✅ All objects updated to new speed!");
    
    // Start color cycling on all existing pipes
    this.startPipeColorCycling();
    
    // Play sound
    this.sound.play("combo_pickup", { volume: 0.4 });
    
    // Special celebration for stack 3
    if (this.bear.jesterHatStacks === 3) {
      this.screenShake(8, 500);
      this.createStackMaxEffect();
      this.sound.play("new_high_score", { volume: 0.6 });
    }
    
    // Remove old deactivation listener if exists
    this.events.off("jesterHatDeactivated");
    
    // Listen for deactivation to restore speed
    this.events.once("jesterHatDeactivated", () => {
      this.isJesterHatActive = false;
      // Restore to base speed (without multiplier)
      this.currentScrollSpeed = this.baseScrollSpeed;
      // Restore normal spawn interval
      this.tubeSpawnInterval = gameplayConfig.tubeSpawnInterval.value;
      // Restart spawn timer with normal interval
      if (this.tubeSpawnTimer) {
        this.tubeSpawnTimer.remove();
      }
      this.scheduleNextTubeSpawn();
      // Update all objects to normal speed
      this.updateAllObjectSpeeds();
      // Stop color cycling on all pipes
      this.stopPipeColorCycling();
    });
    
    // Destroy power-up
    powerUp.destroy();
  }
  
  /**
   * Update all moving objects to current scroll speed
   */
  updateAllObjectSpeeds(): void {
    this.tubes.children.entries.forEach((tube: any) => {
      if (tube.body) {
        tube.body.setVelocityX(-this.currentScrollSpeed);
      }
    });
    this.coins.children.entries.forEach((coin: any) => {
      if (coin.body) {
        coin.body.setVelocityX(-this.currentScrollSpeed);
      }
    });
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy instanceof EnemyBee && enemy.body) {
        enemy.body.setVelocityX(-this.currentScrollSpeed);
      }
    });
    this.powerUps.children.entries.forEach((powerUp: any) => {
      if (powerUp.body) {
        powerUp.body.setVelocityX(-this.currentScrollSpeed);
      }
    });
  }
  
  /**
   * Start color cycling on all pipes (green, yellow, purple)
   */
  startPipeColorCycling(): void {
    this.tubes.children.entries.forEach((tube: any) => {
      if (tube instanceof CryptoPipe) {
        tube.startColorCycling(this);
      }
    });
  }
  
  /**
   * Stop color cycling on all pipes and return to their original colors
   */
  stopPipeColorCycling(): void {
    this.tubes.children.entries.forEach((tube: any) => {
      if (tube instanceof CryptoPipe) {
        // Return to normal color (no tint)
        tube.stopColorCycling("normal");
      }
    });
  }
  
  /**
   * Handle token collection
   */
  handleCoinCollection(bear: any, token: any): void {
    if (this.gameOver) return;
    
    const isGoldenBear = token.isGoldenBear;
    const isHighValue = token.isHighValue || false;
    let basePoints = isGoldenBear 
      ? gameplayConfig.pointsPerGoldenBearToken.value 
      : gameplayConfig.pointsPerXRPToken.value;
    
    // High-value coins give bonus points
    if (isHighValue) {
      basePoints = Math.floor(basePoints * 1.5); // 50% bonus for high-value coins
    }
    
    // Increment consecutive coins first
    this.consecutiveCoins++;
    
    // Enhanced combo system with progressive multipliers
    let comboMultiplier = 1;
    let comboText = "";
    if (this.consecutiveCoins >= 3) {
      // Progressive combo multipliers: 3-5 coins = 1.5x, 6-8 = 2x, 9-11 = 2.5x, etc.
      const comboTier = Math.floor((this.consecutiveCoins - 3) / 3);
      comboMultiplier = 1 + ((comboTier + 1) * 0.5);
      comboText = `x${comboMultiplier.toFixed(1)}`;
    }
    
    const totalPoints = Math.floor(basePoints * comboMultiplier);
    
    // Enhanced visual and audio feedback
    this.createCoinSparkleEffect(token.x, token.y, isGoldenBear);
    this.enhancedScreenShake(1 + Math.min(this.consecutiveCoins * 0.3, 4), 120, "coin_collect");
    
    // Track separately
    if (isGoldenBear) {
      this.goldenBearsCollected++;
      this.goldenBearTokenPoints += totalPoints;
      
      // Check golden bear achievement
      if (this.goldenBearsCollected >= 10) {
        this.checkAchievement("golden_touch", "✨ Golden Touch", "Collected 10 Golden Bears!");
      }
    } else {
      this.coinsCollected++;
      this.xrpTokenPoints += totalPoints;
    }
    
    // Combo-based sound effects with pitch scaling
    const pitchBonus = Math.min(this.consecutiveCoins * 0.08, 0.6);
    if (this.consecutiveCoins >= 3) {
      this.comboSound?.play({ detune: pitchBonus * 1200 });
    } else {
      this.coinSound?.play({ detune: pitchBonus * 600 });
    }
    
    // Enhanced combo effects and achievements
    if (this.consecutiveCoins >= 5) {
      this.createEnhancedComboEffect(token.x, token.y, this.consecutiveCoins, comboMultiplier);
      this.checkAchievement("coin_streak", "💰 Coin Streak", "Collected 5 coins in a row!");
    }
    
    if (this.consecutiveCoins >= 10) {
      this.createMegaComboEffect(token.x, token.y);
      this.checkAchievement("coin_master", "💎 Coin Master", "Collected 10 coins in a row!");
    }
    
    if (this.consecutiveCoins >= 15) {
      this.checkAchievement("coin_legend", "👑 Coin Legend", "Collected 15 coins in a row!");
    }
    
    if (this.consecutiveCoins >= 20) {
      this.checkAchievement("coin_deity", "⚡ Coin Deity", "Collected 20 coins in a row!");
    }
    
    // Check XRP collection achievements
    const totalXRP = parseInt(localStorage.getItem("flappyBearTotalCoins") || "0");
    if (totalXRP + this.coinsCollected >= 100) {
      this.checkAchievement("crypto_collector", "🪙 Crypto Collector", "Collected 100 XRP total!");
    }
    
    // Single run collection achievements
    if (this.coinsCollected >= 50) {
      this.checkAchievement("token_hunter", "💰 Token Hunter", "Collected 50 tokens in one run!");
    }
    if (this.goldenBearsCollected >= 5) {
      this.checkAchievement("bear_collector", "🐻 Bear Collector", "Collected 5 golden bears in one run!");
    }
    
    // Add score
    this.score += totalPoints;
    
    // Enhanced score popup with combo info
    const isCombo = this.consecutiveCoins >= 3;
    let popupText: string;
    if (isCombo) {
      popupText = `+${totalPoints} ${comboText}`;
    } else if (isHighValue) {
      popupText = `+${totalPoints} ★`;
    } else {
      popupText = `+${totalPoints}`;
    }
    
    const popupColor = isCombo ? "#FF6B00" : (isGoldenBear ? "#FFD700" : "#00D4FF");
    this.createScorePopup(token.x, token.y, popupText, popupColor, isCombo);
    
    // Check for score milestones
    this.checkScoreMilestones();
    
    // Update UI
    this.events.emit("scoreUpdated", this.score);
    this.events.emit("coinsUpdated", this.coinsCollected, this.goldenBearsCollected, this.xrpTokenPoints, this.goldenBearTokenPoints);
    
    // Check for boss trigger after token collection
    this.checkBossTrigger();
    if (this.gameOver) return;
    
    // Destroy token
    token.destroy();
  }

  /**
   * Create enhanced combo visual effect
   */
  createEnhancedComboEffect(x: number, y: number, comboCount: number, multiplier: number): void {
    let comboTitle = "COMBO!";
    let comboColor = "#FFD700";
    
    if (comboCount >= 15) {
      comboTitle = "LEGENDARY!";
      comboColor = "#FF00FF";
    } else if (comboCount >= 10) {
      comboTitle = "MEGA COMBO!";
      comboColor = "#FF6B00";
    } else if (comboCount >= 7) {
      comboTitle = "SUPER COMBO!";
      comboColor = "#FF8C00";
    }
    
    const comboText = this.add.text(x, y - 20, comboTitle, {
      fontFamily: "SupercellMagic",
      fontSize: "36px",
      color: comboColor,
      stroke: "#000000",
      strokeThickness: 4
    });
    comboText.setOrigin(0.5, 0.5);
    comboText.setDepth(2000);
    
    const multiplierText = this.add.text(x, y + 15, `${multiplier.toFixed(1)}x MULTIPLIER`, {
      fontFamily: "SupercellMagic",
      fontSize: "24px",
      color: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 3
    });
    multiplierText.setOrigin(0.5, 0.5);
    multiplierText.setDepth(2000);
    
    // Animate combo text
    this.tweens.add({
      targets: comboText,
      y: y - 80,
      alpha: 0,
      scale: 1.8,
      duration: 1200,
      ease: "Power2",
      onComplete: () => comboText.destroy()
    });
    
    // Animate multiplier text
    this.tweens.add({
      targets: multiplierText,
      y: y - 45,
      alpha: 0,
      scale: 1.3,
      duration: 1000,
      delay: 200,
      ease: "Power2",
      onComplete: () => multiplierText.destroy()
    });
    
    // Create sparkle ring for high combos
    if (comboCount >= 10) {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 40;
        const sparkleX = x + Math.cos(angle) * distance;
        const sparkleY = y + Math.sin(angle) * distance;
        
        const sparkle = this.add.circle(sparkleX, sparkleY, 3, 0xFFFFFF);
        sparkle.setDepth(1999);
        
        this.tweens.add({
          targets: sparkle,
          scale: 0,
          alpha: 0,
          duration: 800,
          delay: i * 30,
          ease: "Power2",
          onComplete: () => sparkle.destroy()
        });
      }
    }
  }

  /**
   * Create mega combo effect for 10+ coins
   */
  createMegaComboEffect(x: number, y: number): void {
    // Create pulsing energy wave
    const energyWave = this.add.circle(x, y, 5, 0xFF6B00, 0.6);
    energyWave.setDepth(1998);
    
    this.tweens.add({
      targets: energyWave,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => energyWave.destroy()
    });
  }

  /**
   * Create combo visual effect (legacy)
   */
  createComboEffect(x: number, y: number): void {
    this.createEnhancedComboEffect(x, y, 5, 1.5);
  }
  
  /**
   * Create collection particle burst effect
   */
  createCollectionParticles(x: number, y: number, color: number): void {
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(80, 150);
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;
      
      const particle = this.add.circle(x, y, Phaser.Math.Between(3, 6), color, 0.9);
      particle.setDepth(1500);
      
      // Animate particle
      this.tweens.add({
        targets: particle,
        x: x + velocityX * 0.5,
        y: y + velocityY * 0.5,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        ease: "Power2",
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * Handle game over
   */
  async handleGameOver(): Promise<void> {
    if (this.gameOver) return;

    this.gameOver = true;

    // Stop spawning
    this.tubeSpawnTimer?.remove();

    // Stop all tubes, coins, enemies, and power-ups
    this.tubes.children.entries.forEach((tube: any) => {
      if (tube instanceof CryptoPipe) {
        tube.stop();
      } else if (tube.body) {
        tube.body.setVelocityX(0);
      }
    });
    this.coins.children.entries.forEach((coin: any) => {
      if (coin.body) {
        coin.body.setVelocityX(0);
      }
    });
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy instanceof EnemyBee) {
        enemy.stopMovement();
      }
    });
    this.powerUps.children.entries.forEach((powerUp: any) => {
      if (powerUp.body) {
        powerUp.body.setVelocityX(0);
      }
    });

    // Check for new high score
    let isNewHighScore = false;
    if (this.score > this.bestScore) {
      isNewHighScore = true;
      this.bestScore = this.score;
      localStorage.setItem("flappyBearBestScore", this.bestScore.toString());

      // Play high score sound and screen shake
      this.sound.play("new_high_score", { volume: 0.3 });
      this.screenShake(5, 400);
    }

    // Update total lifetime coins (separately for XRP and Golden Bears)
    const totalXRP = parseInt(localStorage.getItem("flappyBearTotalXRP") || "0");
    const totalGoldenBears = parseInt(localStorage.getItem("flappyBearTotalGoldenBears") || "0");

    localStorage.setItem("flappyBearTotalXRP", (totalXRP + this.coinsCollected).toString());
    localStorage.setItem("flappyBearTotalGoldenBears", (totalGoldenBears + this.goldenBearsCollected).toString());

    // Also update legacy total coins for backwards compatibility
    this.totalLifetimeCoins += this.coinsCollected + this.goldenBearsCollected;
    localStorage.setItem("flappyBearTotalCoins", this.totalLifetimeCoins.toString());

    // Calculate game duration and award honey points
    const gameEndTime = this.time.now;
    const durationMs = gameEndTime - this.gameStartTime;
    const minutesPlayed = durationMs / 60000; // Convert ms to minutes

    console.log(`🍯 Game duration: ${minutesPlayed.toFixed(2)} minutes`);

    // Award honey points using the global game-points-helper (shows popup)
    if ((window as any).awardGamePoints) {
      (window as any).awardGamePoints('flappy-bear', minutesPlayed);
    }

    // Play game over sound
    this.time.delayedCall(500, () => {
      this.sound.play("game_over_sound", { volume: 0.3 });
    });

    // Show game over UI after delay
    this.time.delayedCall(1500, () => {
      this.scene.launch("GameOverUIScene", {
        currentLevelKey: this.scene.key,
        score: this.score,
        bestScore: this.bestScore,
        coinsCollected: this.coinsCollected,
        isNewHighScore: isNewHighScore
      });
    });
  }

  /**
   * Update method
   */
  update(time: number, delta: number): void {
    if (this.gameOver) return;
    
    // Handle flap input (works both before and after game starts)
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.handleFlapInput();
    }
    
    // If game hasn't started, don't update game objects
    if (!this.gameStarted) return;
    
    // Update bear with combo count for visual effects
    this.bear.update(time, delta, this.consecutiveTubesPassed);
    
    // Check for near-miss bonuses
    this.checkNearMiss();
    
    // Handle magnet attraction
    if (this.bear.hasMagnet) {
      this.attractCoinsToPlayer();
    }
    
    // Time-based speed increase (gradual difficulty over time)
    if (time - this.lastSpeedIncreaseTime >= gameplayConfig.timeBasedSpeedIncreaseInterval.value) {
      this.lastSpeedIncreaseTime = time;
      
      // Increase base speed over time
      this.baseScrollSpeed += gameplayConfig.timeBasedSpeedIncrease.value;
      
      // Update current speed (apply jester hat multiplier if active)
      if (this.isJesterHatActive) {
        this.currentScrollSpeed = this.baseScrollSpeed * powerUpConfig.jesterHatSpeedMultiplier.value;
      } else {
        this.currentScrollSpeed = this.baseScrollSpeed;
      }
      
      // Update all existing objects with new speed
      this.updateAllObjectSpeeds();
    }
    
    // Update background parallax
    this.backgrounds.forEach((bg, index) => {
      bg.tilePositionX += this.currentScrollSpeed * delta * 0.001 * (0.2 + index * 0.3);
    });
    
    // Check if bear passed any pipes
    this.checkPipePassing();
    
    // Clean up off-screen tubes
    this.tubes.children.entries.forEach((tube: any) => {
      if (tube.x < -100) {
        tube.destroy();
      }
    });
    
    // Clean up off-screen coins
    this.coins.children.entries.forEach((coin: any) => {
      if (coin.x < -100) {
        // Coin missed - reset combo
        this.consecutiveCoins = 0;
        coin.destroy();
      }
    });
    
    // Clean up off-screen power-ups
    this.powerUps.children.entries.forEach((powerUp: any) => {
      if (powerUp.x < -100) {
        powerUp.destroy();
      }
    });
    
    // Update enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy instanceof EnemyBee) {
        enemy.update(time, delta);
      }
    });
  }

  /**
   * Check for near-miss bonuses (flying close to pipes without hitting)
   */
  checkNearMiss(): void {
    if (this.gameOver) return;
    
    this.tubes.children.entries.forEach((tube: any) => {
      // Only check tubes near the bear
      if (Math.abs(tube.x - this.bear.x) > 100) return;
      
      // Skip if already registered near-miss for this tube
      if (tube.nearMissRegistered) return;
      
      const distance = Phaser.Math.Distance.Between(
        this.bear.x, this.bear.y,
        tube.x, tube.y
      );
      
      // Check if close enough for near-miss
      if (distance < nearMissConfig.nearMissDistance.value && distance > 0) {
        tube.nearMissRegistered = true;
        const bonusPoints = nearMissConfig.nearMissPoints.value;
        this.score += bonusPoints;
        this.events.emit("scoreUpdated", this.score);
        
        // Check for boss trigger after near-miss bonus
        this.checkBossTrigger();
        if (this.gameOver) return;
        
        // Create dramatic near-miss effect
        this.createScorePopup(this.bear.x, this.bear.y - 40, "CLOSE CALL!", "#FF6B00");
        this.screenShake(4, 200);
        this.sound.play("xrp_coin_pickup", { volume: 0.2, detune: -400 });
      }
    });
  }
  
  /**
   * Attract coins to player when magnet is active
   */
  attractCoinsToPlayer(): void {
    const magnetRadius = powerUpConfig.magnetRadius.value;
    const attractionSpeed = powerUpConfig.magnetAttractionSpeed.value;
    
    this.coins.children.entries.forEach((coin: any) => {
      if (!coin.active || !coin.body) return;
      
      const distance = Phaser.Math.Distance.Between(
        this.bear.x, this.bear.y,
        coin.x, coin.y
      );
      
      if (distance < magnetRadius) {
        // Attract coin to player
        const angle = Phaser.Math.Angle.Between(
          coin.x, coin.y,
          this.bear.x, this.bear.y
        );
        
        const velocityX = Math.cos(angle) * attractionSpeed;
        const velocityY = Math.sin(angle) * attractionSpeed;
        
        coin.body.setVelocity(velocityX, velocityY);
      }
    });
  }
  
  /**
   * Update difficulty based on score
   */
  updateDifficulty(): void {
    const newLevel = Math.floor(
      this.tubesPassedCount / gameplayConfig.difficultyIncreaseInterval.value
    );
    
    if (newLevel > this.difficultyLevel) {
      this.difficultyLevel = newLevel;
      
      // Increase base speed progressively
      this.baseScrollSpeed += gameplayConfig.speedIncreasePerLevel.value;
      
      // Update current speed (apply jester hat multiplier if active)
      if (this.isJesterHatActive) {
        this.currentScrollSpeed = this.baseScrollSpeed * powerUpConfig.jesterHatSpeedMultiplier.value;
      } else {
        this.currentScrollSpeed = this.baseScrollSpeed;
      }
      
      // Update all existing objects with new speed
      this.updateAllObjectSpeeds();
      
      // Decrease gap progressively (but don't go below minimum)
      this.currentGapSize = Math.max(
        gameplayConfig.minGapSize.value,
        this.currentGapSize - gameplayConfig.gapDecreasePerLevel.value
      );
      
      // Decrease spawn interval (tubes spawn more frequently)
      this.tubeSpawnInterval = Math.max(
        gameplayConfig.minSpawnInterval.value,
        this.tubeSpawnInterval - gameplayConfig.spawnIntervalDecreasePerLevel.value
      );
      
      // Emit difficulty increase event for UI feedback
      this.events.emit("difficultyIncreased", this.difficultyLevel);
    }
  }
}
