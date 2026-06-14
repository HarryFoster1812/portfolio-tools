<script lang="ts">
  import FpgaCanvas from './fpga_canvas.svelte';
  import type { FabricDimensions, RenderState } from './types';

  const dimensions: FabricDimensions = { clbWidth: 3, clbHeight: 3, channelCapacity: 4 };

  let timelineIndex = 0;

  // Sequential compilation state-machine history payload

const compilationTimeline: RenderState[] = [
  // =========================================================================
  // PHASE 1: INITIAL UNOPTIMIZED PLACEMENT
  // =========================================================================
  {
    phase: 'PLACING',
    currentStepDescription: 'Yosys netlist ingested. Inputs pinned to boundary pads. Core logic gates scattered randomly inside the matrix.',
    blocks: [
      // Permanent I/O Pads (Fixed)
      { gridX: 1, gridY: 0, label: 'IN_A' },
      { gridX: 3, gridY: 0, label: 'IN_B' },
      { gridX: 4, gridY: 3, label: 'OUT_Y' },
      // Logic Cells (Initially in an unoptimized layout)
      { gridX: 2, gridY: 2, label: 'AND_GATE' }
    ],
    frontier: [],
    routedSegments: [],
    metrics: {
      totalWirelength: 24.5,
      timingCriticality: 0.85,
      totalCongestionCost: 0.0,
      aggregateCost: 24.5
    }
  },
  
  // =========================================================================
  // PHASE 2: SIMULATED ANNEALING - PLACEMENT SWAP INTERACTION
  // =========================================================================
  {
    phase: 'PLACING',
    currentStepDescription: 'Simulated Annealing Iteration 42: Shuffling layout blocks to optimize and minimize the overall Half-Perimeter Wirelength (HPWL).',
    blocks: [
      { gridX: 1, gridY: 0, label: 'IN_A' },
      { gridX: 3, gridY: 0, label: 'IN_B' },
      { gridX: 4, gridY: 3, label: 'OUT_Y' },
      // Highlighting an active physical block relocation swap step
      { gridX: 2, gridY: 2, label: 'AND_GATE', isSwapping: true }
    ],
    frontier: [],
    routedSegments: [],
    metrics: {
      totalWirelength: 18.2,
      timingCriticality: 0.62,
      totalCongestionCost: 0.0,
      aggregateCost: 18.2
    }
  },

  // =========================================================================
  // PHASE 3: PATHFINDER ROUTING - WAVEFRONT EXPANSION (FRONTIER)
  // =========================================================================
  {
    phase: 'ROUTING',
    currentStepDescription: 'Routing Iteration 1: Expanding Dijkstra Dijkstra/A* wavefront paths outwards from IN_A toward adjacent switchbox channel track intersections.',
    blocks: [
      { gridX: 1, gridY: 0, label: 'IN_A' },
      { gridX: 3, gridY: 0, label: 'IN_B' },
      { gridX: 4, gridY: 3, label: 'OUT_Y' },
      { gridX: 2, gridY: 2, label: 'AND_GATE' }
    ],
    // The router searches along Channel Track Coordinates (X=1, Y=1) at Track Index 0
    frontier: [
      { channelX: 1, channelY: 1, trackIndex: 0 }
    ],
    routedSegments: [],
    metrics: {
      totalWirelength: 12.0,
      timingCriticality: 0.45,
      totalCongestionCost: 0.0,
      aggregateCost: 12.0
    }
  },

  // =========================================================================
  // PHASE 4: PATHFINDER ROUTING - CONGESTION DETECTED
  // =========================================================================
  {
    phase: 'ROUTING',
    currentStepDescription: 'Routing Iteration 2: Two critical nets are attempting to seize the exact same track node resource. Congestion penalty triggered!',
    blocks: [
      { gridX: 1, gridY: 0, label: 'IN_A' },
      { gridX: 3, gridY: 0, label: 'IN_B' },
      { gridX: 4, gridY: 3, label: 'OUT_Y' },
      { gridX: 2, gridY: 2, label: 'AND_GATE' }
    ],
    frontier: [
      { channelX: 2, channelY: 3, trackIndex: 1 }
    ],
    // Wires overlap on Channel Segment (2,1) Track 0, forcing congestion cost up
    routedSegments: [
      { channelX: 1, channelY: 1, trackIndex: 0, congestion: 0.1 },
      { channelX: 2, channelY: 1, trackIndex: 0, congestion: 0.95 }, // Will render RED on canvas
      { channelX: 3, channelY: 1, trackIndex: 0, congestion: 0.1 }
    ],
    metrics: {
      totalWirelength: 14.5,
      timingCriticality: 0.55,
      totalCongestionCost: 85.0, // Major penalty added to force a detour
      aggregateCost: 99.5
    }
  },

  // =========================================================================
  // PHASE 5: PATHFINDER ROUTING - NEGOTIATED DETOUR RESOLUTION
  // =========================================================================
  {
    phase: 'ROUTING',
    currentStepDescription: 'Routing Iteration 3: Negotiation successful. One net backed away from the costly congested track and routed via an alternative clear wire path.',
    blocks: [
      { gridX: 1, gridY: 0, label: 'IN_A' },
      { gridX: 3, gridY: 0, label: 'IN_B' },
      { gridX: 4, gridY: 3, label: 'OUT_Y' },
      { gridX: 2, gridY: 2, label: 'AND_GATE' }
    ],
    frontier: [],
    // Congestion drops back to 0 (Clean Blue lines) because wires separated onto different track indices
    routedSegments: [
      { channelX: 1, channelY: 1, trackIndex: 0, congestion: 0.0 },
      { channelX: 2, channelY: 1, trackIndex: 0, congestion: 0.0 }, // First net stays on Track 0
      { channelX: 2, channelY: 1, trackIndex: 1, congestion: 0.0 }, // Second net ripped and replaced onto Track 1
      { channelX: 3, channelY: 1, trackIndex: 0, congestion: 0.0 },
      { channelX: 3, channelY: 2, trackIndex: 0, congestion: 0.0 },
      { channelX: 3, channelY: 3, trackIndex: 0, congestion: 0.0 }
    ],
    metrics: {
      totalWirelength: 16.0,
      timingCriticality: 0.41,
      totalCongestionCost: 0.0,
      aggregateCost: 16.0
    }
  },

  // =========================================================================
  // PHASE 6: COMPILATION COMPLETE
  // =========================================================================
  {
    phase: 'DONE',
    currentStepDescription: 'Bitstream verification complete! All signals are fully legal, routed, and ready to flash onto the physical FPGA array hardware.',
    blocks: [
      { gridX: 1, gridY: 0, label: 'IN_A' },
      { gridX: 3, gridY: 0, label: 'IN_B' },
      { gridX: 4, gridY: 3, label: 'OUT_Y' },
      { gridX: 2, gridY: 2, label: 'AND_GATE' }
    ],
    frontier: [],
    // The final complete, interconnected routing infrastructure layout
    routedSegments: [
      { channelX: 1, channelY: 1, trackIndex: 0, congestion: 0.0 },
      { channelX: 2, channelY: 1, trackIndex: 0, congestion: 0.0 },
      { channelX: 2, channelY: 1, trackIndex: 1, congestion: 0.0 },
      { channelX: 3, channelY: 1, trackIndex: 0, congestion: 0.0 },
      { channelX: 3, channelY: 2, trackIndex: 0, congestion: 0.0 },
      { channelX: 3, channelY: 3, trackIndex: 0, congestion: 0.0 },
      { channelX: 4, channelY: 3, trackIndex: 0, congestion: 0.0 }
    ],
    metrics: {
      totalWirelength: 16.0,
      timingCriticality: 0.41,
      totalCongestionCost: 0.0,
      aggregateCost: 16.0
    }
  }
];

  $: currentFrame = compilationTimeline[timelineIndex];
</script>

<main class="panel">
  <header class="control-center">
    <div class="meta">
      <h2>FPGA CAD Flow Visualizer</h2>
      <div class="phase-indicator phase-{currentFrame.phase}">{currentFrame.phase} PHASE</div>
    </div>
    
    <div class="navigator">
      <button on:click={() => {if (timelineIndex > 0) timelineIndex--}} disabled={timelineIndex === 0}>◀ Prev Step</button>
      <span class="ticker">Frame Timeline Matrix: <b>{timelineIndex + 1}</b> / {compilationTimeline.length}</span>
      <button on:click={() =>{ if (timelineIndex < compilationTimeline.length - 1) timelineIndex++}} disabled={timelineIndex === compilationTimeline.length - 1}>Next Step ▶</button>
    </div>
  </header>

  <div class="eda-terminal">
    <span class="prompt">info_log></span> {currentFrame.currentStepDescription}
  </div>

  <section class="cost-dashboard">
    <div class="stat"><span class="lbl">Aggregate Fabric Cost</span><span class="num active-num">{currentFrame.metrics.aggregateCost}</span></div>
    <div class="stat"><span class="lbl">Total Net Wirelength</span><span class="num">{currentFrame.metrics.totalWirelength}λ</span></div>
    <div class="stat"><span class="lbl">Worst Delay Metrics</span><span class="num">{currentFrame.metrics.timingCriticality} ns</span></div>
    <div class="stat"><span class="lbl">Congestion Overload Cost</span><span class="num">{currentFrame.metrics.totalCongestionCost}</span></div>
  </section>

  <FpgaCanvas dimensions={dimensions} state={currentFrame} />
</main>

<style>
  :global(body) {
    margin: 0;
    background: #020617;
    color: #f1f5f9;
    font-family: 'Courier New', Courier, monospace;
    padding: 24px;
  }
  .panel { display: flex; flex-direction: column; gap: 14px; }
  
  .control-center {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f172a;
    padding: 16px 20px;
    border-radius: 6px;
    border: 1px solid #1e293b;
  }
  .meta { display: flex; align-items: center; gap: 16px; }
  h2 { margin: 0; font-size: 1.2rem; font-weight: bold; }
  
  .phase-indicator {
    font-size: 11px;
    font-weight: bold;
    padding: 4px 10px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .phase-PLACING { background: #1e3a8a; color: #60a5fa; border: 1px solid #2563eb; }
  .phase-ROUTING { background: #3b1e54; color: #d946ef; border: 1px solid #a21caf; }
  .phase-DONE { background: #064e3b; color: #34d399; border: 1px solid #059669; }

  .navigator { display: flex; align-items: center; gap: 16px; }
  .ticker { min-width: 220px; text-align: center; font-size: 13px; }
  button {
    background: #1e293b;
    border: 1px solid #334155;
    color: white;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
  }
  button:hover:not(:disabled) { background: #334155; }
  button:disabled { opacity: 0.3; cursor: not-allowed; }

  .eda-terminal {
    background: #000;
    border: 1px solid #1e293b;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 12px;
    color: #cbd5e1;
    line-height: 1.4;
  }
  .eda-terminal .prompt { color: #10b981; font-weight: bold; }

  .cost-dashboard {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    background: #090d16;
  }
  .stat { display: flex; flex-direction: column; gap: 4px; border-left: 2px solid #1e293b; padding-left: 12px;}
  .stat .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; }
  .stat .num { font-size: 1.15rem; font-weight: bold; }
  .active-num { color: #3b82f6; }
</style>
