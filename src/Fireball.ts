import Phaser from "phaser";
import * as utils from "./utils";

/**
 * Fireball - Second boss projectile
 */
export class Fireball extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  public speed: number = 400;
  public isActive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, targetY: number, angleOffset: number = 0) {
    super(scene, x, y, "explosion_effect");

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize size using utils
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, 60, 0.8, 0.8);

    // Calculate direction to target with angle offset
    const direction = new Phaser.Math.Vector2(-1, 0); // Move left
    if (targetY !== y) {
      direction.y = (targetY - y) / Math.abs(targetY - y) * 0.4; // More pronounced vertical aim
    }
    
    // Apply angle offset for spread
    const angle = Math.atan2(direction.y, direction.x) + angleOffset;
    direction.x = Math.cos(angle);
    direction.y = Math.sin(angle);
    direction.normalize();

    // Set velocity
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
    
    // Add fire effect
    this.setTint(0xff4400);
    
    // Add rotation for spinning effect
    this.scene.tweens.add({
      targets: this,
      rotation: Math.PI * 4, // 2 full rotations
      duration: 2000,
      ease: "Linear"
    });
    
    // Remove when going off screen
    this.scene.time.delayedCall(5000, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  update(): void {
    // Remove if goes off screen
    if (this.x < -100 || this.y < -100 || this.y > this.scene.scale.height + 100) {
      this.destroy();
    }
  }
}