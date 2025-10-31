import Phaser from "phaser";
import * as utils from "./utils";

/**
 * CryptoPipe - Full-height pipe obstacle
 * Supports Bitcoin and Ethereum variants with 3 color options: red, blue, or normal
 * Uses Image sprite with proper scaling to maintain logo quality
 */
export class CryptoPipe extends Phaser.GameObjects.Image {
  declare body: Phaser.Physics.Arcade.Body;
  
  public pipeType: "bitcoin" | "ethereum";
  public orientation: "top" | "bottom";
  public pipeColor: "red" | "blue" | "normal" | "green" | "yellow" | "purple";
  public scored: boolean = false;
  public gapTopY: number = 0;
  public gapBottomY: number = 0;
  public colorCycleTween?: Phaser.Tweens.Tween;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    pipeType: "bitcoin" | "ethereum",
    orientation: "top" | "bottom",
    height: number, // Desired height of the pipe
    pipeColor: "red" | "blue" | "normal" | "green" | "yellow" | "purple" = "normal" // Color variant
  ) {
    // Determine texture key based on pipe type and orientation
    const textureKey = `${pipeType}_pipe_${orientation}`;
    
    // Create Image sprite
    super(scene, x, y, textureKey);
    
    this.pipeType = pipeType;
    this.orientation = orientation;
    this.pipeColor = pipeColor;
    
    // Apply color tint based on pipeColor
    this.applyColorTint(pipeColor);
    
    // Set origin based on orientation
    if (orientation === "top") {
      // Top pipe: anchor at bottom (at the gap)
      this.setOrigin(0.5, 1);
    } else {
      // Bottom pipe: anchor at top (at the gap)
      this.setOrigin(0.5, 0);
    }
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Configure physics body
    this.body.setAllowGravity(false);
    
    // Use initScale to scale the pipe to desired height while maintaining aspect ratio
    // Set body size to match the full sprite (100% width and height)
    const pipeWidth = 80; // Target width for consistent gameplay
    utils.initScale(
      this, 
      { x: this.originX, y: this.originY }, 
      pipeWidth, 
      height,
      1.0, // Body width = 100% of display width
      1.0  // Body height = 100% of display height
    );
  }
  
  /**
   * Set the velocity of the pipe
   */
  setVelocity(x: number, y: number = 0): CryptoPipe {
    if (this.body) {
      this.body.setVelocity(x, y);
    }
    return this;
  }
  
  /**
   * Stop the pipe movement
   */
  stop(): void {
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
  }
  
  /**
   * Apply color tint based on color name
   */
  applyColorTint(color: "red" | "blue" | "normal" | "green" | "yellow" | "purple"): void {
    switch (color) {
      case "red":
        this.setTint(0xff4444);
        break;
      case "blue":
        this.setTint(0x4444ff);
        break;
      case "green":
        // Emerald green
        this.setTint(0x50C878);
        break;
      case "yellow":
        // Golden yellow
        this.setTint(0xFFD700);
        break;
      case "purple":
        // Royal purple
        this.setTint(0x7851A9);
        break;
      case "normal":
      default:
        this.clearTint();
        break;
    }
    this.pipeColor = color;
  }
  
  /**
   * Start cycling through green, yellow, and purple colors
   */
  startColorCycling(scene: Phaser.Scene): void {
    const colors: ("green" | "yellow" | "purple")[] = ["green", "yellow", "purple"];
    let colorIndex = 0;
    
    // Apply first color immediately
    this.applyColorTint(colors[colorIndex]);
    
    // Create tween that cycles through colors
    this.colorCycleTween = scene.tweens.addCounter({
      from: 0,
      to: colors.length,
      duration: 600, // Change color every 600ms
      repeat: -1,
      onUpdate: (tween) => {
        if (this.active) {
          const newIndex = Math.floor(tween.getValue()) % colors.length;
          if (newIndex !== colorIndex) {
            colorIndex = newIndex;
            this.applyColorTint(colors[colorIndex]);
          }
        }
      }
    });
  }
  
  /**
   * Stop color cycling and return to normal or specified color
   */
  stopColorCycling(returnColor?: "red" | "blue" | "normal"): void {
    if (this.colorCycleTween) {
      this.colorCycleTween.remove();
      this.colorCycleTween = undefined;
    }
    
    if (returnColor) {
      this.applyColorTint(returnColor);
    }
  }
  
  /**
   * Destroy pipe and clean up tweens
   */
  destroy(fromScene?: boolean): void {
    if (this.colorCycleTween) {
      this.colorCycleTween.remove();
    }
    super.destroy(fromScene);
  }
}
