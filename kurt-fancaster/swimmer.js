(() => {
  "use strict";

  const {
    W, H, STEP, C, LEVELS, touch,
    createKurtTextures, createHazardTextures, BaseScene, TitleScene, ReelRoomScene,
  } = window.KF;

  class SwimmerScene extends BaseScene {
    constructor() { super("SwimmerScene"); }

    init(data) {
      this.level = data.level || LEVELS[0];
      this.cooldown = 0;
      this.comfort = 100;
      this.lives = 3;
      this.lastPool = { x: 160, y: 183 };
      this.paused = false;
      this.completed = false;
      this.stepFrame = false;
      this.wasInPool = true;
      this.poseTimer = null;
    }

    create() {
      this.createKeys();
      this.fadeIn(340);
      this.drawWorld();
      createHazardTextures(this);
      this.createHazards();

      this.kurt = createKurtTextures(this, this.level.costume);
      this.player = this.physics.add.sprite(160, 183, this.kurt["swim-a"])
        .setDepth(8)
        .setCollideWorldBounds(true);
      this.player.body.setSize(13, 20).setOffset(8, 19);

      this.add.rectangle(160, 8, W, 16, C.black, 0.91).setDepth(30);
      this.add.text(5, 4, "COMFORT", {
        fontFamily: "monospace", fontSize: "6px", color: "#f5e7c8",
      }).setDepth(31);
      this.add.rectangle(45, 8, 70, 6, 0x3c3741).setOrigin(0, 0.5).setDepth(31);
      this.bar = this.add.rectangle(45, 8, 70, 6, C.waterLight).setOrigin(0, 0.5).setDepth(32);
      this.add.text(225, 4, "REEL 1", {
        fontFamily: "monospace", fontSize: "6px", color: "#e2b45b",
      }).setDepth(31);
      this.livesText = this.add.text(267, 4, "LIVES 3", {
        fontFamily: "monospace", fontSize: "6px", color: "#f5e7c8",
      }).setDepth(31);

      this.message = this.add.text(160, 101, "POOL TO POOL. THE WATER IS SAFE.", {
        align: "center", fontFamily: "monospace", fontSize: "8px", color: "#f5e7c8",
        backgroundColor: "#0b0910", padding: { x: 7, y: 5 },
      }).setOrigin(0.5).setDepth(40);
      this.time.delayedCall(1900, () => this.message.setVisible(false));

      this.physics.add.overlap(this.player, this.hazards, (_player, hazard) => {
        if (this.currentPool()) return;
        this.fail(hazard.getData("reason"));
      });
      this.addDither(25);
    }

    drawWorld() {
      const g = this.add.graphics();
      g.fillStyle(C.lawnDark, 1); g.fillRect(0, 16, W, H - 16);
      g.fillStyle(C.lawn, 1); g.fillRect(0, 18, W, H - 18);
      g.fillStyle(C.lawnLight, 1);
      g.fillRect(0, 143, W, 27);
      g.fillRect(0, 88, W, 27);
      g.fillRect(0, 40, W, 23);

      for (let y = 20; y < H; y += 8) {
        g.fillStyle(y % 16 === 4 ? 0x6d914e : 0x567a43, 1);
        for (let x = y % 16 === 4 ? 3 : 9; x < W; x += 18) g.fillRect(x, y, 2, 1);
      }

      this.fence(g, 0, 152, 112); this.fence(g, 208, 152, 112);
      this.hedge(g, 0, 106, 97); this.hedge(g, 222, 106, 98);
      this.fence(g, 0, 70, 112); this.fence(g, 208, 70, 112);
      this.hedge(g, 0, 32, 102); this.hedge(g, 218, 32, 102);
      this.house(g, 0, 17, false); this.house(g, 282, 17, true);

      this.pools = [
        new Phaser.Geom.Rectangle(124, 169, 72, 29),
        new Phaser.Geom.Rectangle(20, 117, 68, 27),
        new Phaser.Geom.Rectangle(232, 117, 68, 27),
        new Phaser.Geom.Rectangle(124, 77, 72, 28),
        new Phaser.Geom.Rectangle(124, 20, 72, 29),
      ];
      this.pools.forEach((pool, index) => this.pool(g, pool, index === this.pools.length - 1));

      this.patioSet(g, 93, 157);
      this.grill(g, 219, 157);
      this.flowerBed(g, 6, 158, 76);
      this.flowerBed(g, 239, 92, 74);
      this.clothesline(g, 213, 88);
      this.flamingo(g, 102, 53);
      this.sprinkler(g, 105, 113, false);
      this.sprinkler(g, 214, 59, true);
      this.tree(g, 292, 77);
      this.tree(g, 18, 85);

      this.add.text(160, 18, "FINISH", {
        fontFamily: "monospace", fontSize: "6px", color: "#e2b45b",
        backgroundColor: "#17364a", padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(7);
    }

    fence(g, x, y, width) {
      g.fillStyle(C.fenceDark, 1); g.fillRect(x, y + 3, width, 3);
      g.fillStyle(C.fence, 1); g.fillRect(x, y, width, 3);
      for (let px = x + 7; px < x + width; px += 18) g.fillRect(px, y - 3, 3, 9);
    }

    hedge(g, x, y, width) {
      g.fillStyle(C.hedge, 1); g.fillRect(x, y, width, 7);
      g.fillStyle(C.hedgeLight, 1);
      for (let px = x + 2; px < x + width; px += 11) g.fillRect(px, y - 2, 7, 4);
    }

    house(g, x, y, right) {
      g.fillStyle(0x8d604e, 1); g.fillRect(x, y, 38, 67);
      g.fillStyle(0xc28a67, 1);
      for (let row = y + 5; row < y + 62; row += 8) g.fillRect(x, row, 38, 2);
      const windowX = x + (right ? 4 : 20);
      g.fillStyle(C.deepBlue, 1); g.fillRect(windowX, y + 17, 13, 20);
      g.fillStyle(C.waterLight, 1); g.fillRect(windowX + 2, y + 19, 9, 8);
      g.fillStyle(C.cream, 1); g.fillRect(windowX + 6, y + 17, 1, 20); g.fillRect(windowX, y + 27, 13, 1);
    }

    pool(g, pool, goal) {
      g.fillStyle(C.concreteDark, 1); g.fillRect(pool.x - 4, pool.y - 4, pool.width + 8, pool.height + 8);
      g.fillStyle(C.concrete, 1); g.fillRect(pool.x - 3, pool.y - 3, pool.width + 6, pool.height + 6);
      g.fillStyle(C.deepBlue, 1); g.fillRect(pool.x, pool.y, pool.width, pool.height);
      g.fillStyle(goal ? 0x4babc0 : C.water, 1); g.fillRect(pool.x + 2, pool.y + 2, pool.width - 4, pool.height - 4);
      g.fillStyle(C.waterLight, 1);
      for (let x = pool.x + 5; x < pool.right - 8; x += 16) {
        g.fillRect(x, pool.y + 6, 9, 2); g.fillRect(x + 6, pool.y + 16, 8, 2);
      }
      g.fillStyle(C.white, 0.7);
      g.fillRect(pool.right - 11, pool.y + 4, 2, 13);
      g.fillRect(pool.right - 8, pool.y + 4, 2, 13);
      g.fillRect(pool.right - 11, pool.y + 9, 5, 2);
    }

    patioSet(g, x, y) {
      g.fillStyle(C.cream, 1); g.fillRect(x, y, 19, 4); g.fillRect(x + 8, y - 8, 3, 14);
      g.fillStyle(C.deepBlue, 1); g.fillTriangle(x + 1, y - 7, x + 18, y - 7, x + 9, y - 15);
      g.fillStyle(C.cream, 1); g.fillRect(x - 3, y + 5, 3, 9); g.fillRect(x + 21, y + 5, 3, 9);
      g.fillStyle(C.magenta, 1); g.fillRect(x - 5, y + 2, 7, 3); g.fillRect(x + 19, y + 2, 7, 3);
    }

    grill(g, x, y) {
      g.fillStyle(C.black, 1); g.fillRect(x, y, 17, 8); g.fillRect(x + 4, y + 8, 2, 9); g.fillRect(x + 12, y + 8, 2, 9);
      g.fillStyle(C.grayLight, 1); g.fillRect(x + 2, y - 2, 13, 3); g.fillRect(x + 15, y + 2, 6, 2);
      g.fillStyle(C.red, 1); g.fillRect(x + 5, y + 3, 7, 2);
    }

    flowerBed(g, x, y, width) {
      g.fillStyle(C.brown, 1); g.fillRect(x, y, width, 7);
      for (let px = x + 4; px < x + width - 2; px += 11) {
        g.fillStyle(C.hedgeLight, 1); g.fillRect(px, y - 4, 2, 5);
        g.fillStyle(px % 22 === 4 ? C.yellow : C.magenta, 1); g.fillRect(px - 1, y - 6, 4, 3);
      }
    }

    clothesline(g, x, y) {
      g.fillStyle(C.fenceDark, 1); g.fillRect(x, y, 2, 19); g.fillRect(x + 88, y, 2, 19);
      g.fillStyle(C.cream, 1); g.fillRect(x + 2, y + 2, 86, 1);
      g.fillStyle(C.white, 1); g.fillRect(x + 18, y + 3, 16, 9);
      g.fillStyle(C.blue, 1); g.fillRect(x + 44, y + 3, 13, 7);
      g.fillStyle(C.magenta, 1); g.fillRect(x + 67, y + 3, 10, 10);
    }

    flamingo(g, x, y) {
      g.fillStyle(C.magenta, 1); g.fillRect(x, y, 2, 12); g.fillRect(x + 2, y, 6, 2); g.fillRect(x + 7, y - 3, 2, 5);
      g.fillRect(x - 4, y + 9, 8, 5); g.fillRect(x - 2, y + 14, 1, 6); g.fillRect(x + 2, y + 14, 1, 6);
      g.fillStyle(C.black, 1); g.fillRect(x + 8, y - 3, 2, 1);
    }

    sprinkler(g, x, y, right) {
      g.fillStyle(C.grayLight, 1); g.fillRect(x, y, 9, 3); g.fillRect(x + 4, y - 3, 2, 5);
      g.lineStyle(1, C.waterLight, 0.75);
      if (right) {
        g.lineBetween(x + 5, y - 3, x + 18, y - 10); g.lineBetween(x + 5, y - 3, x + 20, y - 5);
      } else {
        g.lineBetween(x + 5, y - 3, x - 8, y - 10); g.lineBetween(x + 5, y - 3, x - 10, y - 5);
      }
    }

    tree(g, x, y) {
      g.fillStyle(C.brown, 1); g.fillRect(x - 2, y, 5, 19);
      g.fillStyle(C.hedge, 1); g.fillCircle(x, y - 5, 12); g.fillCircle(x - 8, y, 9); g.fillCircle(x + 8, y, 9);
      g.fillStyle(C.hedgeLight, 1); g.fillCircle(x - 4, y - 8, 6); g.fillCircle(x + 7, y - 2, 5);
    }

    createHazards() {
      this.hazards = this.physics.add.group();
      [
        ["dog", "dog-run", 151, 44, 1, 126, -10, "AN ENTHUSIASTIC DOG"],
        ["mower", "mower-roll", 109, 34, -1, 160, 60, "THE MOWER SHOWS NO MERCY"],
        ["cat", "cat-run", 70, 52, 1, 118, -35, "STARTLED BY A CAT"],
        ["goose", "goose-charge", 53, 39, -1, 170, 85, "THE GOOSE DISAPPROVES"],
      ].forEach(([key, animation, y, speed, direction, spacing, start, reason]) => {
        for (let x = start; x < W + 70; x += spacing) {
          const hazard = this.physics.add.sprite(x, y, `${key}-0`)
            .setDepth(7)
            .setVelocityX(speed * direction)
            .setImmovable(true)
            .setFlipX(direction < 0);
          hazard.play(animation);
          hazard.body.setSize(Math.max(12, hazard.width - 4), Math.max(8, hazard.height - 3));
          hazard.setData("direction", direction).setData("reason", reason).setData("laneY", y);
          this.hazards.add(hazard);
        }
      });
    }

    update(time, delta) {
      if (this.pausePressed()) {
        touch.pause = false;
        this.togglePause();
      }
      if (this.paused || this.completed) return;

      this.wrapHazards(time);
      this.cooldown = Math.max(0, this.cooldown - delta);
      const direction = this.direction();
      if (direction && this.cooldown <= 0) {
        this.player.x = Phaser.Math.Clamp(this.player.x + direction.x * STEP, 8, W - 8);
        this.player.y = Phaser.Math.Clamp(this.player.y + direction.y * STEP, 22, H - 10);
        if (direction.x !== 0) this.player.setFlipX(direction.x < 0);
        this.cooldown = 115;
        this.showMovePose();
      }

      const pool = this.currentPool();
      if (pool) {
        this.comfort = Math.min(100, this.comfort + delta * 0.06);
        this.lastPool = {
          x: Phaser.Math.Clamp(this.player.x, pool.left + 9, pool.right - 9),
          y: Phaser.Math.Clamp(this.player.y, pool.top + 11, pool.bottom - 7),
        };
        if (!this.wasInPool) this.splash(this.player.x, this.player.y + 9);
      } else {
        this.comfort = Math.max(0, this.comfort - delta * 0.029);
      }
      this.wasInPool = Boolean(pool);

      if (!direction && !this.poseTimer) this.player.setTexture(pool ? this.kurt["swim-a"] : this.kurt.idle);
      if (this.comfort <= 0) this.fail("TOO LONG ON DRY LAND");
      if (Phaser.Geom.Rectangle.Contains(this.pools[this.pools.length - 1], this.player.x, this.player.y)) this.complete();

      this.bar.width = 70 * (this.comfort / 100);
      this.bar.setFillStyle(this.comfort < 30 ? C.red : C.waterLight);
    }

    showMovePose() {
      const inPool = Boolean(this.currentPool());
      this.stepFrame = !this.stepFrame;
      const key = inPool
        ? (this.stepFrame ? "swim-a" : "swim-b")
        : (this.stepFrame ? "step-a" : "step-b");
      this.player.setTexture(this.kurt[key]);
      if (this.poseTimer) this.poseTimer.remove(false);
      this.poseTimer = this.time.delayedCall(95, () => {
        this.poseTimer = null;
        this.player.setTexture(this.currentPool() ? this.kurt["swim-a"] : this.kurt.idle);
      });
    }

    splash(x, y) {
      [-8, 0, 8].forEach((offset, index) => {
        const drop = this.add.rectangle(x + offset, y, index === 1 ? 4 : 3, 2, C.waterLight).setDepth(9);
        this.tweens.add({
          targets: drop,
          x: x + offset * 1.5,
          y: y - (index === 1 ? 9 : 6),
          alpha: 0,
          duration: 260,
          onComplete: () => drop.destroy(),
        });
      });
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

    wrapHazards(time) {
      this.hazards.children.iterate((hazard) => {
        if (!hazard) return;
        const direction = hazard.getData("direction");
        if (direction > 0 && hazard.x > W + 35) hazard.x = -35;
        else if (direction < 0 && hazard.x < -35) hazard.x = W + 35;
        if (hazard.texture.key.startsWith("goose")) hazard.y = hazard.getData("laneY") + Math.round(Math.sin((time + hazard.x) / 130));
      });
    }

    fail(reason) {
      if (this.paused || this.completed || !this.player.active) return;
      this.player.setActive(false);
      this.player.body.enable = false;
      this.player.setTexture(this.kurt.stumble).setAngle(90).setTint(0xffdddd);
      this.lives -= 1;
      this.livesText.setText(`LIVES ${this.lives}`);
      this.message.setText(reason).setVisible(true);
      this.cameras.main.shake(140, 0.008);
      this.time.delayedCall(760, () => {
        if (this.lives <= 0) {
          this.scene.restart({ level: this.level });
          return;
        }
        this.player.setPosition(this.lastPool.x, this.lastPool.y)
          .setActive(true)
          .setAngle(0)
          .clearTint()
          .setTexture(this.kurt["swim-a"]);
        this.player.body.enable = true;
        this.comfort = 100;
        this.wasInPool = true;
        this.message.setVisible(false);
      });
    }

    complete() {
      if (this.completed) return;
      this.completed = true;
      this.physics.world.pause();
      localStorage.setItem("kurt-fancaster-swimmer-complete", "true");
      this.player.setTexture(this.kurt.victory).setAngle(0).clearTint();
      this.tweens.add({ targets: this.player, y: this.player.y - 4, duration: 420, yoyo: true, repeat: 1 });
      this.message.setText("REEL COMPLETE!\nKURT REMAINS MAGNIFICENTLY DAMP.").setVisible(true);
      this.time.delayedCall(2300, () => {
        this.physics.world.resume();
        this.cameras.main.fadeOut(180, 11, 9, 16);
        this.time.delayedCall(180, () => this.scene.start("ReelRoomScene"));
      });
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
