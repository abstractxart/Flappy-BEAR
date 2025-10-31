import Phaser from "phaser";
import * as utils from "./utils";

/**
 * EnemyBee - Flying bee enemy that moves across the screen
 * with vertical bobbing motion and wing flapping animation
 */
export class EnemyBee extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  private bobSpeed: number;
  private bobAmplitude: number;
  private initialY: number;
  private bobOffset: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number, scrollSpeed: number) {
    super(scene, x, y, "bee_fly_frame1");
    
    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Initialize size and scale
    utils.initScale(this, { x: 0.422, y: 1.0 }, undefined, 50, 0.8, 0.8);
    
    // Configure physics
    this.body.setAllowGravity(false);
    this.body.setVelocityX(-scrollSpeed);
    
    // Bob motion parameters
    this.initialY = y;
    this.bobSpeed = Phaser.Math.FloatBetween(2, 4); // Random bob speed for variety
    this.bobAmplitude = Phaser.Math.FloatBetween(30, 60); // Random amplitude
    this.bobOffset = Phaser.Math.FloatBetween(0, Math.PI * 2); // Random starting phase
    
    // Play flapping animation
    this.play("bee_fly_anim");
    
    // Reset origin based on animation
    utils.resetOriginAndOffset(this, "right");
  }
  
  /**
   * Update the bee's position with bobbing motion
   */
  update(time: number, delta: number): void {
    if (!this.active) return;
    
    // Calculate bobbing motion using sine wave
    const bobY = Math.sin((time / 1000) * this.bobSpeed + this.bobOffset) * this.bobAmplitude;
    this.y = this.initialY + bobY;
    
    // Destroy if off screen
    if (this.x < -100) {
      this.destroy();
    }
  }
  
  /**
   * Set the horizontal velocity
   */
  setScrollSpeed(speed: number): void {
    if (this.body) {
      this.body.setVelocityX(-speed);
    }
  }
  
  /**
   * Stop the bee movement
   */
  stopMovement(): void {
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
  }
}
