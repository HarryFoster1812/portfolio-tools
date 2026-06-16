import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';

export class ClbCell {
  public container = new Container();
  private bg = new Graphics();
  private textNode: Text;
  private defaultText: string;
  
  // Cache internal state configurations to avoid redundant redraw steps
  private isHovered = false;
  private currentState: { label: string; isSwapping?: boolean } | null = null;

  constructor(x: number, y: number, logicX: number, logicY: number) {
    this.container.x = x * 120;
    this.container.y = y * 120;
    this.defaultText = `CLB\n${logicX},${logicY}`;

    this.textNode = new Text({
      text: this.defaultText,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, align: 'center' })
    });
    this.textNode.anchor.set(0.5);

    this.container.addChild(this.bg, this.textNode);
    
    this.container.interactive = true;
    // Ensure accurate pointer tracking boundaries even outside drawn geometry limits
    this.container.hitArea = new Rectangle(-40, -40, 80, 80);

    this.container.on('pointerover', () => {
      this.isHovered = true;
      this.refreshGraphics();
    });

    this.container.on('pointerout', () => {
      this.isHovered = false;
      this.refreshGraphics();
    });

    this.container.on('pointertap', () => {
      console.log(`Selected Hardware Module Node: ${this.textNode.text}`);
      // TODO: Add logic to diplay bounding box for active components
    });

    this.refreshGraphics();
  }

  private drawComponent(fill: number, strokeColor: number, strokeWidth: number) {
    this.bg.clear()
      .rect(-50, -50, 100, 100)
      .fill(fill)
      .stroke({ width: strokeWidth, color: strokeColor });
  }

  private refreshGraphics() {
    if (!this.currentState) {
      // Idle / Inactive Component Themes
      const strokeColor = this.isHovered ? 0x1e2638 : 0x3b4b6b;
      this.drawComponent(0x1e2638, strokeColor, this.isHovered ? 2.5 : 1.5);
      this.textNode.text = this.defaultText;
    } else {
      // Active Matrix Elements Processing Rules
      let fill = this.currentState.isSwapping ? 0x553c9a : 0x2a4365;
      let stroke = this.currentState.isSwapping ? 0xb794f4 : 0x63b3ed;
      
      if (this.isHovered) {
        stroke = 0x38bdf8; // Bright highlight ring when hovering active modules
      }
      
      this.drawComponent(fill, stroke, (this.currentState.isSwapping || this.isHovered) ? 2.5 : 1.5);
      this.textNode.text = this.currentState.label;
    }
  }

  public update(blockState?: { label: string; isSwapping?: boolean }) {
    this.currentState = blockState || null;
    this.refreshGraphics();
  }
}
