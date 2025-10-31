import Phaser from "phaser";
import * as utils from "./utils";
import { LaserBeam } from "./LaserBeam";

/**
 * Gary Gensler Boss - Three phase boss fight
 */
export class GaryGenslerBoss extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  // Boss properties
  public maxHealth: number = 300; // 100 health per phase
  public health: number = 300;
  public currentPhase: number = 1;
  public isInvulnerable: boolean = false;
  public isTransitioning: boolean = false;
  
  // Movement properties
  public moveSpeed: number = 120;
  public baseY: number;
  public moveDirection: number = 1; // 1 for down, -1 for up
  public moveRange: number = 200;
  
  // Attack properties
  public lastAttackTime: number = 0;
  public attackCooldown: number = 2000; // 2 seconds between attacks
  public lasersGroup: Phaser.GameObjects.Group;
  
  // Phase textures
  private phaseTextures: string[] = [
    "gary_gensler_phase1",
    "gary_gensler_phase2", 
    "gary_gensler_phase3"
  ];
  
  // Vulnerable zones for each phase (relative to sprite center)
  private vulnerableZones: { [key: number]: Phaser.Geom.Rectangle } = {
    1: new Phaser.Geom.Rectangle(-80, -120, 160, 240), // Phase 1: much larger area
    2: new Phaser.Geom.Rectangle(-100, -20, 200, 160), // Phase 2: expanded bottom half (mouth area)
    3: new Phaser.Geom.Rectangle(-60, -120, 120, 80)   // Phase 3: expanded third eye area (upper head)
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "gary_gensler_phase1");

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Store base position
    this.baseY = y;

    // Initialize size using utils
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, 300, 0.8, 0.8);

    // Set physics properties
    this.body.setImmovable(true);
    this.body.setCollideWorldBounds(true);
    
    // Create lasers group
    this.lasersGroup = scene.add.group();
    
    // Set initial movement
    this.body.setVelocityY(this.moveSpeed * this.moveDirection);
    
    // Set depth to appear in front
    this.setDepth(100);
  }

  update(time: number, delta: number, playerY: number): void {
    if (this.isTransitioning) return;
    
    // Handle vertical movement
    this.handleMovement();
    
    // Handle attacks
    this.handleAttacks(time, playerY);
    
    // Update lasers
    this.lasersGroup.children.entries.forEach((laser: any) => {
      if (laser.update) {
        laser.update();
      }
    });
  }

  private handleMovement(): void {
    // Bounce between move range
    if (this.y <= this.baseY - this.moveRange) {
      this.moveDirection = 1;
      this.body.setVelocityY(this.moveSpeed * this.moveDirection);
    } else if (this.y >= this.baseY + this.moveRange) {
      this.moveDirection = -1;
      this.body.setVelocityY(this.moveSpeed * this.moveDirection);
    }
  }

  private handleAttacks(time: number, playerY: number): void {
    // Check if enough time has passed since last attack
    if (time - this.lastAttackTime < this.attackCooldown) return;
    
    this.lastAttackTime = time;
    
    // Different attack patterns for each phase
    switch (this.currentPhase) {
      case 1:
        // Phase 1: Single eye laser
        this.fireEyeLaser(playerY);
        break;
      case 2:
        // Phase 2: Mouth laser beam
        this.fireMouthLaser(playerY);
        break;
      case 3:
        // Phase 3: Third eye purple lasers
        this.fireThirdEyeLaser(playerY);
        break;
    }
  }

  private fireEyeLaser(targetY: number): void {
    // Play laser sound
    this.scene.sound.play("laser_fire", { volume: 0.3 });
    
    // Fire laser from left eye position (boss is facing left)
    const eyeX = this.x - 60; // Offset to eye position
    const eyeY = this.y - 40; // Offset to eye height
    
    const laser = new LaserBeam(this.scene, eyeX, eyeY, targetY);
    this.lasersGroup.add(laser);
  }

  private fireMouthLaser(targetY: number): void {
    // Play laser sound (different sound for mouth beam)
    this.scene.sound.play("laser_fire", { volume: 0.4 });
    
    // Fire laser from mouth position (boss is facing left)
    const mouthX = this.x - 40; // Offset to mouth position
    const mouthY = this.y + 30;  // Offset to mouth height (lower than eyes)
    
    // Create mouth laser beam
    const laser = new LaserBeam(this.scene, mouthX, mouthY, targetY);
    // Make mouth laser orange tinted
    laser.setTint(0xff6600); // Orange tint for mouth laser
    this.lasersGroup.add(laser);
  }

  private fireThirdEyeLaser(targetY: number): void {
    // Play different sound for third eye
    this.scene.sound.play("laser_fire", { volume: 0.4 });
    
    // Fire from third eye position (center top of head)
    const thirdEyeX = this.x - 20; // Center of forehead
    const thirdEyeY = this.y - 80; // Top of head
    
    // Fire multiple purple lasers in a spread pattern
    for (let i = 0; i < 3; i++) {
      const angleOffset = (i - 1) * 0.3; // Spread lasers
      const adjustedTargetY = targetY + (i - 1) * 50; // Spread vertically
      
      const laser = new LaserBeam(this.scene, thirdEyeX, thirdEyeY, adjustedTargetY);
      laser.setTint(0x9900ff); // Purple tint for third eye lasers
      this.lasersGroup.add(laser);
    }
  }

  takeDamage(damage: number, hitX: number, hitY: number): boolean {
    if (this.isInvulnerable || this.isTransitioning) {
      console.log("Boss is invulnerable or transitioning");
      return false;
    }
    
    // All phases now accept hits anywhere on the boss sprite
    console.log(`Phase ${this.currentPhase}: Hit anywhere is valid - same as second boss`);
    console.log(`Boss position: (${this.x}, ${this.y}), Hit position: (${hitX}, ${hitY})`)
    
    // Take damage
    this.health -= damage;
    
    // Play damage sound
    this.scene.sound.play("boss_damage", { volume: 0.4 });
    
    // Flash effect
    this.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
    
    console.log(`Boss health after damage: ${this.health}/${this.maxHealth}`);
    
    // Check for phase transitions first, then death
    // Phase 1: 300-201 health, Phase 2: 200-101 health, Phase 3: 100-1 health
    let newPhase = this.currentPhase;
    
    if (this.health <= 200 && this.currentPhase === 1) {
      newPhase = 2;
    } else if (this.health <= 100 && this.currentPhase === 2) {
      newPhase = 3;
    }
    
    // Only check death if we're not transitioning phases
    if (newPhase !== this.currentPhase) {
      console.log(`Transitioning from Phase ${this.currentPhase} to Phase ${newPhase}`);
      this.transitionToPhase(newPhase);
    } else if (this.health <= 0 && this.currentPhase === 3) {
      // Only die when in final phase with 0 health
      console.log("Boss defeated - all phases completed");
      this.die();
    }
    
    return true; // Damage was dealt
  }

  private transitionToPhase(newPhase: number): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.isInvulnerable = true;
    this.currentPhase = newPhase;
    
    console.log(`Boss entering Phase ${newPhase}`);
    
    // Play phase change sound
    this.scene.sound.play("boss_phase_change", { volume: 0.4 });
    
    // Create dramatic screen shake
    this.scene.cameras.main.shake(1000, 0.02);
    
    // Show phase transition text
    const phaseText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 3,
      `PHASE ${newPhase}`,
      {
        fontFamily: "SupercellMagic",
        fontSize: "64px",
        color: "#FF0000",
        stroke: "#000000",
        strokeThickness: 8,
        align: "center"
      }
    );
    phaseText.setOrigin(0.5, 0.5);
    phaseText.setDepth(2000);
    phaseText.setScrollFactor(0);
    
    // Animate phase text
    this.scene.tweens.add({
      targets: phaseText,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: "Back.easeOut",
      onComplete: () => {
        // Fade out text
        this.scene.tweens.add({
          targets: phaseText,
          alpha: 0,
          scale: 2,
          duration: 600,
          delay: 400,
          onComplete: () => phaseText.destroy()
        });
      }
    });
    
    // Change texture
    this.setTexture(this.phaseTextures[newPhase - 1]);
    
    // Re-initialize scale for new texture
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, 300, 0.8, 0.8);
    
    // Flash effect for phase change
    let flashCount = 0;
    const flashInterval = this.scene.time.addEvent({
      delay: 150,
      repeat: 7,
      callback: () => {
        flashCount++;
        if (flashCount % 2 === 0) {
          this.setTint(0x00ff00);
        } else {
          this.clearTint();
        }
      }
    });
    
    // End transition after flashing
    this.scene.time.delayedCall(2500, () => {
      this.isTransitioning = false;
      this.isInvulnerable = false;
      this.clearTint();
      flashInterval.destroy();
      
      // Increase attack frequency for higher phases
      if (this.currentPhase === 2) {
        this.attackCooldown = 1500; // Faster attacks
        this.moveSpeed = 150; // Faster movement
      } else if (this.currentPhase === 3) {
        this.attackCooldown = 1000; // Even faster attacks
        this.moveSpeed = 180; // Even faster movement
      }
      
      console.log(`Phase ${newPhase} transition complete - Boss is now vulnerable`);
    });
  }

  private die(): void {
    this.isInvulnerable = true;
    this.body.setVelocity(0, 0);
    
    // Play death effect
    this.scene.sound.play("explosion_impact", { volume: 0.5 });
    
    // Create explosion
    const explosion = this.scene.add.image(this.x, this.y, "explosion_effect");
    utils.initScale(explosion, { x: 0.5, y: 0.5 }, undefined, 200);
    
    // Flash and fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });
    
    // Remove explosion
    this.scene.time.delayedCall(1000, () => {
      explosion.destroy();
    });
    
    // Emit boss defeated event
    this.scene.events.emit('bossDefeated');
  }

  // Getter for vulnerable zone (for debug/UI purposes)
  getVulnerableZone(): Phaser.Geom.Rectangle {
    const zone = this.vulnerableZones[this.currentPhase];
    return new Phaser.Geom.Rectangle(
      this.x + zone.x,
      this.y + zone.y,
      zone.width,
      zone.height
    );
  }
  
  // Get health percentage
  getHealthPercentage(): number {
    return (this.health / this.maxHealth) * 100;
  }
  
  // Get phase health percentage (health within current phase)
  getPhaseHealthPercentage(): number {
    let phaseHealth: number;
    
    if (this.currentPhase === 1) {
      // Phase 1: 300-201 health maps to 100%-0%
      phaseHealth = Math.max(0, ((this.health - 200) / 100) * 100);
    } else if (this.currentPhase === 2) {
      // Phase 2: 200-101 health maps to 100%-0%  
      phaseHealth = Math.max(0, ((this.health - 100) / 100) * 100);
    } else {
      // Phase 3: 100-0 health maps to 100%-0%
      phaseHealth = Math.max(0, (this.health / 100) * 100);
    }
    
    return Math.max(0, Math.min(100, phaseHealth));
  }
}