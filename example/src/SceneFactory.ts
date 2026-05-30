import * as PIXI from 'pixi.js-legacy';

export interface SceneObjects {
  mainContainer: PIXI.Container;
  subContainer: PIXI.Container;
  g1: PIXI.Graphics;
  g2: PIXI.Graphics;
  g3: PIXI.Graphics;
  g4: PIXI.Graphics;
  sprite: PIXI.Sprite;
}

export class SceneFactory {
  static createSampleScene(): SceneObjects {
    const mainContainer = new PIXI.Container();
    const subContainer = new PIXI.Container();

    // 🔴 g1: Ellipse
    const g1 = new PIXI.Graphics();
    g1.beginFill('#ff0000');
    g1.drawEllipse(0, 0, 40, 25);
    g1.endFill();
    g1.position.set(75, 75);
    g1.angle = 30;
    g1.eventMode = 'static';
    g1.cursor = 'pointer';
    g1.hitArea = new PIXI.Ellipse(0, 0, 40, 25);
    g1.on('pointerdown', () => console.log('🔴 g1 pointerdown!'));

    // 🔵 g2: Scaled & Rotated Rect
    const g2 = new PIXI.Graphics();
    g2.beginFill('#0000ff');
    g2.drawRect(-25, -35, 50, 70);
    g2.endFill();
    g2.position.set(150, 150);
    g2.angle = 15;
    g2.scale.set(1.5, 1.7);
    g2.eventMode = 'static';
    g2.cursor = 'pointer';
    g2.on('pointerup', () => console.log('🔵 g2 pointerup!'));

    // ⚪ g3: Line 1
    const g3 = new PIXI.Graphics();
    g3.lineStyle(5, '#ffffff', 1);
    g3.moveTo(0, 0).lineTo(80, 60);
    g3.angle = -20;

    // 🟡 g4: Line 2
    const g4 = new PIXI.Graphics();
    g4.lineStyle(5, '#ffff00', 1);
    g4.moveTo(0, 35).lineTo(80, -15);
    g4.angle = 20;

    // 🖼️ Sprite
    const sprite = this.createRandomSprite();
    sprite.position.set(220, 220);
    sprite.angle = -15;
    sprite.scale.set(0.8);
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointertap', () => console.log('🖼️ Sprite tapped!'));

    subContainer.position.set(75, 50);
    subContainer.addChild(g3, g4);
    mainContainer.addChild(subContainer);

    return { mainContainer, subContainer, g1, g2, g3, g4, sprite };
  }

  static createRandomGraphics(): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    if (Math.random() > 0.5) {
      g.beginFill(color);
      g.drawRect(
        Math.random() * 100,
        Math.random() * 100,
        30 + Math.random() * 40,
        30 + Math.random() * 40
      );
      g.endFill();
    } else {
      g.lineStyle(4, color, 1);
      g.moveTo(Math.random() * 150, Math.random() * 150);
      g.lineTo(Math.random() * 150, Math.random() * 150);
    }
    
    // Position randomly across full canvas (600x600)
    g.x = 50 + Math.random() * 500;
    g.y = 50 + Math.random() * 500;
    
    g.angle = Math.random() * 45 - 22.5;
    g.eventMode = 'static';
    g.cursor = 'grab';
    g.on('pointerdown', () => console.log('🎲 Random shape clicked!'));

    g.on('pointerdown', (e) => {
      console.log('Clicked sprite!', e.target, e.global.x, e.getLocalPosition(g.parent));
      e.target.tint = 0xCCCCCC;
      e.stopPropagation(); // ✅ Works!
    });
    g.on('pointerup', (e) => {
      e.target.tint = 0xFFFFFF;
    });
    // Removed scale change on pointerover/out to prevent resize issues
    g.on('pointerover', () => { });
    g.on('pointerout', () => { });

    return g;
  }

  /** Version without pointer events for examples */
  static createRandomGraphicsNoEvents(): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    if (Math.random() > 0.5) {
      g.beginFill(color);
      g.drawRect(
        Math.random() * 100,
        Math.random() * 100,
        30 + Math.random() * 40,
        30 + Math.random() * 40
      );
      g.endFill();
    } else {
      g.lineStyle(4, color, 1);
      g.moveTo(Math.random() * 150, Math.random() * 150);
      g.lineTo(Math.random() * 150, Math.random() * 150);
    }
    
    g.angle = Math.random() * 45 - 22.5;
    // Position randomly across full canvas (400x400)
    g.x = 50 + Math.random() * 300;
    g.y = 50 + Math.random() * 300;
    return g;
  }

static createRandomSprite(): PIXI.Sprite {
    const cvs = document.createElement('canvas');
    cvs.width = 80;
    cvs.height = 80;
    const ctx = cvs.getContext('2d')!;
    
    // Enable high-quality smoothing at source
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const type = Math.floor(Math.random() * 4);

    switch (type) {
      case 0: // Gradient Sphere
        const grad = ctx.createRadialGradient(40, 40, 5, 40, 40, 35);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#ff6b6b');
        grad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 80, 80);
        break;

      case 1: // Checkerboard
        const size = 20;
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#000000' : '#ffffff';
              ctx.fillRect(x * size, y * size, size, size);
            }
          }
        break;

      case 2: // Star
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? 35 : 15;
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            ctx.lineTo(40 + Math.cos(angle) * radius, 40 + Math.sin(angle) * radius);
          }
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case 3: // Emoji
        ctx.font = '64px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const emojis = ['🚀', '🌟', '🔥', '🎲', '💎', '🌈', '🎨', '🧊'];
        ctx.fillText(emojis[Math.floor(Math.random() * emojis.length)], 40, 40);
        break;
    }

    const texture = PIXI.Texture.from(cvs.toDataURL('image/png'));
    const sprite = new PIXI.Sprite(texture);
    
    sprite.anchor.set(0.5);
    // Position randomly across full canvas (600x600)
    sprite.x = 50 + Math.random() * 500;
    sprite.y = 50 + Math.random() * 500;
    sprite.angle = Math.random() * 360;
    sprite.scale.set(0.5 + Math.random() * 1);
    
    // Add event mode for interaction
    sprite.eventMode = 'static';
    sprite.cursor = 'grab';
    sprite.on('pointerdown', () => console.log('🖼️ Sprite clicked!'));

    return sprite;
  }

/** Version without pointer events for examples */
  static createRandomSpriteNoEvents(): PIXI.Sprite {
    const cvs = document.createElement('canvas');
    cvs.width = 80;
    cvs.height = 80;
    const ctx = cvs.getContext('2d')!;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const type = Math.floor(Math.random() * 4);

    switch (type) {
      case 0: // Gradient Sphere
        const grad = ctx.createRadialGradient(40, 40, 5, 40, 40, 35);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#ff6b6b');
        grad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 80, 80);
        break;

      case 1: // Checkerboard
        const size = 20;
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#000000' : '#ffffff';
              ctx.fillRect(x * size, y * size, size, size);
            }
          }
        break;

      case 2: // Star
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? 35 : 15;
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            ctx.lineTo(40 + Math.cos(angle) * radius, 40 + Math.sin(angle) * radius);
          }
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case 3: // Emoji
        ctx.font = '64px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const emojis = ['🚀', '🌟', '🔥', '🎲', '💎', '🌈', '🎨', '🧊'];
        ctx.fillText(emojis[Math.floor(Math.random() * emojis.length)], 40, 40);
        break;
    }

    const texture = PIXI.Texture.from(cvs.toDataURL('image/png'));
    const sprite = new PIXI.Sprite(texture);
    
    sprite.anchor.set(0.5);
    // Position randomly across full canvas (400x400)
    sprite.x = 50 + Math.random() * 300;
    sprite.y = 50 + Math.random() * 300;
    sprite.angle = Math.random() * 360;
    sprite.scale.set(0.5 + Math.random() * 1);
    
    // No eventMode - just visual elements
    return sprite;
  }
}