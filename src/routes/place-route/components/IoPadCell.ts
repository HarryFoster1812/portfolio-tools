import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class IoPadCell {
  public container = new Container();
  private bg = new Graphics();
  private textNode: Text;
  private defaultText: string;

  constructor(x: number, y: number) {
    this.container.x = x * 120;
    this.container.y = y * 120;
    this.defaultText = `IO\n${x},${y}`;

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
      .rect(-40, -23, 80, 46)
      .fill(fill)
      .stroke({ width, color: strokeColor });
  }

  // Pure data structural mapper 
  public update(blockState?: { label: string; isSwapping?: boolean }) {
    if (!blockState) {
      this.render(0x1e293b, 0x475569, 1.5);
      this.textNode.text = this.defaultText;
    } else {
      const fill = blockState.isSwapping ? 0x2563eb : 0x1e293b;
      const stroke = blockState.isSwapping ? 0x60a5fa : 0x475569;
      this.render(fill, stroke, blockState.isSwapping ? 2.5 : 1.5);
      this.textNode.text = blockState.label;
    }
  }
}
