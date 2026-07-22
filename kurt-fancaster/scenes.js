(() => {
  "use strict";

  const { W, H, C, LEVELS, touch, createKurt, BaseScene } = window.KF;

  function marqueeBulbs(scene, x, y, width, height) {
    for (let px = x + 5; px < x + width - 4; px += 9) {
      scene.add.rectangle(px, y + 4, 2, 2, C.gold).setDepth(3);
      scene.add.rectangle(px, y + height - 4, 2, 2, C.gold).setDepth(3);
    }
    for (let py = y + 13; py < y + height - 10; py += 10) {
      scene.add.rectangle(x + 4, py, 2, 2, C.gold).setDepth(3);
      scene.add.rectangle(x + width - 4, py, 2, 2, C.gold).setDepth(3);
    }
  }

  class TitleScene extends BaseScene {
    constructor() { super("TitleScene"); }
    create() {
      this.createKeys();
      this.fadeIn(380);
      const g = this.add.graphics();

      g.fillStyle(0x20172e, 1); g.fillRect(0, 0, W, H);
      g.fillStyle(0x322142, 1); g.fillRect(0, 116, W, 84);
      g.fillStyle(C.black, 1); g.fillRect(0, 174, W, 26);

      g.fillStyle(0x60406e, 0.55);
      g.fillTriangle(0, 0, 58, 0, 0, 156);
      g.fillTriangle(W, 0, W - 58, 0, W, 156);
      g.fillStyle(C.magenta, 0.8);
      g.fillTriangle(0, 0, 26, 0, 0, 128);
      g.fillTriangle(W, 0, W - 26, 0, W, 128);

      g.fillStyle(C.gold, 0.12);
      g.fillTriangle(64, 200, 126, 60, 142, 60);
      g.fillTriangle(256, 200, 194, 60, 178, 60);

      g.fillStyle(0x130f19, 1); g.fillRect(25, 14, 270, 145);
      g.fillStyle(0x2a1d33, 1); g.fillRect(30, 19, 260, 135);
      g.lineStyle(2, C.gold, 1); g.strokeRect(25, 14, 270, 145);
      g.lineStyle(1, 0x725866, 1); g.strokeRect(31, 20, 258, 133);
      marqueeBulbs(this, 25, 14, 270, 145);

      this.add.text(160, 31, "ULIX PICTURES PRESENTS", {
        fontFamily: "monospace", fontSize: "7px", color: "#e2b45b", letterSpacing: 2,
      }).setOrigin(0.5).setDepth(4);
      this.add.text(160, 51, "A PIXEL MOTION PICTURE", {
        fontFamily: "monospace", fontSize: "8px", color: "#b89bc5", letterSpacing: 1,
      }).setOrigin(0.5).setDepth(4);
      this.add.text(160, 75, "THE ADVENTURES OF", {
        fontFamily: "monospace", fontSize: "9px", color: "#f5e7c8",
      }).setOrigin(0.5).setDepth(4);
      this.add.text(160, 99, "KURT FANCASTER", {
        fontFamily: "Georgia, serif", fontSize: "25px", color: "#f5e7c8",
        fontStyle: "bold", stroke: "#0b0910", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(4);
      this.add.text(160, 119, "THRILLS  •  DIGNITY  •  EXCESSIVE ATHLETICISM", {
        fontFamily: "monospace", fontSize: "5px", color: "#e2b45b",
      }).setOrigin(0.5).setDepth(4);

      this.kurt = this.add.image(160, 151, createKurt(this, "swimmer"))
        .setScale(1.28)
        .setOrigin(0.5, 0.88)
        .setDepth(5);
      this.tweens.add({ targets: this.kurt, y: 149, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

      this.prompt = this.add.text(160, 187, "PRESS ENTER / TAP A", {
        fontFamily: "monospace", fontSize: "8px", color: "#f5e7c8",
      }).setOrigin(0.5).setDepth(5);
      this.tweens.add({ targets: this.prompt, alpha: 0.28, duration: 650, yoyo: true, repeat: -1 });
      this.addDither();
    }
    update() {
      if (this.actionPressed()) {
        touch.action = false;
        this.cameras.main.fadeOut(180, 11, 9, 16);
        this.time.delayedCall(180, () => this.scene.start("ReelRoomScene"));
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
      this.fadeIn();
      const g = this.add.graphics();
      g.fillStyle(C.ink, 1); g.fillRect(0, 0, W, H);
      g.fillStyle(0x2d2438, 1); g.fillRect(0, 0, W, 39);
      g.fillStyle(C.black, 1); g.fillRect(0, 180, W, 20);

      g.fillStyle(C.black, 1); g.fillCircle(286, 20, 15); g.fillCircle(253, 20, 11);
      g.lineStyle(2, C.gold, 1); g.strokeCircle(286, 20, 15); g.strokeCircle(253, 20, 11); g.lineBetween(263, 26, 277, 30);
      [0, 90, 180, 270].forEach((angle) => {
        const rad = Phaser.Math.DegToRad(angle);
        g.fillStyle(0x2d2438, 1);
        g.fillCircle(286 + Math.cos(rad) * 8, 20 + Math.sin(rad) * 8, 3);
      });

      this.add.text(12, 9, "PROJECTION ROOM", {
        fontFamily: "monospace", fontSize: "11px", color: "#e2b45b",
      });
      this.add.text(12, 24, "Select tonight's attraction", {
        fontFamily: "monospace", fontSize: "7px", color: "#b8a98d",
      });

      const completed = localStorage.getItem("kurt-fancaster-swimmer-complete") === "true";
      this.cards = LEVELS.map((level, index) => {
        const y = 61 + index * 41;
        const card = this.add.rectangle(160, y, 294, 35, 0x25202d).setStrokeStyle(1, 0x625873);
        this.add.rectangle(31, y, 31, 27, 0x16121c).setStrokeStyle(1, 0x4f455a);
        const preview = this.add.graphics();
        this.drawReelPreview(preview, level.id, 31, y);
        this.add.text(53, y - 11, `REEL ${level.reel}`, {
          fontFamily: "monospace", fontSize: "6px", color: "#e2b45b",
        });
        this.add.text(53, y - 1, level.title.toUpperCase(), {
          fontFamily: "monospace", fontSize: "9px", color: level.available ? "#f5e7c8" : "#77717f",
        });
        this.add.text(53, y + 10, level.available ? level.genre : "REEL UNDER RESTORATION", {
          fontFamily: "monospace", fontSize: "5px", color: "#b8a98d",
        });
        if (level.id === "swimmer" && completed) {
          this.add.text(287, y - 1, "COMPLETE", {
            fontFamily: "monospace", fontSize: "5px", color: "#8ad9d8",
          }).setOrigin(1, 0.5);
        }
        return card;
      });

      this.cursor = this.add.text(8, 61, "▶", {
        fontFamily: "monospace", fontSize: "8px", color: "#e2b45b",
      }).setOrigin(0, 0.5);
      this.status = this.add.text(160, 178, LEVELS[0].subtitle, {
        fontFamily: "monospace", fontSize: "6px", color: "#b8a98d",
      }).setOrigin(0.5);
      this.add.text(160, 192, "↑ ↓ SELECT   ENTER PLAY", {
        fontFamily: "monospace", fontSize: "7px", color: "#b8a98d",
      }).setOrigin(0.5);
      this.refresh();
      this.addDither();
    }
    drawReelPreview(g, id, x, y) {
      if (id === "swimmer") {
        g.fillStyle(C.lawn, 1); g.fillRect(x - 13, y - 11, 26, 22);
        g.fillStyle(C.concrete, 1); g.fillRect(x - 9, y - 7, 18, 14);
        g.fillStyle(C.water, 1); g.fillRect(x - 7, y - 5, 14, 10);
        g.fillStyle(C.waterLight, 1); g.fillRect(x - 5, y - 2, 8, 1);
      } else if (id === "privateer") {
        g.fillStyle(C.deepBlue, 1); g.fillRect(x - 13, y - 11, 26, 22);
        g.fillStyle(C.brown, 1); g.fillRect(x - 8, y + 5, 17, 3);
        g.fillStyle(C.cream, 1); g.fillTriangle(x, y - 9, x, y + 4, x + 9, y + 4);
        g.fillStyle(C.magenta, 1); g.fillRect(x - 1, y - 9, 2, 15);
      } else {
        g.fillStyle(C.black, 1); g.fillRect(x - 13, y - 11, 26, 22);
        g.fillStyle(C.yellow, 0.8); g.fillTriangle(x - 4, y + 9, x + 2, y - 5, x + 8, y + 9);
        g.fillStyle(C.gray, 1); g.fillRect(x - 8, y + 7, 18, 2);
        g.fillStyle(C.red, 1); g.fillRect(x + 7, y + 4, 2, 2);
      }
    }
    refresh() {
      this.cards.forEach((card, index) => {
        const selected = index === this.selection;
        card.setFillStyle(selected ? 0x493956 : 0x25202d)
          .setStrokeStyle(selected ? 2 : 1, selected ? C.gold : 0x625873);
      });
      this.cursor.y = 61 + this.selection * 41;
      this.status.setText(LEVELS[this.selection].subtitle);
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
        if (level.available) {
          this.cameras.main.fadeOut(180, 11, 9, 16);
          this.time.delayedCall(180, () => this.scene.start(level.scene, { level }));
        } else {
          this.status.setText("THIS REEL IS STILL IN THE LAB");
          this.cameras.main.shake(90, 0.004);
        }
      }
    }
  }

  window.KF.TitleScene = TitleScene;
  window.KF.ReelRoomScene = ReelRoomScene;
})();
