<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
  import type { FabricDimensions, RenderState, TrackSegment } from './types';

  export let dimensions: FabricDimensions;
  export let state: RenderState;

  // --- STRICT TOPOLOGY SIZES ---
  const CELL_SIZE = 120;       
  const CLB_SIZE = 68;         
  const WIRE_SPACING = 6;      
  const IO_WIDTH = 80;
  const IO_HEIGHT = 46;

  let canvasContainer: HTMLDivElement;
  let app: Application;
  
  // Viewport Layers
  let viewport = new Container();
  let wireLayer = new Container();       
  let activeWireLayer = new Container(); 
  let staticHardwareLayer = new Container();   
  let textLabelLayer = new Container();

  // Camera Engine
  let isDraggingCanvas = false;
  let dragStart = { x: 0, y: 0 };
  let camStart = { x: 0, y: 0 };

  const THEME = {
    bg: 0x090d16,
    clbBg: 0x1e293b,
    clbBorder: 0x475569,
    clbSwapBg: 0x2563eb,    
    clbSwapBorder: 0x60a5fa,
    
    // Dim, unassigned industrial copper palette
    ioBg: 0x14110f,
    ioBorder: 0x452715,
    ioTextIdle: 0x5a4a42,
    
    // High-visibility illuminated amber palette when an I/O is mapped
    ioActiveBg: 0x451a03,
    ioActiveBorder: 0xf59e0b,
    ioTextActive: 0xfcd34d,
    
    sbBg: 0x131b2e,         
    sbBorder: 0x1e3a8a,     
    wireIdle: 0x111827,     
    wireFrontier: 0xeab308, 
    wireRouted: 0x06b6d4,   
  };

  function getCongestionColor(val: number): number {
    if (!val || val <= 0.1) return THEME.wireRouted; 
    if (val < 0.7)  return 0xeab308; 
    return 0xef4444;                 
  }

  $: dynamicSbSize = Math.max(36, (dimensions.channelCapacity * WIRE_SPACING) + 16);

  // --- CALCULATION OF THE ENTIRE STRUCTURAL GRID MATRIX ---
  $: totalX = (dimensions.clbWidth * 2 + 1) + 2;
  $: totalY = (dimensions.clbHeight * 2 + 1) + 2;

  onMount(async () => {
    app = new Application();
    await app.init({
      resizeTo: canvasContainer,
      backgroundColor: THEME.bg,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    });

    canvasContainer.appendChild(app.canvas);
    
    app.stage.addChild(viewport);
    viewport.addChild(wireLayer);
    viewport.addChild(activeWireLayer);
    viewport.addChild(staticHardwareLayer);
    viewport.addChild(textLabelLayer);

    // Initial center positioning
    viewport.x = app.screen.width / 6;
    viewport.y = app.screen.height / 6;

    app.stage.interactive = true;
    app.stage.hitArea = app.screen; 

    app.stage.on('pointerdown', onCanvasPointerDown);
    app.stage.on('pointermove', onCanvasPointerMove);
    app.stage.on('pointerup', onCanvasPointerUp);
    app.stage.on('pointerupoutside', onCanvasPointerUp);
    
    canvasContainer.addEventListener('wheel', onWheel, { passive: false });

    renderScene();
  });

  $: if (app && state && dimensions) {
    renderScene();
  }

  function getTrackOffset(trackIndex: number, capacity: number): number {
    const mid = (capacity - 1) / 2;
    return (trackIndex - mid) * WIRE_SPACING;
  }

  // Helper function to handle the drawing and state lookup of individual I/O Pads
  function drawIoPad(
    x: number, 
    y: number, 
    pxX: number, 
    pxY: number, 
    hw: Graphics, 
    stateMap: Map<string, typeof state.blocks[0]>
  ) {
    const runtimeBlock = stateMap.get(`${x},${y}`);
    const isAssigned = !!runtimeBlock;

    // Draw background and borders based on assignment state
    hw.rect(pxX - IO_WIDTH / 2, pxY - IO_HEIGHT / 2, IO_WIDTH, IO_HEIGHT)
      .fill(isAssigned ? THEME.ioActiveBg : THEME.ioBg)
      .stroke({ width: isAssigned ? 2.5 : 1.5, color: isAssigned ? THEME.ioActiveBorder : THEME.ioBorder });

    // Determine typography color and naming convention
    const txt = runtimeBlock ? runtimeBlock.label : `PAD_${x},${y}`;
    const labelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: isAssigned ? THEME.ioTextActive : THEME.ioTextIdle,
      align: 'center'
    });

    const label = new Text({ text: txt, style: labelStyle });
    label.anchor.set(0.5); 
    label.x = pxX; 
    label.y = pxY;
    textLabelLayer.addChild(label);
  }

  // Draws baseline wire tracks linking perimeter pads natively to their internal single Switch Box
  function drawIoTrackStubs(wireGraphics: Graphics) {
    // Top and Bottom Boundaries: Vertical stubs connecting to Row 1 and Row (totalY-2) Switch Boxes
    for (let x = 1; x < totalX - 1; x += 2) {
      for (let t = 0; t < dimensions.channelCapacity; t++) {
        const offset = getTrackOffset(t, dimensions.channelCapacity);
        const pxX = x * CELL_SIZE + offset;

        // TOP EDGE: Extends from Y=0 (Pad Center) down to Y=CELL_SIZE (Switch Box Center)
        wireGraphics.moveTo(pxX, 0).lineTo(pxX, CELL_SIZE);

        // BOTTOM EDGE: Extends from bottom pad up into the lowest row of Switch Boxes
        const bottomPadY = (totalY - 1) * CELL_SIZE;
        const bottomSboxY = (totalY - 2) * CELL_SIZE;
        wireGraphics.moveTo(pxX, bottomPadY).lineTo(pxX, bottomSboxY);
      }
    }

    // Left and Right Boundaries: Horizontal stubs connecting to Col 1 and Col (totalX-2) Switch Boxes
    for (let y = 1; y < totalY - 1; y += 2) {
      for (let t = 0; t < dimensions.channelCapacity; t++) {
        const offset = getTrackOffset(t, dimensions.channelCapacity);
        const pxY = y * CELL_SIZE + offset;

        // LEFT EDGE: Extends from X=0 (Pad Center) right to X=CELL_SIZE (Switch Box Center)
        wireGraphics.moveTo(0, pxY).lineTo(CELL_SIZE, pxY);

        // RIGHT EDGE: Extends from right pad left into the farthest column of Switch Boxes
        const rightPadX = (totalX - 1) * CELL_SIZE;
        const rightSboxX = (totalX - 2) * CELL_SIZE;
        wireGraphics.moveTo(rightPadX, pxY).lineTo(rightSboxX, pxY);
      }
    }
  }

  function renderScene() {
    wireLayer.removeChildren();
    staticHardwareLayer.removeChildren();
    activeWireLayer.removeChildren();
    textLabelLayer.removeChildren();

    const wireGraphics = new Graphics();
    const hwGraphics = new Graphics();
    const activeWireGraphics = new Graphics();

    const defaultTextStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 11,
      fill: 0xffffff,
      align: 'center'
    });

    // Hash active cells coming out of the engine state snapshot
    const stateBlockMap = new Map<string, typeof state.blocks[0]>();
    state.blocks.forEach(b => {
      stateBlockMap.set(`${b.gridX},${b.gridY}`, b);
    });

    // --- 1. COMPOSITING THE FABRIC GRID LAYOUT STRUCTURALLY ---
    for (let y = 0; y < totalY; y++) {
      for (let x = 0; x < totalX; x++) {
        const pxX = x * CELL_SIZE;
        const pxY = y * CELL_SIZE;

        const isOuterLeft = x === 0;
        const isOuterRight = x === totalX - 1;
        const isOuterTop = y === 0;
        const isOuterBottom = y === totalY - 1;
        const isBoundary = isOuterLeft || isOuterRight || isOuterTop || isOuterBottom;

        // A. PARSE OUTER BOUNDARY PACKAGING RING
        if (isBoundary) {
          // Skip the four blank corners
          if ((isOuterLeft || isOuterRight) && (isOuterTop || isOuterBottom)) continue;

          // Render ALL peripheral pads systematically. They align with odd layout indices.
          if ((isOuterTop || isOuterBottom) && x % 2 === 1) {
            drawIoPad(x, y, pxX, pxY, hwGraphics, stateBlockMap);
          } else if ((isOuterLeft || isOuterRight) && y % 2 === 1) {
            drawIoPad(x, y, pxX, pxY, hwGraphics, stateBlockMap);
          }
          continue; 
        }

        // B. PARSE INTERNAL CORE LOGIC GRID
        const coreX = x - 1;
        const coreY = y - 1;

        // Draw Horizontal Interconnect Channels
        if (coreX % 2 === 1 && coreY % 2 === 0) {
          for (let t = 0; t < dimensions.channelCapacity; t++) {
            const offset = getTrackOffset(t, dimensions.channelCapacity);
            wireGraphics.moveTo(pxX - CELL_SIZE, pxY + offset).lineTo(pxX + CELL_SIZE, pxY + offset);
          }
        }
        // Draw Vertical Interconnect Channels
        if (coreX % 2 === 0 && coreY % 2 === 1) {
          for (let t = 0; t < dimensions.channelCapacity; t++) {
            const offset = getTrackOffset(t, dimensions.channelCapacity);
            wireGraphics.moveTo(pxX + offset, pxY - CELL_SIZE).lineTo(pxX + offset, pxY + CELL_SIZE);
          }
        }

        // Draw Switch Boxes (SW)
        if (coreX % 2 === 0 && coreY % 2 === 0) {
          hwGraphics.rect(pxX - dynamicSbSize/2, pxY - dynamicSbSize/2, dynamicSbSize, dynamicSbSize)
                    .fill(THEME.sbBg)
                    .stroke({ width: 1.5, color: THEME.sbBorder });
          
          const label = new Text({ text: `SW\n${coreX/2},${coreY/2}`, style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: 0x3b82f6 }) });
          label.anchor.set(0.5); label.x = pxX; label.y = pxY;
          textLabelLayer.addChild(label);
        }

        // Draw Logic Cells (CLBs)
        if (coreX % 2 === 1 && coreY % 2 === 1) {
          const runtimeBlock = stateBlockMap.get(`${x},${y}`);
          const isSwapping = runtimeBlock?.isSwapping || false;
          
          hwGraphics.rect(pxX - CLB_SIZE/2, pxY - CLB_SIZE/2, CLB_SIZE, CLB_SIZE)
                    .fill(isSwapping ? THEME.clbSwapBg : THEME.clbBg)
                    .stroke({ width: isSwapping ? 2.5 : 1.5, color: isSwapping ? THEME.clbSwapBorder : THEME.clbBorder });

          const cellLabel = runtimeBlock ? runtimeBlock.label : `CLB\n${Math.floor(coreX/2)},${Math.floor(coreY/2)}`;
          const label = new Text({ text: cellLabel, style: defaultTextStyle });
          label.anchor.set(0.5); label.x = pxX; label.y = pxY;
          textLabelLayer.addChild(label);
        }
      }
    }

    // Connect IO boundary tracks to internal switch box points
    drawIoTrackStubs(wireGraphics);

    wireGraphics.stroke({ width: 1.5, color: THEME.wireIdle });
    wireLayer.addChild(wireGraphics);
    staticHardwareLayer.addChild(hwGraphics);

// --- BOUNDARY-AWARE ACTIVE ROUTING CONNECTIONS ---
    const drawActiveSegment = (seg: TrackSegment, color: number, strokeWidth: number) => {
      const pxX = seg.channelX * CELL_SIZE;
      const pxY = seg.channelY * CELL_SIZE;
      const offset = getTrackOffset(seg.trackIndex, dimensions.channelCapacity);

      const isTopStub = seg.channelY === 0;
      const isBottomStub = seg.channelY === totalY - 1;
      const isLeftStub = seg.channelX === 0;
      const isRightStub = seg.channelX === totalX - 1;

      if (isTopStub) {
        // Active path goes from Pad down into Switch Box below
        activeWireGraphics.moveTo(pxX + offset, 0).lineTo(pxX + offset, CELL_SIZE);
      } else if (isBottomStub) {
        // Active path goes from Pad up into Switch Box above
        activeWireGraphics.moveTo(pxX + offset, pxY).lineTo(pxX + offset, pxY - CELL_SIZE);
      } else if (isLeftStub) {
        // Active path goes from Pad right into Switch Box to the right
        activeWireGraphics.moveTo(0, pxY + offset).lineTo(CELL_SIZE, pxY + offset);
      } else if (isRightStub) {
        // Active path goes from Pad left into Switch Box to the left
        activeWireGraphics.moveTo(pxX, pxY + offset).lineTo(pxX - CELL_SIZE, pxY + offset);
      } else {
        // STANDARD INTERNAL CORE CHANNELS (Unchanged)
        // Check orientation using absolute coordinates: even Y lines are horizontal channels
        if ((seg.channelY - 1) % 2 === 0) {
          activeWireGraphics.moveTo(pxX - CELL_SIZE, pxY + offset).lineTo(pxX + CELL_SIZE, pxY + offset);
        } else {
          activeWireGraphics.moveTo(pxX + offset, pxY - CELL_SIZE).lineTo(pxX + offset, pxY + CELL_SIZE);
        }
      }

      activeWireGraphics.stroke({ width: strokeWidth, color: color });
    };

    // Execute drawing passes over both sets of runtime routing tracks
    state.routedSegments.forEach(seg => drawActiveSegment(seg, getCongestionColor(seg.congestion || 0), 3.5));
    state.frontier.forEach(seg => drawActiveSegment(seg, THEME.wireFrontier, 3.5));

    activeWireLayer.addChild(activeWireGraphics);
  }

  // --- CAMERA ENGINE TRANSLATIONS ---
  function onCanvasPointerDown(e: any) {
    isDraggingCanvas = true;
    dragStart = { x: e.global.x, y: e.global.y };
    camStart = { x: viewport.x, y: viewport.y };
    canvasContainer.style.cursor = 'grabbing';
  }

  function onCanvasPointerMove(e: any) {
    if (!isDraggingCanvas) return;
    const dx = e.global.x - dragStart.x;
    const dy = e.global.y - dragStart.y;
    viewport.x = camStart.x + dx;
    viewport.y = camStart.y + dy;
  }

  function onCanvasPointerUp() {
    isDraggingCanvas = false;
    canvasContainer.style.cursor = 'grab';
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = 1.15;
    let newScale = viewport.scale.x;

    const rect = canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - viewport.x) / viewport.scale.x;
    const worldY = (mouseY - viewport.y) / viewport.scale.y;

    e.deltaY < 0 ? newScale *= zoomFactor : newScale /= zoomFactor;
    newScale = Math.max(0.1, Math.min(newScale, 12.0));
    viewport.scale.set(newScale);
    
    viewport.x = mouseX - worldX * newScale;
    viewport.y = mouseY - worldY * newScale;
  }

  onDestroy(() => {
    if (!app) return;
    if (canvasContainer) canvasContainer.removeEventListener('wheel', onWheel);
    app.destroy(true, { children: true });
  });
</script>

<div class="canvas-wrapper" bind:this={canvasContainer} style="cursor: grab;"></div>

<style>
  .canvas-wrapper {
    width: 100%;
    height: 580px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #1e293b;
    background: #090d16;
    user-select: none;
    touch-action: none; 
  }
</style>
