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
    plum: 0x3e2851, lavender: 0x8d6aa3, sky: 0x344c70, skyLight: 0x7392a8,
  };

  const COSTUMES = {
    swimmer: { id: "swimmer", label: "Swimmer", trunks: C.blue, shirt: null, hat: null },
    pirate: { id: "pirate", label: "Privateer", trunks: C.black, shirt: C.white, hat: C.red },
    noir: { id: "noir", label: "Noir", trunks: C.black, shirt: C.gray, hat: C.black },
  };

  const LEVELS = [
    {
      id: "swimmer", reel: 1, title: "The Swimmer",
      subtitle: "A suburban odyssey in several damp acts",
      genre: "Yard-crossing arcade adventure", costume: "swimmer",
      scene: "SwimmerScene", available: true,
    },
    {
      id: "privateer", reel: 2, title: "The Magenta Privateer",
      subtitle: "Ropes, rigging, and reckless confidence",
      genre: "Acrobatic platformer", costume: "pirate",
      scene: null, available: false,
    },
    {
      id: "noir", reel: 3, title: "The Murdered Men",
      subtitle: "Everybody knows something",
      genre: "Top-down noir pursuit", costume: "noir",
      scene: null, available: false,
    },
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

  function drawKurtFrame(g, costume, pose) {
    const leftStep = pose === "step-a";
    const rightStep = pose === "step-b";
    const swimming = pose === "swim-a" || pose === "swim-b";
    const victory = pose === "victory";
    const stumble = pose === "stumble";

    g.fillStyle(C.black, 0.32);
    g.fillRect(swimming ? 3 : 6, 38, swimming ? 24 : 18, 3);

    if (costume.hat) {
      g.fillStyle(costume.hat, 1);
      g.fillRect(7, 0, 14, 3);
      g.fillRect(5, 3, 18, 3);
    }

    g.fillStyle(C.hair, 1);
    g.fillRect(8, 2, 11, 4);
    g.fillRect(6, 5, 3, 7);
    g.fillRect(18, 4, 3, 4);

    g.fillStyle(C.skinDark, 1);
    g.fillRect(7, 6, 14, 12);
    g.fillStyle(C.skin, 1);
    g.fillRect(9, 6, 11, 10);
    g.fillRect(6, 10, 3, 5);

    g.fillStyle(C.black, 1);
    g.fillRect(11, 9, 2, 1);
    g.fillRect(17, 9, 2, 1);
    g.fillRect(19, 13, 3, 1);
    g.fillStyle(C.white, 1);
    g.fillRect(14, 14, 5, 1);

    if (victory) {
      g.fillStyle(C.skinDark, 1);
      g.fillRect(4, 10, 4, 12);
      g.fillRect(22, 10, 4, 12);
      g.fillStyle(C.skin, 1);
      g.fillRect(5, 6, 3, 13);
      g.fillRect(22, 6, 3, 13);
      g.fillRect(4, 5, 4, 3);
      g.fillRect(22, 5, 4, 3);
    } else if (swimming) {
      const armY = pose === "swim-a" ? 20 : 23;
      g.fillStyle(C.skinDark, 1);
      g.fillRect(2, armY, 9, 4);
      g.fillRect(19, armY, 9, 4);
      g.fillStyle(C.skin, 1);
      g.fillRect(1, armY + 1, 9, 3);
      g.fillRect(20, armY + 1, 9, 3);
    } else if (stumble) {
      g.fillStyle(C.skinDark, 1);
      g.fillRect(3, 18, 9, 4);
      g.fillRect(19, 22, 8, 4);
      g.fillStyle(C.skin, 1);
      g.fillRect(2, 19, 9, 3);
      g.fillRect(20, 23, 7, 3);
    } else {
      g.fillStyle(C.skinDark, 1);
      g.fillRect(leftStep ? 3 : 5, 18, 5, 12);
      g.fillRect(rightStep ? 22 : 20, 18, 5, 12);
      g.fillStyle(C.skin, 1);
      g.fillRect(leftStep ? 3 : 6, 19, 4, 10);
      g.fillRect(rightStep ? 23 : 20, 19, 4, 10);
    }

    if (costume.shirt) {
      g.fillStyle(costume.shirt, 1);
      g.fillRect(9, 17, 11, 11);
      g.fillRect(7, 18, 15, 4);
    } else {
      g.fillStyle(C.skinDark, 1);
      g.fillRect(10, 17, 10, 11);
      g.fillStyle(C.skin, 1);
      g.fillRect(11, 17, 8, 9);
      g.fillStyle(C.cream, 0.55);
      g.fillRect(13, 18, 1, 6);
    }

    g.fillStyle(costume.trunks, 1);
    g.fillRect(9, 27, 12, 5);
    g.fillStyle(C.deepBlue, 1);
    g.fillRect(10, 31, 4, 2);
    g.fillRect(17, 31, 4, 2);

    if (swimming) {
      g.fillStyle(C.waterLight, 0.7);
      g.fillRect(5, 34, 20, 2);
      g.fillRect(8, 37, 14, 1);
      return;
    }

    g.fillStyle(C.skinDark, 1);
    g.fillRect(leftStep ? 7 : 9, 33, 5, leftStep ? 7 : 6);
    g.fillRect(rightStep ? 19 : 17, 33, 5, rightStep ? 7 : 6);
    g.fillStyle(C.skin, 1);
    g.fillRect(leftStep ? 8 : 10, 33, 4, leftStep ? 6 : 5);
    g.fillRect(rightStep ? 19 : 17, 33, 4, rightStep ? 6 : 5);
    g.fillStyle(C.brown, 1);
    g.fillRect(leftStep ? 6 : 9, leftStep ? 39 : 38, 7, 2);
    g.fillRect(rightStep ? 18 : 17, rightStep ? 39 : 38, 7, 2);
  }

  function createKurtTextures(scene, costumeId) {
    const costume = COSTUMES[costumeId] || COSTUMES.swimmer;
    const poses = ["idle", "step-a", "step-b", "swim-a", "swim-b", "victory", "stumble"];
    const textures = {};
    poses.forEach((pose) => {
      const key = `kurt-${costume.id}-${pose}`;
      textures[pose] = makeTexture(scene, key, 30, 42, (g) => drawKurtFrame(g, costume, pose));
    });
    return textures;
  }

  function createKurt(scene, costumeId) {
    return createKurtTextures(scene, costumeId).idle;
  }

  function ensureAnimation(scene, key, frames, frameRate) {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((textureKey) => ({ key: textureKey })),
      frameRate,
      repeat: -1,
    });
  }

  function createHazardTextures(scene) {
    [0, 1].forEach((frame) => {
      makeTexture(scene, `dog-${frame}`, 28, 18, (g) => {
        g.fillStyle(C.black, 0.25); g.fillRect(3, 15, 23, 2);
        g.fillStyle(C.brown, 1); g.fillRect(6, 7, 15, 7); g.fillRect(19, 5, 6, 8); g.fillRect(2, 8, 5, 3);
        g.fillStyle(C.orange, 1); g.fillRect(8, 8, 8, 3); g.fillRect(20, 6, 3, 3);
        g.fillStyle(C.hair, 1); g.fillRect(21, 4, 3, 3); g.fillRect(23, 8, 2, 2);
        g.fillRect(frame === 0 ? 6 : 8, 13, 3, 4); g.fillRect(frame === 0 ? 18 : 16, 13, 3, 4);
        g.fillStyle(C.cream, 1); g.fillRect(24, 7, 2, 1);
      });
      makeTexture(scene, `mower-${frame}`, 32, 20, (g) => {
        g.fillStyle(C.black, 0.25); g.fillRect(3, 17, 27, 2);
        g.fillStyle(C.grayLight, 1); g.fillRect(22, 0, 2, 10); g.fillRect(23, 0, 8, 2);
        g.fillStyle(C.gray, 1); g.fillRect(7, 8, 17, 2);
        g.fillStyle(C.red, 1); g.fillRect(4, 10, 22, 7);
        g.fillStyle(C.orange, 1); g.fillRect(8, 7, 11, 5);
        g.fillStyle(C.black, 1); g.fillRect(3, 15, 7, 5); g.fillRect(22, 15, 7, 5);
        g.fillStyle(frame === 0 ? C.grayLight : C.fenceDark, 1);
        g.fillRect(5, 16, 3, 3); g.fillRect(24, 16, 3, 3);
      });
      makeTexture(scene, `cat-${frame}`, 22, 16, (g) => {
        g.fillStyle(C.black, 0.25); g.fillRect(2, 14, 18, 2);
        g.fillStyle(C.gray, 1); g.fillRect(5, 6, 11, 7); g.fillRect(14, 4, 5, 8); g.fillRect(1, frame === 0 ? 7 : 5, 6, 2);
        g.fillStyle(C.grayLight, 1); g.fillRect(15, 5, 1, 1); g.fillRect(8, 7, 4, 2);
        g.fillStyle(C.black, 1); g.fillRect(17, 6, 1, 1); g.fillRect(frame === 0 ? 6 : 8, 12, 2, 3); g.fillRect(frame === 0 ? 14 : 12, 12, 2, 3);
      });
      makeTexture(scene, `goose-${frame}`, 24, 19, (g) => {
        g.fillStyle(C.black, 0.25); g.fillRect(2, 17, 20, 2);
        g.fillStyle(C.white, 1); g.fillRect(4, 9, 14, 7); g.fillRect(15, 3, 4, 9);
        g.fillStyle(C.grayLight, 1); g.fillRect(6, frame === 0 ? 10 : 12, 8, 3);
        g.fillStyle(C.orange, 1); g.fillRect(19, 4, 5, 2); g.fillRect(frame === 0 ? 7 : 9, 15, 2, 4); g.fillRect(frame === 0 ? 14 : 12, 15, 2, 4);
        g.fillStyle(C.black, 1); g.fillRect(17, 4, 1, 1);
      });
    });

    ensureAnimation(scene, "dog-run", ["dog-0", "dog-1"], 7);
    ensureAnimation(scene, "mower-roll", ["mower-0", "mower-1"], 8);
    ensureAnimation(scene, "cat-run", ["cat-0", "cat-1"], 9);
    ensureAnimation(scene, "goose-charge", ["goose-0", "goose-1"], 7);
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
      const g = this.add.graphics().setDepth(depth).setAlpha(0.04);
      g.fillStyle(C.cream, 1);
      for (let y = 1; y < H; y += 4) {
        for (let x = y % 8 === 1 ? 1 : 3; x < W; x += 8) g.fillRect(x, y, 1, 1);
      }
    }
    fadeIn(duration = 280) {
      this.cameras.main.fadeIn(duration, 11, 9, 16);
    }
  }

  window.KF = {
    W, H, STEP, C, LEVELS, touch,
    createKurt, createKurtTextures, createHazardTextures, BaseScene,
  };
})();
