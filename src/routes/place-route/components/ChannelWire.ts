import { Container, Graphics } from 'pixi.js';

export class ChannelWire {
  public container = new Container();
  private wire = new Graphics();
  private offset: number;

  constructor(x: number, y: number, trackIndex: number, private isHorizontal: boolean, capacity: number) {
    this.container.x = x * 120;
    this.container.y = y * 120;
    this.offset = (trackIndex - (capacity - 1) / 2) * 6;
    this.reset();
    this.container.addChild(this.wire);
  }

  private drawLine(color: number, width: number) {
    this.wire.clear();
    if (this.isHorizontal) {
      this.wire.moveTo(-120, this.offset).lineTo(120, this.offset);
    } else {
      this.wire.moveTo(this.offset, -120).lineTo(this.offset, 120);
    }
    this.wire.stroke({ width, color });
  }

  public reset() {
    this.drawLine(0x1a2333, 1.5); // Idle dark wire color
  }

  public markRouted(congestion: number) {
    let color = 0x06b6d4; // Clear blue route
    if (congestion > 0.7) color = 0xef4444; // Congestion warning red
    else if (congestion > 0.1) color = 0xeab308; // Moderate load yellow

    this.drawLine(color, 3.5);
  }

  public markFrontier() {
    this.drawLine(0xeab308, 3.5); // Frontier routing exploration color
  }
}
