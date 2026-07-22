(() => {
  "use strict";

  const W = 320;
  const H = 200;
  const STEP = 16;
  const C = {
    black: 0x0b0910, ink: 0x17131d, cream: 0xf5e7c8, gold: 0xe2b45b,
    skinLight: 0xf0bc84, skin: 0xd98d5b, skinDark: 0x9f593b, skinDeep: 0x5f3027,
    hair: 0x24191b, hairLight: 0x704126, eye: 0x4d8fc6, white: 0xf2eee1,
    blue: 0x2e6f9c, deepBlue: 0x17364a, water: 0x3e9fba, waterLight: 0x8ad9d8,
    lawn: 0x5d8549, lawnLight: 0x789b55, lawnDark: 0x365b38,
    hedge: 0x254d35, hedgeLight: 0x4e7444, fence: 0xc8aa76, fenceDark: 0x7f674b,
    concrete: 0xb9aa91, concreteDark: 0x746c64, red: 0xb63e3e,
    yellow: 0xd5a33b, gray: 0x73727b, grayLight: 0xb6b3ad,
    brown: 0x704a32, orange: 0xc56d32, magenta: 0x9a3c73,
    plum: 0x3e2851, lavender: 0x8d6aa3, sky: 0x344c70, skyLight: 0x7392a8,
  };

  const COSTUMES = {
    matinee: {
      id: "matinee", label: "Matinee Idol", trunks: C.deepBlue,
      shirt: C.cream, jacket: C.fence, tie: C.black, hat: null,
    },
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

  function fillRects(g, color, rectangles) {
    g.fillStyle(color, 1);
    rectangles.forEach(([x, y, width, height]) => g.fillRect(x, y, width, height));
  }

  function drawKurtFace(g) {
    // High swept hair, square jaw, heavy brows, blue eyes, long nose, and cleft chin.
    fillRects(g, C.hair, [
      [8, 1, 13, 2], [6, 3, 17, 3], [5, 6, 5, 6], [20, 5, 3, 8], [8, 5, 13, 3],
    ]);
    fillRects(g, C.hairLight, [
      [10, 2, 5, 1], [16, 3, 5, 1], [7, 5, 4, 1], [13, 5, 4, 1], [19, 7, 3, 1],
    ]);

    fillRects(g, C.skinDeep, [
      [7, 8, 15, 9], [8, 16, 13, 3], [6, 11, 3, 5], [21, 10, 2, 5],
    ]);
    fillRects(g, C.skinDark, [
      [8, 8, 13, 8], [9, 16, 11, 2], [7, 12, 3, 3],
    ]);
    fillRects(g, C.skin, [
      [10, 8, 10, 7], [9, 11, 3, 5], [10, 15, 9, 2],
    ]);
    fillRects(g, C.skinLight, [
      [11, 8, 5, 3], [10, 12, 4, 3], [11, 16, 4, 1],
    ]);

    fillRects(g, C.hair, [[10, 10, 4, 1], [17, 10, 4, 1]]);
    fillRects(g, C.eye, [[11, 11, 2, 1], [18, 11, 2, 1]]);
    fillRects(g, C.black, [[13, 11, 1, 1], [20, 11, 1, 1]]);
    fillRects(g, C.skinDeep, [[15, 11, 2, 5], [16, 15, 3, 1]]);
    fillRects(g, C.black, [[12, 16, 7, 1]]);
    fillRects(g, C.skinLight, [[14, 17, 3, 1]]);
    fillRects(g, C.skinDeep, [[15, 18, 2, 1]]);
  }

  function drawKurtFrame(g, costume, pose) {
    const leftStep = pose === "step-a";
    const rightStep = pose === "step-b";
    const swimming = pose === "swim-a" || pose === "swim-b";
    const victory = pose === "victory";
    const stumble = pose === "stumble";

    fillRects(g, C.black, [[swimming ? 3 : 6, 39, swimming ? 24 : 18, 2]]);

    drawKurtFace(g);

    if (costume.hat) {
      fillRects(g, costume.hat, [[7, 0, 14, 3], [5, 3, 18, 3]]);
      fillRects(g, C.black, [[6, 6, 17, 1]]);
    }

    fillRects(g, C.skinDeep, [[11, 18, 9, 5]]);
    fillRects(g, C.skin, [[12, 18, 7, 4]]);
    fillRects(g, C.skinLight, [[13, 18, 3, 3]]);

    if (victory) {
      fillRects(g, C.skinDeep, [[4, 8, 4, 14], [22, 8, 4, 14]]);
      fillRects(g, C.skin, [[5, 6, 3, 13], [22, 6, 3, 13], [4, 5, 4, 3], [22, 5, 4, 3]]);
      fillRects(g, C.skinLight, [[6, 7, 1, 8], [23, 7, 1, 8]]);
    } else if (swimming) {
      const armY = pose === "swim-a" ? 22 : 24;
      fillRects(g, C.skinDeep, [[2, armY, 9, 4], [19, armY, 9, 4]]);
      fillRects(g, C.skin, [[1, armY + 1, 9, 3], [20, armY + 1, 9, 3]]);
      fillRects(g, C.skinLight, [[2, armY + 1, 4, 1], [24, armY + 1, 4, 1]]);
    } else if (stumble) {
      fillRects(g, C.skinDeep, [[3, 20, 9, 4], [19, 23, 8, 4]]);
      fillRects(g, C.skin, [[2, 21, 9, 3], [20, 24, 7, 3]]);
    } else {
      fillRects(g, C.skinDeep, [
        [leftStep ? 3 : 5, 21, 5, 11], [rightStep ? 22 : 20, 21, 5, 11],
      ]);
      fillRects(g, C.skin, [
        [leftStep ? 3 : 6, 22, 4, 9], [rightStep ? 23 : 20, 22, 4, 9],
      ]);
      fillRects(g, C.skinLight, [
        [leftStep ? 4 : 7, 22, 1, 6], [rightStep ? 24 : 21, 22, 1, 6],
      ]);
    }

    if (costume.shirt) {
      fillRects(g, C.skinDeep, [[8, 20, 14, 10], [6, 21, 4, 4], [20, 21, 4, 4]]);
      fillRects(g, costume.shirt, [[9, 20, 12, 9], [7, 21, 16, 4]]);
      fillRects(g, C.white, [[11, 21, 3, 5]]);
      if (costume.tie) fillRects(g, costume.tie, [[15, 21, 2, 7]]);
    } else {
      fillRects(g, C.skinDeep, [[8, 20, 14, 10], [6, 21, 4, 4], [20, 21, 4, 4]]);
      fillRects(g, C.skin, [[9, 20, 12, 9], [8, 21, 4, 4], [19, 21, 4, 4]]);
      fillRects(g, C.skinLight, [[11, 21, 5, 4], [10, 25, 4, 2]]);
      fillRects(g, C.skinDeep, [[15, 22, 1, 6]]);
    }

    fillRects(g, C.skinDeep, [[8, 28, 14, 2]]);
    fillRects(g, costume.trunks, [[9, 29, 12, 5]]);
    fillRects(g, C.deepBlue, [[10, 32, 4, 2], [17, 32, 4, 2]]);

    if (swimming) {
      fillRects(g, C.waterLight, [[4, 35, 22, 2], [8, 38, 14, 1]]);
      fillRects(g, C.white, [[6, 35, 5, 1], [18, 35, 4, 1]]);
      return;
    }

    fillRects(g, C.skinDeep, [
      [leftStep ? 7 : 9, 34, 5, leftStep ? 7 : 6],
      [rightStep ? 19 : 17, 34, 5, rightStep ? 7 : 6],
    ]);
    fillRects(g, C.skin, [
      [leftStep ? 8 : 10, 34, 4, leftStep ? 6 : 5],
      [rightStep ? 19 : 17, 34, 4, rightStep ? 6 : 5],
    ]);
    fillRects(g, C.skinLight, [
      [leftStep ? 9 : 11, 34, 1, 4], [rightStep ? 20 : 18, 34, 1, 4],
    ]);
    fillRects(g, C.brown, [
      [leftStep ? 6 : 9, leftStep ? 40 : 39, 7, 2],
      [rightStep ? 18 : 17, rightStep ? 40 : 39, 7, 2],
    ]);
  }

  function drawKurtPortrait(g, costume) {
    // A separate low-resolution bust, inspired by early Sierra portrait screens.
    fillRects(g, C.hair, [
      [22, 2, 32, 4], [17, 6, 43, 6], [14, 12, 47, 8],
      [12, 20, 12, 20], [55, 17, 9, 25], [20, 17, 39, 8],
    ]);
    fillRects(g, C.hairLight, [
      [25, 3, 12, 2], [41, 5, 12, 2], [19, 8, 11, 3], [33, 10, 14, 3],
      [50, 12, 9, 3], [16, 16, 9, 3], [24, 18, 13, 2], [48, 19, 9, 2],
    ]);
    fillRects(g, C.black, [[17, 13, 7, 7], [55, 13, 7, 7]]);

    fillRects(g, C.skinDeep, [
      [18, 23, 43, 29], [21, 51, 37, 11], [26, 61, 27, 7],
      [14, 32, 8, 16], [58, 31, 7, 16],
    ]);
    fillRects(g, C.skinDark, [
      [21, 22, 36, 29], [23, 50, 33, 10], [27, 60, 25, 6],
      [16, 34, 7, 12], [57, 33, 6, 12],
    ]);
    fillRects(g, C.skin, [
      [25, 23, 29, 25], [23, 31, 10, 20], [27, 48, 26, 11], [30, 58, 19, 6],
    ]);
    fillRects(g, C.skinLight, [
      [28, 24, 13, 9], [26, 34, 10, 11], [29, 49, 10, 6], [31, 59, 8, 3],
    ]);

    fillRects(g, C.hair, [[25, 32, 12, 3], [45, 31, 12, 3]]);
    fillRects(g, C.black, [[25, 35, 12, 2], [45, 34, 12, 2]]);
    fillRects(g, C.eye, [[29, 35, 5, 2], [48, 34, 5, 2]]);
    fillRects(g, C.white, [[30, 35, 2, 1], [49, 34, 2, 1]]);
    fillRects(g, C.black, [[32, 35, 2, 2], [51, 34, 2, 2]]);

    fillRects(g, C.skinDeep, [[39, 34, 5, 16], [42, 47, 7, 3]]);
    fillRects(g, C.skinLight, [[38, 35, 3, 10]]);
    fillRects(g, C.black, [[31, 52, 21, 2]]);
    fillRects(g, C.skinDeep, [[34, 55, 15, 2], [39, 61, 5, 2]]);
    fillRects(g, C.skinLight, [[36, 57, 10, 2]]);

    fillRects(g, C.skinDeep, [[29, 64, 24, 13]]);
    fillRects(g, C.skin, [[32, 64, 18, 12]]);
    fillRects(g, C.skinLight, [[35, 65, 7, 8]]);

    if (costume.jacket) {
      fillRects(g, C.skinDeep, [[4, 76, 68, 8], [10, 71, 20, 8], [50, 71, 20, 8]]);
      fillRects(g, costume.jacket, [[6, 75, 29, 9], [45, 75, 29, 9], [12, 70, 18, 8], [50, 70, 18, 8]]);
      fillRects(g, costume.shirt, [[31, 72, 18, 12], [27, 75, 10, 9], [45, 75, 10, 9]]);
      fillRects(g, C.white, [[34, 73, 5, 10]]);
      fillRects(g, costume.tie || C.black, [[40, 74, 4, 10]]);
      fillRects(g, C.fenceDark, [[15, 74, 12, 2], [53, 74, 12, 2]]);
    } else if (costume.shirt) {
      fillRects(g, C.skinDeep, [[4, 76, 68, 8], [10, 71, 20, 8], [50, 71, 20, 8]]);
      fillRects(g, costume.shirt, [[6, 75, 68, 9], [14, 70, 17, 8], [49, 70, 17, 8]]);
    } else {
      fillRects(g, C.skinDeep, [[4, 76, 68, 8], [10, 71, 20, 8], [50, 71, 20, 8]]);
      fillRects(g, C.skin, [[6, 76, 66, 8], [13, 72, 18, 7], [49, 72, 18, 7]]);
      fillRects(g, C.skinLight, [[18, 74, 13, 5], [49, 74, 9, 5]]);
      fillRects(g, C.skinDeep, [[39, 72, 2, 12]]);
    }
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

  function createKurtPortrait(scene, costumeId = "matinee") {
    const costume = COSTUMES[costumeId] || COSTUMES.matinee;
    return makeTexture(scene, `kurt-portrait-${costume.id}`, 80, 84, (g) => drawKurtPortrait(g, costume));
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
    createKurt, createKurtTextures, createKurtPortrait, createHazardTextures, BaseScene,
  };
})();
