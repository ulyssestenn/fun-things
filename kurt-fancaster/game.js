(() => {
  "use strict";

  const GAME_WIDTH = 320;
  const GAME_HEIGHT = 180;
  const STEP = 16;

  const COLORS = {
    black: 0x0c0b10,
    cream: 0xf6e8c8,
    gold: 0xe6b95c,
    blue: 0x4d89a8,
    deepBlue: 0x19394f,
    water: 0x58a8c7,
    waterLight: 0x8bd4dc,
    grass: 0x5f7f4c,
    grassDark: 0x435d39,
    road: 0x47434a,
    roadLine: 0xc9b76c,
    hedge: 0x2f573c,
    skin: 0xd8a16f,
    hair: 0x2a1b1b,
    white: 0xf4efe3,
    red: 0xb44745,
    gray: 0x7d7a82,
  };

  const COSTUMES = {
    swimmer: {
      id: "swimmer",
      label: "Swimmer",
      trunks: COLORS.blue,
      shirt: null,
      hat: null,
    },
    pirate: {
      id: "pirate",
      label: "Privateer",
      trunks: COLORS.black,
      shirt: COLORS.white,
      hat: COLORS.red,
    },
    noir: {
      id: "noir",
      label: "Noir",
      trunks: COLORS.black,
      shirt: COLORS.gray,
      hat: COLORS.black,
    },
  };

  const LEVELS = [
    {
      id: "swimmer",
      reel: 1,
      title: "The Swimmer",
      subtitle: "A pool-hopping suburban odyssey",
      genre: "Arcade crossing game",
      costume: "swimmer",
      scene: "SwimmerScene",
      available: true,
    },
    {
      id: "privateer",
      reel: 2,
      title: "The Magenta Privateer",
      subtitle: "Ropes, rigging, and reckless confidence",
      genre: "Acrobatic platformer",
      costume: "pirate",
      scene: null,
      available: false,
    },
    {
      id: "noir",
      reel: 3,
      title: "The Murdered Men",
      subtitle: "Everybody knows something",
      genre: "Top-down noir pursuit",
      costume: "noir",
      scene: null,
      available: false,
    },
  ];

  const touchState = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
    pause: false,
  };

  function emitTouch(control, active) {
    touchState[control] = active;
    window.dispatchEvent(new CustomEvent("kurt-control", {
      detail: { control, active },
    }));
  }

  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const activate = (event) => {
      event.preventDefault();
      button.classList.add("is-active");
      emitTouch(control, true);
    };
    const deactivate = (event) => {
      event.preventDefault();
      button.classList.remove("is-active");
      emitTouch(control, false);
    };

    button.addEventListener("pointerdown", activate);
    button.addEventListener("pointerup", deactivate);
    button.addEventListener("pointercancel", deactivate);
    button.addEventListener("pointerleave", deactivate);
  });

  function createKurtTexture(scene, costumeId) {
    const costume = COSTUMES[costumeId] || COSTUMES.swimmer;
    const textureKey = `kurt-${costume.id}`;

    if (scene.textures.exists(textureKey)) {
      return textureKey;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    if (costume.hat) {
      graphics.fillStyle(costume.hat, 1);
      graphics.fillRect(4, 0, 8, 2);
      graphics.fillRect(3, 2, 10, 2);
    }

    graphics.fillStyle(COLORS.hair, 1);
    graphics.fillRect(5, 2, 7, 3);

    graphics.fillStyle(COLORS.skin, 1);
    graphics.fillRect(4, 5, 8, 7);
    graphics.fillRect(2, 10, 3, 7);
    graphics.fillRect(11, 10, 3, 7);

    graphics.fillStyle(COLORS.black, 1);
    graphics.fillRect(6, 7, 1, 1);
    graphics.fillRect(10, 7, 1, 1);

    graphics.fillStyle(COLORS.white, 1);
    graphics.fillRect(7, 9, 4, 1);

    if (costume.shirt) {
      graphics.fillStyle(costume.shirt, 1);
      graphics.fillRect(4, 12, 8, 6);
    } else {
      graphics.fillStyle(COLORS.skin, 1);
      graphics.fillRect(5, 12, 6, 5);
    }

    graphics.fillStyle(costume.trunks, 1);
    graphics.fillRect(4, 17, 8, 4);

    graphics.fillStyle(COLORS.skin, 1);
    graphics.fillRect(4, 21, 3, 3);
    graphics.fillRect(9, 21, 3, 3);

    graphics.generateTexture(textureKey, 16, 24);
    graphics.destroy();

    return textureKey;
  }

  class BaseScene extends Phaser.Scene {
    constructor(key) {
      super(key);
      this.pauseLatch = false;
    }

    createSharedKeys() {
      this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      });
    }

    actionPressed() {
      return Phaser.Input.Keyboard.JustDown(this.keys.enter)
        || Phaser.Input.Keyboard.JustDown(this.keys.space)
        || touchState.action;
    }

    pausePressed() {
      const pressed = Phaser.Input.Keyboard.JustDown(this.keys.escape) || touchState.pause;
      if (pressed && !this.pauseLatch) {
        this.pauseLatch = true;
        return true;
      }
      if (!touchState.pause) {
        this.pauseLatch = false;
      }
      return false;
    }

    addFilmGrain() {
      const grain = this.add.graphics().setDepth(1000).setAlpha(0.12);
      for (let i = 0; i < 180; i += 1) {
        grain.fillStyle(i % 2 === 0 ? COLORS.white : COLORS.black, 1);
        grain.fillRect(
          Phaser.Math.Between(0, GAME_WIDTH - 1),
          Phaser.Math.Between(0, GAME_HEIGHT - 1),
          1,
          1,
        );
      }
    }
  }

  class TitleScene extends BaseScene {
    constructor() {
      super("TitleScene");
    }

    create() {
      this.createSharedKeys();
      this.cameras.main.setBackgroundColor(COLORS.black);

      this.add.rectangle(160, 90, 286, 150, 0x17131d)
        .setStrokeStyle(3, COLORS.gold);
      this.add.text(160, 34, "THE ADVENTURES OF", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#e6b95c",
        letterSpacing: 2,
      }).setOrigin(0.5);
      this.add.text(160, 61, "KURT\nFANCASTER", {
        align: "center",
        fontFamily: "Georgia, serif",
        fontSize: "28px",
        color: "#f6e8c8",
        fontStyle: "bold",
        lineSpacing: -4,
      }).setOrigin(0.5);

      createKurtTexture(this, "swimmer");
      this.add.image(160, 111, "kurt-swimmer").setScale(1.6);

      this.prompt = this.add.text(160, 148, "PRESS ENTER / TAP A", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f6e8c8",
      }).setOrigin(0.5);

      this.tweens.add({
        targets: this.prompt,
        alpha: 0.25,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });

      this.addFilmGrain();
    }

    update() {
      if (this.actionPressed()) {
        touchState.action = false;
        this.scene.start("ReelRoomScene");
      }
    }
  }

  class ReelRoomScene extends BaseScene {
    constructor() {
      super("ReelRoomScene");
      this.selection = 0;
      this.moveReady = true;
    }

    create() {
      this.createSharedKeys();
      this.cameras.main.setBackgroundColor(0x17131d);

      this.add.text(12, 10, "PROJECTION ROOM", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e6b95c",
      });
      this.add.text(12, 25, "Choose a reel", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#b5a98f",
      });

      this.cards = LEVELS.map((level, index) => {
        const y = 53 + index * 39;
        const card = this.add.rectangle(160, y, 292, 32, 0x24202c)
          .setStrokeStyle(1, 0x625873);
        const reel = this.add.text(22, y - 10, `REEL ${level.reel}`, {
          fontFamily: "monospace",
          fontSize: "7px",
          color: "#e6b95c",
        });
        const title = this.add.text(22, y, level.title.toUpperCase(), {
          fontFamily: "monospace",
          fontSize: "9px",
          color: level.available ? "#f6e8c8" : "#77717f",
        });
        const genre = this.add.text(22, y + 11, level.available ? level.genre : "COMING SOON", {
          fontFamily: "monospace",
          fontSize: "6px",
          color: "#b5a98f",
        });
        return { card, reel, title, genre };
      });

      this.add.text(160, 171, "↑ ↓ SELECT   ENTER PLAY", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#b5a98f",
      }).setOrigin(0.5);

      this.refreshSelection();
      this.addFilmGrain();
    }

    refreshSelection() {
      this.cards.forEach((entry, index) => {
        const selected = index === this.selection;
        entry.card.setFillStyle(selected ? 0x443951 : 0x24202c);
        entry.card.setStrokeStyle(selected ? 2 : 1, selected ? COLORS.gold : 0x625873);
      });
    }

    update() {
      const up = this.keys.up.isDown || this.keys.w.isDown || touchState.up;
      const down = this.keys.down.isDown || this.keys.s.isDown || touchState.down;
      const moving = up || down;

      if (moving && this.moveReady) {
        this.selection = Phaser.Math.Wrap(
          this.selection + (down ? 1 : -1),
          0,
          LEVELS.length,
        );
        this.refreshSelection();
        this.moveReady = false;
      } else if (!moving) {
        this.moveReady = true;
      }

      if (this.actionPressed()) {
        touchState.action = false;
        const level = LEVELS[this.selection];
        if (level.available && level.scene) {
          this.scene.start(level.scene, { level });
        } else {
          this.cameras.main.shake(90, 0.004);
        }
      }
    }
  }

  class SwimmerScene extends BaseScene {
    constructor() {
      super("SwimmerScene");
      this.moveCooldown = 0;
      this.comfort = 100;
      this.lives = 3;
      this.lastPool = { x: 160, y: 160 };
      this.paused = false;
      this.completed = false;
    }

    init(data) {
      this.level = data.level || LEVELS[0];
      this.comfort = 100;
      this.lives = 3;
      this.lastPool = { x: 160, y: 160 };
      this.paused = false;
      this.completed = false;
    }

    create() {
      this.createSharedKeys();
      this.cameras.main.setBackgroundColor(COLORS.grassDark);
      this.drawWorld();
      this.createHazards();

      const texture = createKurtTexture(this, this.level.costume);
      this.player = this.physics.add.sprite(this.lastPool.x, this.lastPool.y, texture)
        .setDepth(5)
        .setCollideWorldBounds(true);
      this.player.body.setSize(12, 18).setOffset(2, 5);

      this.hud = this.add.container(0, 0).setDepth(20);
      this.hud.add(this.add.rectangle(160, 7, 320, 14, 0x0c0b10, 0.86));
      this.hud.add(this.add.text(5, 4, "COMFORT", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: "#f6e8c8",
      }));
      this.comfortBarBg = this.add.rectangle(44, 7, 64, 6, 0x3c3741).setOrigin(0, 0.5);
      this.comfortBar = this.add.rectangle(44, 7, 64, 6, COLORS.waterLight).setOrigin(0, 0.5);
      this.hud.add([this.comfortBarBg, this.comfortBar]);
      this.livesText = this.add.text(258, 4, "LIVES 3", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: "#f6e8c8",
      });
      this.hud.add(this.livesText);

      this.message = this.add.text(160, 90, "STAY WET. REACH THE TOP POOL.", {
        align: "center",
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#f6e8c8",
        backgroundColor: "#0c0b10",
        padding: { x: 6, y: 4 },
      }).setOrigin(0.5).setDepth(30);

      this.time.delayedCall(1700, () => this.message.setVisible(false));

      this.physics.add.overlap(this.player, this.hazards, () => this.failAttempt("TRAFFIC WINS"));
      this.addFilmGrain();
    }

    drawWorld() {
      const graphics = this.add.graphics();

      graphics.fillStyle(COLORS.grass, 1);
      graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      graphics.fillStyle(COLORS.road, 1);
      graphics.fillRect(0, 109, GAME_WIDTH, 31);
      graphics.fillRect(0, 47, GAME_WIDTH, 31);

      graphics.fillStyle(COLORS.roadLine, 1);
      for (let x = 0; x < GAME_WIDTH; x += 28) {
        graphics.fillRect(x, 123, 15, 2);
        graphics.fillRect(x + 10, 61, 15, 2);
      }

      graphics.fillStyle(COLORS.hedge, 1);
      for (let x = 0; x < GAME_WIDTH; x += 18) {
        graphics.fillRect(x, 88, 12, 7);
        graphics.fillRect(x + 6, 26, 12, 7);
      }

      this.pools = [
        new Phaser.Geom.Rectangle(124, 146, 72, 31),
        new Phaser.Geom.Rectangle(24, 82, 66, 23),
        new Phaser.Geom.Rectangle(226, 82, 66, 23),
        new Phaser.Geom.Rectangle(124, 16, 72, 27),
      ];

      this.pools.forEach((pool) => {
        graphics.fillStyle(COLORS.deepBlue, 1);
        graphics.fillRect(pool.x - 3, pool.y - 3, pool.width + 6, pool.height + 6);
        graphics.fillStyle(COLORS.water, 1);
        graphics.fillRect(pool.x, pool.y, pool.width, pool.height);
        graphics.fillStyle(COLORS.waterLight, 0.65);
        for (let x = pool.x + 4; x < pool.right - 5; x += 14) {
          graphics.fillRect(x, pool.y + 6, 8, 2);
          graphics.fillRect(x + 5, pool.y + 16, 8, 2);
        }
      });

      graphics.fillStyle(COLORS.gold, 1);
      graphics.fillRect(145, 13, 30, 2);
      this.add.text(160, 8, "HOME", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: "#e6b95c",
      }).setOrigin(0.5);
    }

    createHazards() {
      this.hazards = this.physics.add.group();
      const lanes = [
        { y: 116, speed: 42, direction: 1, spacing: 92, color: COLORS.red },
        { y: 132, speed: 58, direction: -1, spacing: 106, color: COLORS.gray },
        { y: 54, speed: 50, direction: -1, spacing: 98, color: COLORS.gold },
        { y: 70, speed: 38, direction: 1, spacing: 112, color: COLORS.blue },
      ];

      lanes.forEach((lane) => {
        for (let x = -20; x < GAME_WIDTH + 60; x += lane.spacing) {
          const car = this.add.rectangle(x, lane.y, 28, 10, lane.color).setDepth(4);
          this.physics.add.existing(car);
          car.body.setVelocityX(lane.speed * lane.direction);
          car.body.setImmovable(true);
          car.setData("direction", lane.direction);
          this.hazards.add(car);
        }
      });
    }

    update(time, delta) {
      if (this.pausePressed()) {
        touchState.pause = false;
        this.togglePause();
      }

      if (this.paused || this.completed) {
        return;
      }

      this.wrapHazards();
      this.moveCooldown = Math.max(0, this.moveCooldown - delta);

      const direction = this.readDirection();
      if (direction && this.moveCooldown <= 0) {
        this.player.x = Phaser.Math.Clamp(this.player.x + direction.x * STEP, 8, GAME_WIDTH - 8);
        this.player.y = Phaser.Math.Clamp(this.player.y + direction.y * STEP, 19, GAME_HEIGHT - 10);
        this.moveCooldown = 115;
      }

      const currentPool = this.getCurrentPool();
      if (currentPool) {
        this.comfort = Math.min(100, this.comfort + delta * 0.055);
        this.lastPool = {
          x: Phaser.Math.Clamp(this.player.x, currentPool.left + 8, currentPool.right - 8),
          y: Phaser.Math.Clamp(this.player.y, currentPool.top + 10, currentPool.bottom - 8),
        };
      } else {
        this.comfort = Math.max(0, this.comfort - delta * 0.027);
      }

      if (this.comfort <= 0) {
        this.failAttempt("TOO LONG ON DRY LAND");
      }

      if (Phaser.Geom.Rectangle.Contains(this.pools[3], this.player.x, this.player.y)) {
        this.completeLevel();
      }

      this.comfortBar.width = 64 * (this.comfort / 100);
      this.comfortBar.setFillStyle(this.comfort < 30 ? COLORS.red : COLORS.waterLight);
    }

    readDirection() {
      if (this.keys.up.isDown || this.keys.w.isDown || touchState.up) {
        return { x: 0, y: -1 };
      }
      if (this.keys.down.isDown || this.keys.s.isDown || touchState.down) {
        return { x: 0, y: 1 };
      }
      if (this.keys.left.isDown || this.keys.a.isDown || touchState.left) {
        return { x: -1, y: 0 };
      }
      if (this.keys.right.isDown || this.keys.d.isDown || touchState.right) {
        return { x: 1, y: 0 };
      }
      return null;
    }

    getCurrentPool() {
      return this.pools.find((pool) => Phaser.Geom.Rectangle.Contains(pool, this.player.x, this.player.y));
    }

    wrapHazards() {
      this.hazards.children.iterate((car) => {
        if (!car) {
          return;
        }
        const direction = car.getData("direction");
        if (direction > 0 && car.x > GAME_WIDTH + 20) {
          car.x = -20;
        } else if (direction < 0 && car.x < -20) {
          car.x = GAME_WIDTH + 20;
        }
      });
    }

    failAttempt(reason) {
      if (this.paused || this.completed || !this.player.active) {
        return;
      }

      this.player.setActive(false).setVisible(false);
      this.lives -= 1;
      this.livesText.setText(`LIVES ${this.lives}`);
      this.message.setText(reason).setVisible(true);
      this.cameras.main.shake(140, 0.008);

      this.time.delayedCall(650, () => {
        if (this.lives <= 0) {
          this.scene.restart({ level: this.level });
          return;
        }
        this.player.setPosition(this.lastPool.x, this.lastPool.y).setActive(true).setVisible(true);
        this.comfort = 100;
        this.message.setVisible(false);
      });
    }

    completeLevel() {
      if (this.completed) {
        return;
      }
      this.completed = true;
      localStorage.setItem("kurt-fancaster-swimmer-complete", "true");
      this.message.setText("REEL COMPLETE!\nKURT REMAINS DAMP.").setVisible(true);
      this.time.delayedCall(1800, () => this.scene.start("ReelRoomScene"));
    }

    togglePause() {
      this.paused = !this.paused;
      this.physics.world.isPaused = this.paused;
      this.message.setText(this.paused ? "PAUSED" : "").setVisible(this.paused);
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent: "game",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.black,
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [TitleScene, ReelRoomScene, SwimmerScene],
  };

  new Phaser.Game(config);
})();
