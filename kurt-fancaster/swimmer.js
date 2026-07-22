(() => {
  "use strict";

  const { W, H, STEP, C, LEVELS, touch, createKurt, createHazardTextures, BaseScene, TitleScene, ReelRoomScene } = window.KF;

  class SwimmerScene extends BaseScene {
    constructor() { super("SwimmerScene"); }

    init(data) {
      this.level = data.level || LEVELS[0];
      this.cooldown = 0;
      this.comfort = 100;
      this.lives = 3;
      this.lastPool = { x: 160, y: 181 };
      this.paused = false;
      this.completed = false;
    }

    create() {
      this.createKeys();
      this.drawWorld();
      createHazardTextures(this);
      this.createHazards();

      this.player = this.physics.add.sprite(160, 181, createKurt(this, this.level.costume))
        .setDepth(8)
        .setCollideWorldBounds(true);
      this.player.body.setSize(12, 19).setOffset(7, 17);

      this.add.rectangle(160, 8, W, 16, C.black, 0.9).setDepth(30);
      this.add.text(5, 4, "COMFORT", {
        fontFamily: "monospace", fontSize: "6px", color: "#f5e7c8",
      }).setDepth(31);
      this.add.rectangle(45, 8, 70, 6, 0x3c3741).setOrigin(0, 0.5).setDepth(31);
      this.bar = this.add.rectangle(45, 8, 70, 6, C.waterLight).setOrigin(0, 0.5).setDepth(32);
      this.livesText = this.add.text(267, 4, "LIVES 3", {
        fontFamily: "monospace", fontSize: "6px", color: "#f5e7c8",
      }).setDepth(31);

      this.message = this.add.text(160, 101, "POOL TO POOL. THE WATER IS SAFE.", {
        align: "center", fontFamily: "monospace", fontSize: "8px", color: "#f5e7c8",
        backgroundColor: "#0b0910", padding: { x: 7, y: 5 },
      }).setOrigin(0.5).setDepth(40);
      this.time.delayedCall(1900, () => this.message.setVisible(false));

      this.physics.add.overlap(this.player, this.hazards, (_player, hazard) => {
        this.fail(hazard.getData("reason"));
      });
      this.addDither(25);
    }

    drawWorld() {
      const g = this.add.graphics();
      g.fillStyle(C.lawn, 1).fillRect(0, 16, W, H - 16);
      g.fillStyle(C.lawnLight, 1)
        .fillRect(0, 142, W, 28)
        .fillRect(0, 87, W, 28)
        .fillRect(0, 39, W, 24);

      for (let y = 20; y < H; y += 8) {
        g.fillStyle(y % 16 === 4 ? 0x6d914e : 0x567a43, 1);
        for (let x = y % 16 === 4 ? 3 : 9; x < W; x += 18) g.fillRect(x, y, 2, 1);
      }

      this.fence(g, 0, 151, 112); this.fence(g, 208, 151, 112);
      this.hedge(g, 0, 105, 97); this.hedge(g, 222, 105, 98);
      this.fence(g, 0, 69, 112); this.fence(g, 208, 69, 112);
      this.hedge(g, 0, 31, 102); this.hedge(g, 218, 31, 102);
      this.house(g, 0, 17, false); this.house(g, 282, 17, true);

      this.pools = [
        new Phaser.Geom.Rectangle(124, 169, 72, 29),
        new Phaser.Geom.Rectangle(20, 116, 68, 27),
        new Phaser.Geom.Rectangle(232, 116, 68, 27),
        new Phaser.Geom.Rectangle(124, 76, 72, 28),
        new Phaser.Geom.Rectangle(124, 20, 72, 29),
      ];
      this.pools.forEach((pool, index) => this.pool(g, pool, index === this.pools.length - 1));

      g.fillStyle(C.cream, 1)
        .fillRect(94, 158, 17, 4)
        .fillRect(98, 154, 3, 12)
        .fillRect(105, 154, 3, 12);
      g.fillStyle(C.magenta, 1)
        .fillRect(204, 126, 17, 3)
        .fillRect(207, 129, 3, 10)
        .fillRect(216, 129, 3, 10);
      g.fillStyle(C.yellow, 1).fillRect(98, 50, 3, 12).fillRect(92, 50, 15, 3);
      g.fillStyle(C.brown, 1).fillRect(211, 54, 3, 13);
      g.fillStyle(C.cream, 1).fillTriangle(198, 55, 225, 55, 212, 44);

      this.add.text(160, 18, "FINISH", {
        fontFamily: "monospace", fontSize: "6px", color: "#e2b45b",
        backgroundColor: "#17364a", padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(7);
    }

    fence(g, x, y, width) {
      g.fillStyle(C.fenceDark, 1).fillRect(x, y + 3, width, 3);
      g.fillStyle(C.fence, 1).fillRect(x, y, width, 3);
      for (let px = x + 7; px < x + width; px += 18) g.fillRect(px, y - 3, 3, 9);
    }

    hedge(g, x, y, width) {
      g.fillStyle(C.hedge, 1).fillRect(x, y, width, 7);
      g.fillStyle(C.hedgeLight, 1);
      for (let px = x + 2; px < x + width; px += 11) g.fillRect(px, y - 2, 7, 4);
    }

    house(g, x, y, right) {
      g.fillStyle(0x8d604e, 1).fillRect(x, y, 38, 67);
      g.fillStyle(0xc28a67, 1);
      for (let row = y + 5; row < y + 62; row += 8) g.fillRect(x, row, 38, 2);
      g.fillStyle(C.deepBlue, 1).fillRect(x + (right ? 4 : 20), y + 17, 13, 20);
      g.fillStyle(C.waterLight, 1).fillRect(x + (right ? 6 : 22), y + 19, 9, 8);
    }

    pool(g, pool, goal) {
      g.fillStyle(C.concreteDark, 1).fillRect(pool.x - 4, pool.y - 4, pool.width + 8, pool.height + 8);
      g.fillStyle(C.concrete, 1).fillRect(pool.x - 3, pool.y - 3, pool.width + 6, pool.height + 6);
      g.fillStyle(C.deepBlue, 1).fillRect(pool.x, pool.y, pool.width, pool.height);
      g.fillStyle(goal ? 0x4babc0 : C.water, 1)
        .fillRect(pool.x + 2, pool.y + 2, pool.width - 4, pool.height - 4);
      g.fillStyle(C.waterLight, 1);
      for (let x = pool.x + 5; x < pool.right - 8; x += 16) {
        g.fillRect(x, pool.y + 6, 9, 2).fillRect(x + 6, pool.y + 16, 8, 2);
      }
      g.fillStyle(C.white, 0.7)
        .fillRect(pool.right - 11, pool.y + 4, 2, 13)
        .fillRect(pool.right - 8, pool.y + 4, 2, 13)
        .fillRect(pool.right - 11, pool.y + 9, 5, 2);
    }

    createHazards() {
      this.hazards = this.physics.add.group();
      [
        ["dog", 151, 44, 1, 126, -10, "AN ENTHUSIASTIC DOG"],
        ["mower", 108, 34, -1, 160, 60, "THE MOWER SHOWS NO MERCY"],
        ["cat", 69, 52, 1, 118, -35, "STARTLED BY A CAT"],
        ["goose", 52, 39, -1, 170, 85, "THE GOOSE DISAPPROVES"],
      ].forEach(([key, y, speed, direction, spacing, start, reason]) => {
        for (let x = start; x < W + 70; x += spacing) {
          const hazard = this.physics.add.sprite(x, y, key)
            .setDepth(7)
            .setVelocityX(speed * direction)
            .setImmovable(true);
          hazard.setData("direction", direction).setData("reason", reason);
          this.hazards.add(hazard);
        }
      });
    }

    update(_time, delta) {
      if (this.pausePressed()) {
        touch.pause = false;
        this.togglePause();
      }
      if (this.paused || this.completed) return;

      this.wrapHazards();
      this.cooldown = Math.max(0, this.cooldown - delta);
      const direction = this.direction();
      if (direction && this.cooldown <= 0) {
        this.player.x = Phaser.Math.Clamp(this.player.x + direction.x * STEP, 8, W - 8);
        this.player.y = Phaser.Math.Clamp(this.player.y + direction.y * STEP, 22, H - 10);
        this.cooldown = 115;
      }

      const pool = this.currentPool();
      if (pool) {
        this.comfort = Math.min(100, this.comfort + delta * 0.06);
        this.lastPool = {
          x: Phaser.Math.Clamp(this.player.x, pool.left + 9, pool.right - 9),
          y: Phaser.Math.Clamp(this.player.y, pool.top + 11, pool.bottom - 7),
        };
      } else {
        this.comfort = Math.max(0, this.comfort - delta * 0.029);
      }

      if (this.comfort <= 0) this.fail("TOO LONG ON DRY LAND");
      if (Phaser.Geom.Rectangle.Contains(this.pools[this.pools.length - 1], this.player.x, this.player.y)) {
        this.complete();
      }
      this.bar.width = 70 * (this.comfort / 100);
      this.bar.setFillStyle(this.comfort < 30 ? C.red : C.waterLight);
    }

    direction() {
      if (this.keys.up.isDown || this.keys.w.isDown || touch.up) return { x: 0, y: -1 };
      if (this.keys.down.isDown || this.keys.s.isDown || touch.down) return { x: 0, y: 1 };
      if (this.keys.left.isDown || this.keys.a.isDown || touch.left) return { x: -1, y: 0 };
      if (this.keys.right.isDown || this.keys.d.isDown || touch.right) return { x: 1, y: 0 };
      return null;
    }

    currentPool() {
      return this.pools.find((pool) => Phaser.Geom.Rectangle.Contains(pool, this.player.x, this.player.y));
    }

    wrapHazards() {
      this.hazards.children.iterate((hazard) => {
        if (!hazard) return;
        const direction = hazard.getData("direction");
        if (direction > 0 && hazard.x > W + 35) hazard.x = -35;
        else if (direction < 0 && hazard.x < -35) hazard.x = W + 35;
      });
    }

    fail(reason) {
      if (this.paused || this.completed || !this.player.active) return;
      this.player.setActive(false).setVisible(false);
      this.lives -= 1;
      this.livesText.setText(`LIVES ${this.lives}`);
      this.message.setText(reason).setVisible(true);
      this.cameras.main.shake(140, 0.008);
      this.time.delayedCall(700, () => {
        if (this.lives <= 0) {
          this.scene.restart({ level: this.level });
          return;
        }
        this.player.setPosition(this.lastPool.x, this.lastPool.y).setActive(true).setVisible(true);
        this.comfort = 100;
        this.message.setVisible(false);
      });
    }

    complete() {
      if (this.completed) return;
      this.completed = true;
      localStorage.setItem("kurt-fancaster-swimmer-complete", "true");
      this.message.setText("REEL COMPLETE!\nKURT REMAINS MAGNIFICENTLY DAMP.").setVisible(true);
      this.time.delayedCall(2100, () => this.scene.start("ReelRoomScene"));
    }

    togglePause() {
      this.paused = !this.paused;
      this.physics.world.isPaused = this.paused;
      this.message.setText(this.paused ? "PAUSED" : "").setVisible(this.paused);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    backgroundColor: C.black,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    physics: { default: "arcade", arcade: { debug: false } },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene, ReelRoomScene, SwimmerScene],
  });
})();
