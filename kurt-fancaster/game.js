(() => {
  "use strict";

  const W = 320;
  const H = 200;
  const STEP = 16;
  const C = {
    black: 0x0b0910, ink: 0x17131d, cream: 0xf5e7c8, gold: 0xe2b45b,
    skin: 0xd89b68, skinDark: 0x9e6547, hair: 0x24191b, white: 0xf2eee1,
    blue: 0x2e6f9c, deepBlue: 0x17364a, water: 0x3e9fba, waterLight: 0x8ad9d8,
    lawn: 0x5d8549, lawnLight: 0x789b55, lawnDark: 0x365b38,
    hedge: 0x254d35, hedgeLight: 0x4e7444, fence: 0xc8aa76, fenceDark: 0x7f674b,
    concrete: 0xb9aa91, concreteDark: 0x746c64, red: 0xb63e3e,
    yellow: 0xd5a33b, gray: 0x73727b, grayLight: 0xb6b3ad,
    brown: 0x704a32, orange: 0xc56d32, magenta: 0x9a3c73,
  };

  const COSTUMES = {
    swimmer: { id: "swimmer", trunks: C.blue, shirt: null, hat: null },
    pirate: { id: "pirate", trunks: C.black, shirt: C.white, hat: C.red },
    noir: { id: "noir", trunks: C.black, shirt: C.gray, hat: C.black },
  };

  const LEVELS = [
    { id: "swimmer", reel: 1, title: "The Swimmer", genre: "Yard-crossing arcade adventure", costume: "swimmer", scene: "SwimmerScene", available: true },
    { id: "privateer", reel: 2, title: "The Magenta Privateer", genre: "Acrobatic platformer", costume: "pirate", scene: null, available: false },
    { id: "noir", reel: 3, title: "The Murdered Men", genre: "Top-down noir pursuit", costume: "noir", scene: null, available: false },
  ];

  const touch = { up: false, down: false, left: false, right: false, action: false, pause: false };
  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const set = (active, event) => {
      event.preventDefault();
      touch[control] = active;
      button.classList.toggle("is-active", active);
    };
    button.addEventListener("pointerdown", (event) => set(true, event));
    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
      button.addEventListener(name, (event) => set(false, event));
    });
  });

  function makeTexture(scene, key, width, height, draw) {
    if (scene.textures.exists(key)) return key;
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
    return key;
  }

  function createKurt(scene, costumeId) {
    const costume = COSTUMES[costumeId] || COSTUMES.swimmer;
    return makeTexture(scene, `kurt-${costume.id}`, 26, 38, (g) => {
      g.fillStyle(C.black, 0.35).fillRect(5, 35, 16, 3);
      if (costume.hat) g.fillStyle(costume.hat, 1).fillRect(6, 0, 13, 3).fillRect(4, 3, 17, 3);
      g.fillStyle(C.hair, 1).fillRect(7, 2, 11, 4).fillRect(5, 5, 3, 6);
      g.fillStyle(C.skinDark, 1).fillRect(6, 6, 13, 12);
      g.fillStyle(C.skin, 1).fillRect(8, 6, 10, 10).fillRect(5, 10, 3, 5);
      g.fillStyle(C.black, 1).fillRect(10, 9, 2, 1).fillRect(16, 9, 2, 1).fillRect(17, 13, 3, 1);
      g.fillStyle(C.white, 1).fillRect(13, 14, 5, 1);
      g.fillStyle(C.skinDark, 1).fillRect(4, 17, 5, 12).fillRect(17, 17, 5, 12);
      g.fillStyle(C.skin, 1).fillRect(5, 18, 4, 10).fillRect(17, 18, 4, 10);
      if (costume.shirt) {
        g.fillStyle(costume.shirt, 1).fillRect(8, 17, 10, 10).fillRect(6, 18, 14, 4);
      } else {
        g.fillStyle(C.skinDark, 1).fillRect(9, 17, 9, 10);
        g.fillStyle(C.skin, 1).fillRect(10, 17, 7, 8);
        g.fillStyle(C.cream, 0.55).fillRect(12, 18, 1, 5);
      }
      g.fillStyle(costume.trunks, 1).fillRect(8, 26, 11, 5);
      g.fillStyle(C.deepBlue, 1).fillRect(9, 30, 4, 2).fillRect(15, 30, 4, 2);
      g.fillStyle(C.skinDark, 1).fillRect(8, 32, 5, 5).fillRect(15, 32, 5, 5);
      g.fillStyle(C.skin, 1).fillRect(9, 32, 4, 4).fillRect(15, 32, 4, 4);
    });
  }

  function createHazardTextures(scene) {
    makeTexture(scene, "dog", 26, 16, (g) => {
      g.fillStyle(C.black, 0.25).fillRect(3, 13, 21, 2);
      g.fillStyle(C.brown, 1).fillRect(5, 6, 15, 7).fillRect(18, 4, 6, 7).fillRect(2, 7, 5, 3);
      g.fillStyle(C.hair, 1).fillRect(20, 3, 3, 3).fillRect(21, 7, 2, 2).fillRect(6, 12, 3, 3).fillRect(16, 12, 3, 3);
      g.fillStyle(C.cream, 1).fillRect(22, 6, 2, 1);
    });
    makeTexture(scene, "mower", 30, 18, (g) => {
      g.fillStyle(C.black, 0.25).fillRect(3, 15, 25, 2);
      g.fillStyle(C.grayLight, 1).fillRect(20, 0, 2, 9).fillRect(21, 0, 7, 2);
      g.fillStyle(C.red, 1).fillRect(4, 8, 20, 7);
      g.fillStyle(C.orange, 1).fillRect(7, 6, 11, 4);
      g.fillStyle(C.black, 1).fillRect(3, 13, 6, 4).fillRect(20, 13, 6, 4);
      g.fillStyle(C.grayLight, 1).fillRect(5, 14, 2, 2).fillRect(22, 14, 2, 2);
    });
    makeTexture(scene, "cat", 20, 14, (g) => {
      g.fillStyle(C.black, 0.25).fillRect(2, 12, 16, 2);
      g.fillStyle(C.gray, 1).fillRect(4, 5, 11, 7).fillRect(13, 3, 5, 7).fillRect(1, 7, 4, 2);
      g.fillStyle(C.grayLight, 1).fillRect(14, 4, 1, 1);
      g.fillStyle(C.black, 1).fillRect(16, 5, 1, 1).fillRect(5, 11, 2, 2).fillRect(12, 11, 2, 2);
    });
    makeTexture(scene, "goose", 22, 17, (g) => {
      g.fillStyle(C.black, 0.25).fillRect(2, 15, 18, 2);
      g.fillStyle(C.white, 1).fillRect(4, 8, 13, 7).fillRect(14, 3, 4, 8);
      g.fillStyle(C.orange, 1).fillRect(18, 4, 4, 2).fillRect(7, 14, 2, 3).fillRect(13, 14, 2, 3);
      g.fillStyle(C.black, 1).fillRect(16, 4, 1, 1);
      g.fillStyle(C.grayLight, 1).fillRect(5, 9, 7, 3);
    });
  }

  class BaseScene extends Phaser.Scene {
    constructor(key) { super(key); this.pauseLatch = false; }
    createKeys() {
      this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP, down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT, right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W, a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S, d: Phaser.Input.Keyboard.KeyCodes.D,
        enter: Phaser.Input.Keyboard.KeyCodes.ENTER, space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      });
    }
    actionPressed() {
      return Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space) || touch.action;
    }
    pausePressed() {
      const pressed = Phaser.Input.Keyboard.JustDown(this.keys.escape) || touch.pause;
      if (pressed && !this.pauseLatch) { this.pauseLatch = true; return true; }
      if (!touch.pause) this.pauseLatch = false;
      return false;
    }
    addDither(depth = 1000) {
      const g = this.add.graphics().setDepth(depth).setAlpha(0.045).fillStyle(C.cream, 1);
      for (let y = 1; y < H; y += 4) {
        for (let x = y % 8 === 1 ? 1 : 3; x < W; x += 8) g.fillRect(x, y, 1, 1);
      }
    }
  }

  window.KF = { W, H, STEP, C, LEVELS, touch, createKurt, createHazardTextures, BaseScene };
})();
