import Phaser from "phaser";
import * as utils from "./utils";

/**
 * LaserBeam - Boss projectile that shoots from eyes
 */
export class LaserBeam extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  public speed: number = 600;
  public isActive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, targetY: number) {
    super(scene, x, y, "red_laser_beam");

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize size using utils
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, 40, 0.9, 0.6);

    // Calculate direction to target
    const direction = new Phaser.Math.Vector2(-1, 0); // Move left
    if (targetY !== y) {
      direction.y = (targetY - y) / Math.abs(targetY - y) * 0.3; // Slight vertical aim
    }
    direction.normalize();

    // Set velocity
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
    
    // Add glow effect
    this.setTint(0xff4444);
    
    // Remove when going off screen
    this.scene.time.delayedCall(4000, () => {
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