(() => {
  "use strict";

  const { W, H, C, LEVELS, touch, createKurt, BaseScene } = window.KF;

  class TitleScene extends BaseScene {
    constructor() { super("TitleScene"); }
    create() {
      this.createKeys();
      const g = this.add.graphics();
      g.fillStyle(0x251b35, 1).fillRect(0, 0, W, H);
      g.fillStyle(0x3e2851, 1).fillRect(0, 112, W, 88);
      g.fillStyle(C.black, 1).fillRect(0, 171, W, 29);
      g.fillStyle(C.magenta, 1)
        .fillTriangle(0, 0, 42, 0, 0, 142)
        .fillTriangle(W, 0, 278, 0, W, 142);
      g.lineStyle(2, C.gold, 1).strokeRect(12, 10, 296, 178);

      this.add.text(160, 25, "A PIXEL MOTION PICTURE", {
        fontFamily: "monospace", fontSize: "8px", color: "#e2b45b", letterSpacing: 2,
      }).setOrigin(0.5);
      this.add.text(160, 61, "THE ADVENTURES OF", {
        fontFamily: "monospace", fontSize: "10px", color: "#f5e7c8",
      }).setOrigin(0.5);
      this.add.text(160, 91, "KURT FANCASTER", {
        fontFamily: "Georgia, serif", fontSize: "25px", color: "#f5e7c8",
        fontStyle: "bold", stroke: "#0b0910", strokeThickness: 3,
      }).setOrigin(0.5);
      this.add.image(160, 140, createKurt(this, "swimmer")).setScale(1.55).setOrigin(0.5, 0.7);

      this.prompt = this.add.text(160, 181, "PRESS ENTER / TAP A", {
        fontFamily: "monospace", fontSize: "8px", color: "#f5e7c8",
      }).setOrigin(0.5);
      this.tweens.add({ targets: this.prompt, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });
      this.addDither();
    }
    update() {
      if (this.actionPressed()) {
        touch.action = false;
        this.scene.start("ReelRoomScene");
      }
    }
  }

  class ReelRoomScene extends BaseScene {
    constructor() {
      super("ReelRoomScene");
      this.selection = 0;
      this.ready = true;
    }
    create() {
      this.createKeys();
      const g = this.add.graphics();
      g.fillStyle(C.ink, 1).fillRect(0, 0, W, H);
      g.fillStyle(0x2d2438, 1).fillRect(0, 0, W, 37);
      g.fillStyle(C.black, 1).fillCircle(285, 20, 15).fillCircle(252, 20, 11);
      g.lineStyle(2, C.gold, 1)
        .strokeCircle(285, 20, 15)
        .strokeCircle(252, 20, 11)
        .lineBetween(262, 26, 276, 30);

      this.add.text(12, 10, "PROJECTION ROOM", {
        fontFamily: "monospace", fontSize: "11px", color: "#e2b45b",
      });
      this.add.text(12, 24, "Choose a reel", {
        fontFamily: "monospace", fontSize: "7px", color: "#b8a98d",
      });

      this.cards = LEVELS.map((level, index) => {
        const y = 62 + index * 42;
        const card = this.add.rectangle(160, y, 292, 35, 0x25202d).setStrokeStyle(1, 0x625873);
        this.add.text(22, y - 11, `REEL ${level.reel}`, {
          fontFamily: "monospace", fontSize: "7px", color: "#e2b45b",
        });
        this.add.text(22, y - 1, level.title.toUpperCase(), {
          fontFamily: "monospace", fontSize: "9px", color: level.available ? "#f5e7c8" : "#77717f",
        });
        this.add.text(22, y + 11, level.available ? level.genre : "COMING SOON", {
          fontFamily: "monospace", fontSize: "6px", color: "#b8a98d",
        });
        return card;
      });

      this.add.text(160, 192, "↑ ↓ SELECT   ENTER PLAY", {
        fontFamily: "monospace", fontSize: "7px", color: "#b8a98d",
      }).setOrigin(0.5);
      this.refresh();
      this.addDither();
    }
    refresh() {
      this.cards.forEach((card, index) => {
        const selected = index === this.selection;
        card.setFillStyle(selected ? 0x493956 : 0x25202d)
          .setStrokeStyle(selected ? 2 : 1, selected ? C.gold : 0x625873);
      });
    }
    update() {
      const up = this.keys.up.isDown || this.keys.w.isDown || touch.up;
      const down = this.keys.down.isDown || this.keys.s.isDown || touch.down;
      if ((up || down) && this.ready) {
        this.selection = Phaser.Math.Wrap(this.selection + (down ? 1 : -1), 0, LEVELS.length);
        this.refresh();
        this.ready = false;
      } else if (!up && !down) {
        this.ready = true;
      }

      if (this.actionPressed()) {
        touch.action = false;
        const level = LEVELS[this.selection];
        if (level.available) this.scene.start(level.scene, { level });
        else this.cameras.main.shake(90, 0.004);
      }
    }
  }

  window.KF.TitleScene = TitleScene;
  window.KF.ReelRoomScene = ReelRoomScene;
})();
