import Phaser from "phaser";
import { FlappyBear } from "../FlappyBear";
import * as utils from "../utils";
import { gameplayConfig } from "../gameConfig.json";

/**
 * BossVictoryFlightScene - Rewarding coin collection flight after defeating a boss
 */
export class BossVictoryFlightScene extends Phaser.Scene {
  // Game objects
  bear!: FlappyBear;
  coins!: Phaser.GameObjects.Group;
  
  // Input
  spaceKey!: Phaser.Input.Keyboard.Key;
  
  // Game state
  gameStarted: boolean = false;
  collectionComplete: boolean = false;
  coinsCollected: number = 0;
  totalCoinsToCollect: number = 40; // 40 coins * 5 points = 200 points
  
  // Previous game data
  previousScore: number = 0;
  previousCoins: number = 0;
  currentSpeedMultiplier: number = 1.0;
  
  // Flight parameters
  flightPath: Phaser.Math.Vector2[] = [];
  currentPathIndex: number = 0;
  coinSpawnTimer?: Phaser.Time.TimerEvent;
  
  constructor() {
    super({ key: "BossVictoryFlightScene" });
  }

  init(data: { 
    previousScore?: number; 
    previousCoins?: number; 
    speedMultiplier?: number;
  }) {
    this.previousScore = data.previousScore || 0;
    this.previousCoins = data.previousCoins || 0;
    this.currentSpeedMultiplier = data.speedMultiplier || 1.0;
  }

  create(): void {
    console.log("Boss Victory Flight Scene created");
    
    // Reset state
    this.coinsCollected = 0;
    this.gameStarted = false;
    this.collectionComplete = false;
    this.currentPathIndex = 0;

    // Create beautiful victory background
    this.createVictoryBackground();

    // Create flight path for coins
    this.createFlightPath();

    // Create bear
    this.createBear();

    // Create coins group
    this.coins = this.add.group();

    // Setup input
    this.setupInput();

    // Setup collisions
    this.setupCollisions();

    // Start spawning coins along the flight path
    this.startCoinSpawning();

    // Show victory UI
    this.showVictoryMessage();

    console.log("Boss Victory Flight Scene setup complete");
  }

  createVictoryBackground(): void {
    // Gradient background from dark to light blue (victory sky)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x001122, 0x001122, 0x4488CC, 0x4488CC, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    
    // Add some celebration particles
    this.createCelebrationParticles();
  }

  createCelebrationParticles(): void {
    // Create golden celebration particles
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        Phaser.Math.Between(2, 5),
        0xFFD700,
        0.8
      );
      
      // Animate particles floating
      this.tweens.add({
        targets: particle,
        y: particle.y - 100,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 5000),
        repeat: -1,
        yoyo: true,
        ease: "Sine.easeInOut"
      });
    }
  }

  createFlightPath(): void {
    // Create a smooth S-curve flight path that the player can follow
    this.flightPath = [];
    
    const width = this.scale.width;
    const height = this.scale.height;
    const segments = 60; // Number of path segments
    
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const x = width * 0.1 + (width * 0.8) * progress; // Move left to right
      
      // Create an S-curve using sine waves
      const waveAmplitude = height * 0.3;
      const waveFrequency = 3;
      const y = height * 0.5 + Math.sin(progress * Math.PI * waveFrequency) * waveAmplitude * (1 - progress * 0.5);
      
      this.flightPath.push(new Phaser.Math.Vector2(x, y));
    }
  }

  createBear(): void {
    // Create bear at the start of the flight path
    const startPos = this.flightPath[0];
    this.bear = new FlappyBear(this, startPos.x, startPos.y);
    
    // Reduce gravity for easier flight
    this.bear.body.setGravityY(300);
    
    // Add victory glow effect to bear
    this.bear.setTint(0xFFFFAA);
    
    this.tweens.add({
      targets: this.bear,
      scale: { from: this.bear.scale * 0.95, to: this.bear.scale * 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  setupInput(): void {
    // Space for flapping
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Mouse/Touch for flapping
    this.input.on("pointerdown", () => {
      this.handleFlapInput();
    });
  }

  setupCollisions(): void {
    // Bear vs coins
    utils.addOverlap(
      this,
      this.bear,
      this.coins,
      this.handleCoinCollection,
      undefined,
      this
    );
  }

  startCoinSpawning(): void {
    // Spawn coins along the flight path every 200ms
    this.coinSpawnTimer = this.time.addEvent({
      delay: 200,
      repeat: this.totalCoinsToCollect - 1,
      callback: this.spawnNextCoin,
      callbackScope: this
    });
  }

  spawnNextCoin(): void {
    if (this.currentPathIndex >= this.flightPath.length) return;
    
    // Get position along flight path
    const pathPos = this.flightPath[this.currentPathIndex];
    
    // Add some randomization to make it more interesting
    const offsetX = Phaser.Math.Between(-30, 30);
    const offsetY = Phaser.Math.Between(-20, 20);
    
    // Alternate between XRP and Golden Bear tokens (more golden bears for boss reward)
    const isGoldenBear = Math.random() < 0.4; // 40% chance for golden bear (higher than normal)
    const tokenKey = isGoldenBear ? "golden_bear_token" : "xrp_token";
    
    const coin = this.add.image(pathPos.x + offsetX, pathPos.y + offsetY, tokenKey);
    utils.initScale(coin, { x: 0.5, y: 0.5 }, undefined, 60); // Slightly larger than normal
    this.physics.add.existing(coin);
    (coin.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (coin as any).isGoldenBear = isGoldenBear;
    this.coins.add(coin);
    
    // Add attractive spin animation
    this.tweens.add({
      targets: coin,
      angle: 360,
      duration: 1500,
      repeat: -1,
      ease: "Linear"
    });
    
    // Add attractive glow effect
    if (isGoldenBear) {
      this.tweens.add({
        targets: coin,
        scale: { from: coin.scale * 0.9, to: coin.scale * 1.1 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    } else {
      // XRP coins get a blue glow
      coin.setTint(0xAADDFF);
    }
    
    // Move to next path position
    this.currentPathIndex += Math.ceil(this.flightPath.length / this.totalCoinsToCollect);
    
    // Show path indicator (subtle line showing where coins will appear)
    if (this.currentPathIndex < this.flightPath.length) {
      const nextPos = this.flightPath[this.currentPathIndex];
      const indicator = this.add.circle(nextPos.x, nextPos.y, 3, 0xFFFFFF, 0.3);
      
      this.tweens.add({
        targets: indicator,
        alpha: 0,
        scale: 3,
        duration: 1000,
        onComplete: () => indicator.destroy()
      });
    }
  }

  handleFlapInput(): void {
    if (this.collectionComplete) return;
    
    if (!this.gameStarted) {
      this.gameStarted = true;
    }
    
    this.bear.flap();
  }

  handleCoinCollection(bear: FlappyBear, coin: any): void {
    if (this.collectionComplete) return;
    
    const isGoldenBear = coin.isGoldenBear;
    const points = isGoldenBear ? 
      gameplayConfig.pointsPerGoldenBearToken.value : 
      gameplayConfig.pointsPerXRPToken.value;
    
    this.coinsCollected++;
    
    // Create spectacular collection effect
    this.createVictoryCollectionEffect(coin.x, coin.y, isGoldenBear);
    
    // Play satisfying collection sound
    this.sound.play("xrp_coin_pickup", { volume: 0.4 });
    
    // Create floating score popup
    const color = isGoldenBear ? "#FFD700" : "#00DDFF";
    this.createScorePopup(coin.x, coin.y, points, color);
    
    // Check if collection is complete
    if (this.coinsCollected >= this.totalCoinsToCollect) {
      this.completeCollection();
    }
    
    // Destroy coin
    coin.destroy();
  }

  createVictoryCollectionEffect(x: number, y: number, isGoldenBear: boolean): void {
    const particleCount = 15;
    const color = isGoldenBear ? 0xFFD700 : 0x00DDFF;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(100, 200);
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;
      
      const particle = this.add.circle(x, y, Phaser.Math.Between(4, 8), color, 0.9);
      particle.setDepth(1500);
      
      // Animate particle with extra sparkle
      this.tweens.add({
        targets: particle,
        x: x + velocityX * 0.6,
        y: y + velocityY * 0.6,
        alpha: 0,
        scale: 0.1,
        duration: 800,
        ease: "Power2",
        onComplete: () => particle.destroy()
      });
    }
    
    // Screen shake for satisfying feedback
    this.cameras.main.shake(100, 0.005);
  }

  createScorePopup(x: number, y: number, points: number, color: string): void {
    const scoreText = this.add.text(x, y, `+${points}`, {
      fontFamily: "SupercellMagic",
      fontSize: "32px",
      color: color,
      stroke: "#000000",
      strokeThickness: 3
    });
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setDepth(1000);
    
    // Animate upward and fade out
    this.tweens.add({
      targets: scoreText,
      y: y - 70,
      alpha: 0,
      scale: 1.3,
      duration: 1200,
      ease: "Power2",
      onComplete: () => scoreText.destroy()
    });
  }

  completeCollection(): void {
    this.collectionComplete = true;
    
    // Calculate total bonus points
    const bonusPoints = this.totalCoinsToCollect * gameplayConfig.pointsPerXRPToken.value;
    const totalScore = this.previousScore + bonusPoints;
    
    console.log(`Collection complete! Bonus: ${bonusPoints}, Total: ${totalScore}`);
    
    // Stop any remaining coin spawning
    this.coinSpawnTimer?.destroy();
    
    // Play victory fanfare
    this.sound.play("new_high_score", { volume: 0.6 });
    
    // Show completion message
    this.showCompletionMessage(bonusPoints, totalScore);
    
    // Auto-restart after a delay
    this.time.delayedCall(3000, () => {
      this.restartGameWithSpeedIncrease(totalScore);
    });
  }

  showVictoryMessage(): void {
    const victoryText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.15,
      "BOSS DEFEATED!\nCOLLECT THE VICTORY COINS!",
      {
        fontFamily: "SupercellMagic",
        fontSize: "36px",
        color: "#FFD700",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center"
      }
    );
    victoryText.setOrigin(0.5, 0.5);
    victoryText.setDepth(2000);
    victoryText.setScrollFactor(0);
    
    // Animate message
    this.tweens.add({
      targets: victoryText,
      scale: { from: 0.8, to: 1.2 },
      duration: 1000,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.tweens.add({
          targets: victoryText,
          alpha: 0,
          duration: 1000,
          onComplete: () => victoryText.destroy()
        });
      }
    });
  }

  showCompletionMessage(bonusPoints: number, totalScore: number): void {
    const completionText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      `COLLECTION COMPLETE!\n+${bonusPoints} BONUS POINTS\nTOTAL SCORE: ${totalScore}\n\nRESTARTING AT 1.5X SPEED...`,
      {
        fontFamily: "SupercellMagic",
        fontSize: "32px",
        color: "#00FF00",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center"
      }
    );
    completionText.setOrigin(0.5, 0.5);
    completionText.setDepth(2000);
    completionText.setScrollFactor(0);
    
    // Animate completion message
    this.tweens.add({
      targets: completionText,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: "Back.easeOut"
    });
  }

  restartGameWithSpeedIncrease(finalScore: number): void {
    // Calculate new speed multiplier
    const newSpeedMultiplier = this.currentSpeedMultiplier * 1.5;
    
    console.log(`Restarting game with ${newSpeedMultiplier}x speed multiplier`);
    
    // Store the accumulated score and speed multiplier
    localStorage.setItem("flappyBearAccumulatedScore", finalScore.toString());
    localStorage.setItem("flappyBearSpeedMultiplier", newSpeedMultiplier.toString());
    
    // Stop current scene and start fresh game
    this.scene.stop("BossUIScene");
    this.scene.start("GameScene", {
      speedMultiplier: newSpeedMultiplier,
      accumulatedScore: finalScore
    });
  }

  update(time: number, delta: number): void {
    if (this.collectionComplete) return;
    
    // Update bear
    if (this.bear && this.bear.active) {
      this.bear.update(time, delta);
    }
    
    // Handle input
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.handleFlapInput();
    }
    
    // Remove coins that fall off screen
    this.coins.children.entries.forEach((coin: any) => {
      if (coin.y > this.scale.height + 100) {
        coin.destroy();
      }
    });
  }
}