/**
 * Global Music Manager - Singleton for managing background music across all scenes
 */
export class MusicManager {
  private static instance: MusicManager;
  private music: Phaser.Sound.BaseSound | null = null;
  private bossMusic: Phaser.Sound.BaseSound | null = null;
  private isMuted: boolean = false;
  private scene: Phaser.Scene | null = null;
  private isBossTheme: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  /**
   * Initialize music with a scene reference
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
    
    // Only create music if it doesn't exist
    if (!this.music) {
      this.music = scene.sound.add("custom_background_music", {
        volume: this.isMuted ? 0 : 0.6,
        loop: true
      });
    }
    
    // Don't create boss music here - create it only when needed in playBossTheme()
  }

  /**
   * Play the music (if not already playing)
   */
  play(): void {
    if (this.isBossTheme) {
      if (this.bossMusic && !this.bossMusic.isPlaying) {
        this.bossMusic.play();
      }
    } else {
      if (this.music && !this.music.isPlaying) {
        this.music.play();
      }
    }
  }

  /**
   * Play boss theme music
   */
  playBossTheme(scene: Phaser.Scene): void {
    // Stop normal music
    if (this.music && this.music.isPlaying) {
      this.music.stop();
    }
    
    // Switch to boss theme
    this.isBossTheme = true;
    this.scene = scene;
    
    // Create boss music only when needed and if asset is available
    if (!this.bossMusic && scene.cache.audio.exists("boss_battle_theme")) {
      this.bossMusic = scene.sound.add("boss_battle_theme", {
        volume: this.isMuted ? 0 : 0.6,
        loop: true
      });
    }
    
    if (this.bossMusic && !this.bossMusic.isPlaying) {
      this.bossMusic.play();
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    
    if (this.music && 'setVolume' in this.music) {
      (this.music as any).setVolume(this.isMuted ? 0 : 0.6);
    }
    
    return this.isMuted;
  }

  /**
   * Get current mute state
   */
  isMusicMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Set mute state directly
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    
    if (this.music && 'setVolume' in this.music) {
      (this.music as any).setVolume(this.isMuted ? 0 : 0.6);
    }
    
    if (this.bossMusic && 'setVolume' in this.bossMusic) {
      (this.bossMusic as any).setVolume(this.isMuted ? 0 : 0.6);
    }
  }
  
  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    if (this.music && 'setVolume' in this.music) {
      (this.music as any).setVolume(volume);
    }
  }

  /**
   * Stop the music
   */
  stop(): void {
    if (this.music && this.music.isPlaying) {
      this.music.stop();
    }
    
    if (this.bossMusic && this.bossMusic.isPlaying) {
      this.bossMusic.stop();
    }
    
    // Reset to normal theme
    this.isBossTheme = false;
  }

  /**
   * Destroy the music (for cleanup)
   */
  destroy(): void {
    if (this.music) {
      this.music.destroy();
      this.music = null;
    }
    
    if (this.bossMusic) {
      this.bossMusic.destroy();
      this.bossMusic = null;
    }
  }
}
