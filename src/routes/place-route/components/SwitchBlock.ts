import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';

export class SwitchBlock {
  public container = new Container();
  private bg = new Graphics();
  private textNode: Text;
  private defaultText: string;
  
  // Cache internal state configurations to avoid redundant redraw steps

  constructor(x: number, y: number) {
    this.container.x = x * 120;
    this.container.y = y * 120;
    this.defaultText = `Switch\n${x},${y}`;

    this.textNode = new Text({
      text: this.defaultText,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, align: 'center' })
    });
    this.textNode.anchor.set(0.5);

    this.container.addChild(this.bg, this.textNode);
    this.render(0x1e293b, 0x475569, 1.5);
  }

  private render(fill: number, strokeColor: number, width: number) {
    this.bg.clear()
      .rect(-35, -35, 70, 70)
      .fill(fill)
      .stroke({ width, color: strokeColor });
  }

}
