/**
 * Level Manager - For Flappy Bear (endless game, no levels)
 * This file is kept for compatibility but not used
 */
export class LevelManager {
  static readonly LEVEL_ORDER: string[] = ["GameScene"];

  static getNextLevelScene(currentSceneKey: string): string | null {
    return null; // Endless game - no next level
  }

  static isLastLevel(currentSceneKey: string): boolean {
    return true; // Always last level (endless)
  }

  static getFirstLevelScene(): string | null {
    return "GameScene";
  }
}
