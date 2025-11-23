import Phaser from "phaser";
import { screenSize, debugConfig, renderConfig } from "./gameConfig.json";
import "./styles/tailwind.css";
import "./styles/base.css";
import { Preloader } from "./scenes/Preloader";
import { TitleScreen } from "./scenes/TitleScreen";
import GameScene from "./scenes/GameScene";
import UIScene from "./scenes/UIScene";
import { GameOverUIScene } from "./scenes/GameOverUIScene";
import PauseMenuScene from "./scenes/PauseMenuScene";
import { BossLevelScene } from "./scenes/BossLevelScene";
import { SecondBossLevelScene } from "./scenes/SecondBossLevelScene";
import { BossVictoryFlightScene } from "./scenes/BossVictoryFlightScene";
import { BossUIScene } from "./scenes/BossUIScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: screenSize.width.value,
  height: screenSize.height.value,
  backgroundColor: "#87CEEB",
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    width: screenSize.width.value,
    height: screenSize.height.value,
    fullscreenTarget: 'game-container',
  },
  physics: {
    default: "arcade",
    arcade: {
      fps: 120,
      debug: debugConfig.debug.value,
      debugShowBody: debugConfig.debug.value,
      debugShowStaticBody: debugConfig.debug.value,
      debugShowVelocity: debugConfig.debug.value,
    },
  },
  pixelArt: renderConfig.pixelArt.value,
  input: {
    // Prevent canvas from interfering with DOM UI elements
    windowEvents: true,
  },
  loader: {
    baseURL: '/bear-jumpventure/'
  }
};

const game = new Phaser.Game(config);

// Add scenes in order
game.scene.add("Preloader", Preloader, true);
game.scene.add("TitleScreen", TitleScreen);
game.scene.add("GameScene", GameScene);
game.scene.add("BossLevelScene", BossLevelScene);
game.scene.add("SecondBossLevelScene", SecondBossLevelScene);
game.scene.add("BossVictoryFlightScene", BossVictoryFlightScene);
game.scene.add("UIScene", UIScene);
game.scene.add("BossUIScene", BossUIScene);
game.scene.add("PauseMenuScene", PauseMenuScene);
game.scene.add("GameOverUIScene", GameOverUIScene);
