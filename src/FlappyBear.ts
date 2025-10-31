import Phaser from "phaser";
import * as utils from "./utils";
import { bearConfig } from "./gameConfig.json";

/**
 * FlappyBear - The player character
 */
export class FlappyBear extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  // Configuration
  flapPower: number;
  gravity: number;
  maxFallSpeed: number;
  rotationSpeed: number;

  // State
  isDead: boolean;
  isFlapping: boolean;
  
  // Health system (for boss fights)
  public maxHealth: number = 3;
  public health: number = 3;
  public isInvulnerable: boolean = false;
  
  // Jester Hat Power-up
  hasJesterHat: boolean;
  jesterHatStacks: number; // Number of jester hats stacked
  jesterHatTimer?: Phaser.Time.TimerEvent;
  powerUpAura?: Phaser.GameObjects.Sprite;
  powerUpStars?: Phaser.GameObjects.Particles.ParticleEmitter;
  powerUpEffectObjects: Phaser.GameObjects.GameObject[]; // Array to store all power-up effect objects
  normalScale: number; // Store the normal scale to restore after jester hat

  // Magnet Power-up
  hasMagnet: boolean;
  magnetTimer?: Phaser.Time.TimerEvent;
  magnetEffectObjects: Phaser.GameObjects.GameObject[];

  // Particle Trail
  particleTrail?: Phaser.GameObjects.Particles.ParticleEmitter;

  // Sound effects
  flapSound?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bear_idle_frame1");

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Load configuration
    this.flapPower = bearConfig.flapPower.value;
    this.gravity = bearConfig.gravity.value;
    this.maxFallSpeed = bearConfig.maxFallSpeed.value;
    this.rotationSpeed = bearConfig.rotationSpeed.value;

    // FORCE RESET all state for fresh game
    this.forceReset();

    // Set physics properties
    this.body.setGravityY(this.gravity);
    this.body.setMaxVelocity(1000, this.maxFallSpeed);

    // Initialize scale and size - bear standard height
    const standardHeight = 128;
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, standardHeight, 0.6, 0.7);
    
    // Store the normal scale for restoring after jester hat
    this.normalScale = this.scale;

    // Initialize sounds
    this.initializeSounds();
    
    // Create particle trail effect
    this.createParticleTrail();

    // Play idle animation
    this.play("bear_idle_anim");
    
    console.log("🐻 FRESH BEAR CREATED - Health:", this.health, "isDead:", this.isDead, "isInvulnerable:", this.isInvulnerable);
  }

  /**
   * Force reset all bear state for fresh game start
   */
  forceReset(): void {
    console.log("🔄 FORCE RESETTING BEAR STATE");
    
    // Initialize arrays first to prevent undefined errors
    this.powerUpEffectObjects = this.powerUpEffectObjects || [];
    this.magnetEffectObjects = this.magnetEffectObjects || [];
    
    // Clear all timers first
    if (this.jesterHatTimer) {
      this.jesterHatTimer.remove();
      this.jesterHatTimer = undefined;
    }
    
    if (this.magnetTimer) {
      this.magnetTimer.remove();
      this.magnetTimer = undefined;
    }
    
    // Clear all visual effects (now safe to call)
    this.removePowerUpEffect();
    this.removeMagnetEffect();
    
    // Reset all state flags
    this.isDead = false;
    this.isFlapping = false;
    this.hasJesterHat = false;
    this.jesterHatStacks = 0;
    
    // Reset health system
    this.health = this.maxHealth;
    this.isInvulnerable = false;
    
    // Reset magnet state
    this.hasMagnet = false;
    
    // Clear any tints
    this.clearTint();
    
    // Reset body velocity
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
    
    console.log("✅ BEAR STATE RESET COMPLETE - Health:", this.health, "isDead:", this.isDead);
  }

  /**
   * Initialize sound effects
   */
  initializeSounds(): void {
    this.flapSound = this.scene.sound.add("wing_flap", { volume: 0.3 });
  }

  /**
   * Take damage (for boss fights)
   */
  takeDamage(damage: number): void {
    if (this.isInvulnerable || this.isDead) return;
    
    console.log(`Bear taking ${damage} damage. Health before: ${this.health}`);
    this.health -= damage;
    console.log(`Bear health after damage: ${this.health}`);
    
    if (this.health <= 0) {
      this.health = 0;
      console.log("💀 BEAR DEATH DETECTED - Health <= 0, FORCING IMMEDIATE GAME OVER");
      this.die();
      
      // ULTRA AGGRESSIVE: Force game over in boss scenes
      const currentScene = this.scene as any;
      if (currentScene.handleGameOver && typeof currentScene.handleGameOver === 'function') {
        console.log("💀 ULTRA FORCE: Bear died, IMMEDIATELY calling handleGameOver()");
        // Set gameOver flag first
        currentScene.gameOver = true;
        
        // Call handleGameOver multiple times to ensure it works
        console.log("💀 CALLING handleGameOver() - ATTEMPT 1");
        currentScene.handleGameOver();
        
        // Use multiple async approaches to ensure it gets called
        setTimeout(() => {
          console.log("💀 CALLING handleGameOver() - ATTEMPT 2 (timeout)");
          currentScene.handleGameOver();
        }, 1);
        
        this.scene.time.delayedCall(1, () => {
          console.log("💀 CALLING handleGameOver() - ATTEMPT 3 (delayedCall)");
          currentScene.handleGameOver();
        });
        
      } else {
        console.log("❌ ERROR: Boss scene doesn't have handleGameOver method!");
        console.log("Scene methods:", Object.getOwnPropertyNames(currentScene));
      }
    } else {
      // Brief invulnerability and visual feedback
      this.isInvulnerable = true;
      this.setTint(0xff4444);
      
      this.scene.time.delayedCall(1000, () => {
        this.isInvulnerable = false;
        this.clearTint();
      });
    }
  }

  /**
   * Kill the bear
   */
  die(): void {
    if (this.isDead) return;
    
    console.log("Bear die() method called");
    this.isDead = true;
    this.body.setVelocity(0, 200); // Fall down
    this.setTint(0x888888); // Gray out
    
    // Emit death event on the scene's event emitter
    console.log("Emitting bearDied event");
    this.scene.events.emit("bearDied");
  }

  /**
   * Make the bear flap its wings
   */
  flap(): void {
    if (this.isDead) return;

    // Calculate flap power with jester hat multiplier if active
    const flapPowerMultiplier = this.hasJesterHat ? 1.15 : 1;
    const effectiveFlapPower = this.flapPower * flapPowerMultiplier;
    
    // Set upward velocity
    this.body.setVelocityY(-effectiveFlapPower);

    // Play flap animation (jester version if power-up active)
    this.isFlapping = true;
    const flapAnim = this.hasJesterHat ? "bear_jester_flap_anim" : "bear_flap_anim";
    this.play(flapAnim, true);
    utils.resetOriginAndOffset(this, "right");

    // Play sound
    this.flapSound?.play();

    // Return to idle animation after flap completes
    this.once(`animationcomplete-${flapAnim}`, () => {
      this.isFlapping = false;
      if (!this.isDead) {
        const idleAnim = this.hasJesterHat ? "bear_jester_idle_anim" : "bear_idle_anim";
        this.play(idleAnim, true);
        utils.resetOriginAndOffset(this, "right");
      }
    });
  }
  
  /**
   * Activate jester hat power-up (supports stacking up to 3)
   */
  activateJesterHat(duration: number): void {
    if (this.isDead) return;
    
    // Maximum 3 stacks allowed
    if (this.jesterHatStacks >= 3) {
      console.log("🎪 Already at max stacks (3), ignoring power-up");
      return;
    }
    
    console.log("🎪 Activating jester hat! Stack count will be:", this.jesterHatStacks + 1);
    
    // Increment stack count
    this.jesterHatStacks++;
    
    // Clear any existing timer
    if (this.jesterHatTimer) {
      this.jesterHatTimer.remove();
    }
    
    this.hasJesterHat = true;
    
    // Switch to jester animations
    if (!this.isFlapping) {
      this.play("bear_jester_idle_anim", true);
      utils.resetOriginAndOffset(this, "right");
    }
    
    // Create power-up visual effects (star aura like Super Mario)
    this.createPowerUpEffect();
    
    // Emit power-up activated event with stack count
    this.scene.events.emit("jesterHatActivated", this.jesterHatStacks);
    
    // Set timer to deactivate
    this.jesterHatTimer = this.scene.time.delayedCall(duration, () => {
      this.deactivateJesterHat();
    });
  }
  
  /**
   * Deactivate jester hat power-up
   */
  deactivateJesterHat(): void {
    this.hasJesterHat = false;
    this.jesterHatStacks = 0; // Reset stack count
    
    // Switch back to normal animations immediately
    // Remove all animation event listeners to prevent jester animation callbacks
    this.off('animationcomplete');
    
    if (this.isFlapping) {
      // If currently flapping, switch to normal flap animation
      this.play("bear_flap_anim", true);
      utils.resetOriginAndOffset(this, "right");
      
      // Set up new completion handler for normal flap
      this.once('animationcomplete-bear_flap_anim', () => {
        this.isFlapping = false;
        if (!this.isDead) {
          this.play("bear_idle_anim", true);
          utils.resetOriginAndOffset(this, "right");
        }
      });
    } else {
      // If idle, switch to normal idle
      this.play("bear_idle_anim", true);
      utils.resetOriginAndOffset(this, "right");
    }
    
    // Remove visual effects
    this.removePowerUpEffect();
    
    // Emit power-up deactivated event
    this.scene.events.emit("jesterHatDeactivated");
  }
  
  /**
   * Create star aura power-up effect (like Super Mario star)
   */
  createPowerUpEffect(): void {
    // Clear any existing effects first
    this.removePowerUpEffect();
    
    // Only use 3 colors: red, blue, and yellow (normal)
    const colors = [0xFF0000, 0x0000FF, 0xFFFF00];
    
    // Create multiple rotating stars
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const radius = 60;
      
      const star = this.scene.add.circle(
        this.x + Math.cos(angle) * radius,
        this.y + Math.sin(angle) * radius,
        8,
        colors[i],
        0.8
      );
      
      star.setDepth(this.depth - 1);
      
      // Store reference in array for proper cleanup
      this.powerUpEffectObjects.push(star);
      
      // Tween for pulsing effect
      this.scene.tweens.add({
        targets: star,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0.4,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Rotate around bear
      this.scene.tweens.add({
        targets: star,
        angle: 360,
        duration: 1000,
        repeat: -1,
        ease: 'Linear',
        onUpdate: () => {
          if (this.active && star.active) {
            const currentAngle = angle + (Date.now() / 500);
            star.x = this.x + Math.cos(currentAngle) * radius;
            star.y = this.y + Math.sin(currentAngle) * radius;
          }
        }
      });
    }
    
    // Add color cycling tint to the bear sprite itself
    const tintColors = [0xFF0000, 0x0000FF, 0xFFFFFF]; // Red, Blue, Normal (white = no tint)
    let colorIndex = 0;
    
    // Create repeating tween that cycles through the colors
    const colorCycleTween = this.scene.tweens.addCounter({
      from: 0,
      to: tintColors.length - 1,
      duration: 600, // Change color every 600ms
      repeat: -1,
      onUpdate: (tween) => {
        if (this.active && this.hasJesterHat) {
          const newIndex = Math.floor(tween.getValue());
          if (newIndex !== colorIndex) {
            colorIndex = newIndex;
            this.setTint(tintColors[colorIndex]);
          }
        }
      }
    });
    
    // Store the tween so we can kill it later
    this.powerUpEffectObjects.push(colorCycleTween as any);
  }
  
  /**
   * Remove power-up visual effects
   */
  removePowerUpEffect(): void {
    // Safety check - ensure array exists before calling forEach
    if (this.powerUpEffectObjects && Array.isArray(this.powerUpEffectObjects)) {
      // Kill all tweens and destroy all power-up effect objects
      this.powerUpEffectObjects.forEach((obj: any) => {
        if (obj && obj.active) {
          // Remove all tweens targeting this object
          this.scene.tweens.killTweensOf(obj);
          // Destroy the visual object
          obj.destroy();
        }
      });
    }
    
    // Clear the array
    this.powerUpEffectObjects = [];
    this.powerUpAura = undefined;
    
    // Clear the bear's tint back to normal
    this.clearTint();
  }

  /**
   * Activate magnet power-up
   */
  activateMagnet(duration: number): void {
    if (this.isDead) return;
    
    console.log("🧲 Activating magnet power-up!");
    
    // Clear any existing timer
    if (this.magnetTimer) {
      this.magnetTimer.remove();
    }
    
    this.hasMagnet = true;
    
    // Create magnet visual effect
    this.createMagnetEffect();
    
    // Emit event
    this.scene.events.emit("magnetActivated");
    
    // Set timer to deactivate
    this.magnetTimer = this.scene.time.delayedCall(duration, () => {
      this.deactivateMagnet();
    });
  }
  
  /**
   * Deactivate magnet power-up
   */
  deactivateMagnet(): void {
    this.hasMagnet = false;
    
    // Remove visual effects
    this.removeMagnetEffect();
    
    // Emit event
    this.scene.events.emit("magnetDeactivated");
  }
  
  /**
   * Create magnet visual effect
   */
  createMagnetEffect(): void {
    // Clear any existing effects first
    this.removeMagnetEffect();
    
    // Create pulsing magnetic field circle
    const magnetField = this.scene.add.circle(
      this.x,
      this.y,
      80,
      0x00FFFF,
      0.2
    );
    magnetField.setDepth(this.depth - 1);
    magnetField.setStrokeStyle(3, 0x00FFFF, 0.8);
    
    this.magnetEffectObjects.push(magnetField);
    
    // Pulsing animation
    this.scene.tweens.add({
      targets: magnetField,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Follow bear
    this.scene.events.on('update', () => {
      if (magnetField.active && this.active) {
        magnetField.x = this.x;
        magnetField.y = this.y;
      }
    });
  }
  
  /**
   * Remove magnet visual effects
   */
  removeMagnetEffect(): void {
    // Safety check - ensure array exists before calling forEach
    if (this.magnetEffectObjects && Array.isArray(this.magnetEffectObjects)) {
      this.magnetEffectObjects.forEach((obj: any) => {
        if (obj && obj.active) {
          this.scene.tweens.killTweensOf(obj);
          obj.destroy();
        }
      });
    }
    this.magnetEffectObjects = [];
  }
  
  /**
   * Create particle trail effect
   */
  createParticleTrail(): void {
    // Create simple particle effect using graphics
    // We'll update this in the update loop
  }
  
  /**
   * Update particle trail based on speed and combos
   */
  updateParticleTrail(speed: number, comboCount: number): void {
    if (this.isDead) return;
    
    // Only show trail when moving fast or in combo
    if (speed < 200 && comboCount < 3) return;
    
    // Create trail particle
    const trail = this.scene.add.circle(
      this.x - 20,
      this.y,
      4,
      this.getTrailColor(comboCount),
      0.6
    );
    trail.setDepth(this.depth - 1);
    
    // Fade out
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        trail.destroy();
      }
    });
  }
  
  /**
   * Get trail color based on combo count
   */
  getTrailColor(comboCount: number): number {
    if (comboCount >= 10) return 0xFF00FF; // Rainbow/purple for 10+ combo
    if (comboCount >= 5) return 0xFF6B00;  // Orange for 5+ combo
    if (comboCount >= 3) return 0xFFFF00;  // Yellow for 3+ combo
    return 0x00FFFF; // Default cyan
  }
  
  /**
   * Apply rainbow glow effect when jester hat is active
   */
  applyRainbowGlow(): void {
    if (this.hasJesterHat) {
      // Rainbow tint cycling when jester hat is on
      const colors = [0xFF0000, 0xFF6B00, 0xFFFF00, 0x00FF00, 0x0000FF, 0xFF00FF];
      const colorIndex = Math.floor(Date.now() / 200) % colors.length;
      this.setTint(colors[colorIndex]);
    } else {
      // Clear tint when jester hat is off
      this.clearTint();
    }
  }

  /**
   * Update bear rotation based on velocity
   */
  updateRotation(): void {
    if (this.isDead) return;

    // Rotate based on vertical velocity
    const targetRotation = Phaser.Math.Clamp(
      this.body.velocity.y * this.rotationSpeed,
      -0.5,
      0.5
    );
    this.rotation = targetRotation;
  }



  /**
   * Create feather burst particle effect
   */
  createFeatherEffect(): void {
    // Simple tween effect - bear fades and falls
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      angle: -90,
      duration: 1000,
      ease: "Power2"
    });
  }

  /**
   * Main update method
   */
  update(time: number, delta: number, comboCount: number = 0): void {
    if (!this.active || !this.body) return;

    // Update rotation based on velocity
    this.updateRotation();
    
    // Update particle trail
    const speed = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y);
    if (Math.random() < 0.3) { // 30% chance each frame to spawn particle
      this.updateParticleTrail(speed, comboCount);
    }
    
    // Apply rainbow visual effect when jester hat is active
    this.applyRainbowGlow();

    // Check if out of bounds (death) - stricter top boundary
    // Top of screen death (can't fly above screen)
    if (this.y < 50) {
      if (!this.isDead && !this.hasJesterHat) {
        this.die(); // die() method already emits bearDied event
      } else if (this.hasJesterHat) {
        // Even with jester hat, prevent going above screen
        this.y = 50;
        this.body.setVelocityY(0);
      }
    }
    
    // Bottom of screen death
    if (this.y > this.scene.scale.height + 100) {
      if (!this.isDead) {
        this.die(); // die() method already emits bearDied event
      }
    }
  }
}
