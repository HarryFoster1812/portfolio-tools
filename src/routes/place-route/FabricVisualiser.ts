import { Application, Container, Rectangle } from 'pixi.js';
import type { FabricDimensions, RenderState } from './types';
import { ClbCell } from './components/ClbCell';
import { IoPadCell } from './components/IoPadCell';
import { ChannelWire } from './components/ChannelWire';
import { SwitchBlock } from './components/SwitchBlock';

export class FabricVisualiser {
  private app: Application;
  private viewport = new Container();
  
  // Storage Pools for Retained Objects
  private clbPool = new Map<string, ClbCell>();
  private ioPool = new Map<string, IoPadCell>();
  private wirePool = new Map<string, ChannelWire>();

  // Camera Drag & Zoom Engine State
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private camStart = { x: 0, y: 0 };

  constructor(private container: HTMLDivElement) {}

async init(dimensions: FabricDimensions) {
    this.app = new Application();
    await this.app.init({ 
      resizeTo: this.container, 
      backgroundColor: 0xffffff,//0x0c0f12, 
      antialias: true 
    });
    
    this.container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.viewport);

    this.buildStaticFabric(dimensions);

    const CELL_SIZE = 120;
    const totalX = (dimensions.clbWidth * 2 + 1) + 2;
    const totalY = (dimensions.clbHeight * 2 + 1) + 2;
    const fabricWidthPixels = totalX * CELL_SIZE;
    const fabricHeightPixels = totalY * CELL_SIZE;

    //  Move the viewport container anchor to the middle of the screen
    this.viewport.x = this.app.screen.width / 2;
    this.viewport.y = this.app.screen.height / 2;
    
    // Move the internal pivot pin to the absolute center of your FPGA grid
    this.viewport.pivot.x = fabricWidthPixels / 2;
    this.viewport.pivot.y = fabricHeightPixels / 2;

    // Calculate the ideal zoom level to fit the grid with 15% breathing room padding
    const padding = 1.15;
    const scaleX = this.app.screen.width / (fabricWidthPixels * padding);
    const scaleY = this.app.screen.height / (fabricHeightPixels * padding);
    
    // Pick the smaller scale so the larger side doesn't clip out of view
    const idealInitialZoom = Math.min(scaleX, scaleY);
    this.viewport.scale.set(idealInitialZoom);
    
    // Enable Global Camera Interactivity
    this.app.stage.interactive = true;
    this.app.stage.hitArea = this.app.screen;
    
    this.setupCameraEvents();
  }

  private setupCameraEvents() {
    this.app.stage.on('pointerdown', (e) => {
      // Only drag if clicking the empty background canvas
      if (e.target === this.app.stage) {
        this.isDragging = true;
        this.dragStart = { x: e.global.x, y: e.global.y };
        this.camStart = { x: this.viewport.x, y: this.viewport.y };
        this.container.style.cursor = 'grabbing';
      }
    });

    this.app.stage.on('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.global.x - this.dragStart.x;
      const dy = e.global.y - this.dragStart.y;
      this.viewport.x = this.camStart.x + dx;
      this.viewport.y = this.camStart.y + dy;
			console.log(this.viewport.x, this.viewport.y)
    });

    const stopDragging = () => {
      this.isDragging = false;
      this.container.style.cursor = 'grab';
    };

    this.app.stage.on('pointerup', stopDragging);
    this.app.stage.on('pointerupoutside', stopDragging);

    // Zoom Center Tracking Logic
    this.container.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.15;
      let newScale = this.viewport.scale.x;

      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Extract raw world spatial coordinates before zoom execution
      const worldX = (mouseX - this.viewport.x) / this.viewport.scale.x;
      const worldY = (mouseY - this.viewport.y) / this.viewport.scale.y;

      e.deltaY < 0 ? newScale *= zoomFactor : newScale /= zoomFactor;
      newScale = Math.max(0.1, Math.min(newScale, 12.0)); // Boundary safeguards
      
      this.viewport.scale.set(newScale);
      
      // Pivot compensation to zoom cleanly directly into pointer target
      this.viewport.x = mouseX - worldX * newScale;
      this.viewport.y = mouseY - worldY * newScale;
    }, { passive: false });
  }


	private drawIOPads(totalX: number, totalY: number){

		// Draw y = 0
		for (let y of [0, totalY-1]){
			for (let x = 1; x < totalX; x+=2) {
				const key = `${x},${y}`;

				const io = new IoPadCell(x, y);
				this.viewport.addChild(io.container);
				this.ioPool.set(key, io);
			}
		}
		// Draw x =0
		for (let x of [0, totalX-1]){
			for (let y = 1; y < totalY; y+=2) {
				const key = `${x},${y}`;

				const io = new IoPadCell(x, y);
				this.viewport.addChild(io.container);
				this.ioPool.set(key, io);
			}
		}
	}


	private drawClbs(dim: FabricDimensions){
		const baseX =2;
		const baseY = 2;

		for (let clbY = 0; clbY < dim.clbHeight; clbY++) {
			for (let clbX = 0; clbX < dim.clbWidth; clbX++) {
				let x = baseX + clbX*2; 
				let y = baseY + clbY*2; 
				let coreX = x-1;
				let coreY = y-1;
				const key = `${x},${y}`;
				const clb = new ClbCell(x, y, Math.floor(coreX/2), Math.floor(coreY/2));
				this.viewport.addChild(clb.container);
				this.clbPool.set(key, clb);
			}
		}
	}

	private drawChannels(totalX: number, totalY: number, dim: FabricDimensions){
    for (let coreY = 0; coreY < totalY-2; coreY++) {
      for (let coreX = 0; coreX < totalX-2; coreX++) {
				let x = coreX +1;
				let y = coreY +1;

        if ((coreX % 2 === 1 && coreY % 2 === 0) || (coreX % 2 === 0 && coreY % 2 === 1)) {
          const isHorizontal = coreY % 2 === 0;
          for (let t = 0; t < dim.channelCapacity; t++) {
            const wireKey = `${x},${y},${t}`;
            const wire = new ChannelWire(x, y, t, isHorizontal, dim.channelCapacity);
            this.viewport.addChild(wire.container);
            this.wirePool.set(wireKey, wire);
          }
        }
      }
    }
	}


	private drawSwitches(totalX: number, totalY: number, dim: FabricDimensions){
		for (let coreY = 0; coreY < totalY-2; coreY+=2) {
			for (let coreX = 0; coreX < totalX-2; coreX+=2) {
				let x = coreX+1;
				let y = coreY+1;
				// Draw switch
				const switchblock = new SwitchBlock(x,y);
				this.viewport.addChild(switchblock.container);
			}
		}
	}

  private buildStaticFabric(dim: FabricDimensions) {

    const totalX = (dim.clbWidth * 2 + 1) + 2;
    const totalY = (dim.clbHeight * 2 + 1) + 2;

		this.drawIOPads(totalX, totalY);
		this.drawClbs(dim);
		this.drawChannels(totalX, totalY, dim);
		this.drawSwitches(totalX, totalY, dim);

  }

  public updateState(state: RenderState) {
    const activeBlocks = new Map(state.blocks.map(b => [`${b.gridX},${b.gridY}`, b]));
    this.clbPool.forEach((clb, key) => clb.update(activeBlocks.get(key)));
    this.ioPool.forEach((io, key) => io.update(activeBlocks.get(key)));

    this.wirePool.forEach(wire => wire.reset());
    
    state.routedSegments.forEach(seg => {
      const key = `${seg.channelX},${seg.channelY},${seg.trackIndex}`;
      this.wirePool.get(key)?.markRouted(seg.congestion || 0);
    });

    state.frontier.forEach(seg => {
      const key = `${seg.channelX},${seg.channelY},${seg.trackIndex}`;
      this.wirePool.get(key)?.markFrontier();
    });
  }

  public destroy() {
    this.app?.destroy(true, { children: true });
  }
}


// TODO: add switch boxes after the wires are drawn: 0x221f22 (colour)
