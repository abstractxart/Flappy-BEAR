import Phaser from "phaser";
import * as utils from "./utils";

/**
 * Missile - Player projectile for boss fight
 */
export class Missile extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  public speed: number = 800;
  public isActive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "missile_projectile");

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize size using utils
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, 60, 0.8, 0.8);

    // Set physics properties
    this.body.setVelocityX(this.speed);
    
    // Remove when going off screen
    this.scene.time.delayedCall(3000, () => {
      if (this.active) {
        this.destroy();
      }
    });
  }

  update(): void {
    // Remove if goes off screen
    if (this.x > this.scene.scale.width + 100) {
      this.destroy();
    }
  }

  explode(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Create explosion effect
    const explosion = this.scene.add.image(this.x, this.y, "explosion_effect");
    utils.initScale(explosion, { x: 0.5, y: 0.5 }, undefined, 100);
    
    // Play explosion sound
    this.scene.sound.play("explosion_impact", { volume: 0.3 });
    
    // Remove explosion after animation
    this.scene.time.delayedCall(500, () => {
      explosion.destroy();
    });
    
    // Destroy missile
    this.destroy();
  }
}