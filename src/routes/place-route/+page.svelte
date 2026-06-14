<script lang="ts">
  import { synthesizeVerilog } from './synthesisService'; // YoWASP Wrapper
  import type { RenderState, FabricDimensions } from './types';
  import FpgaCanvas from './fpga_canvas.svelte';          // Your PixiJS Canvas

  let dimensions: FabricDimensions = {
    clbWidth: 4,
    clbHeight: 4,
    channelCapacity: 4
  };

  // 2. Track minimum boundaries determined dynamically by the compiled circuit
  let minRequiredClbs = 1;
  let minRequiredIoPads = 4;
  let hasCompiledOnce = false;
  let showSettingsModal = false;

  // Sample Verilog state loaded into the editor by default
  let verilogCode = `module my_design(clk, clear, d, q, qbar);
  input clk, clear, d;
  output reg q, qbar;

  always @(posedge clk) begin
    if (clear) begin
      q <= 1'b0;
      qbar <= 1'b1;
    end else begin
      q <= d;
      qbar <= !d;
    end
  end
endmodule`;

  // Runtime compilation states
  let isCompiling = false;
  let consoleLog = "System idle. Input your behavioral Verilog and click 'Compile Netlist'.\n";
  
  // Timeline playback controller variables
  let timelineSteps: RenderState[] = [];
  let currentStepIndex = 0;

  // Reactive shorthand accessor to drive the PixiJS layout frame
  $: activeRenderState = timelineSteps[currentStepIndex] || null;

  /**
   * Evaluates the netlist components to define the physical threshold limits
   * required to accommodate the synthesis block parameters.
   */
  function calculateMinimumFabricRequirements(netlist: any) {
    const clbCount = netlist.nodes.filter((n: any) => n.type === 'CLB').length;
    const ioCount = netlist.nodes.filter((n: any) => n.type === 'INPUT' || n.type === 'OUTPUT').length;

    // Minimum matrix grid bounding calculation
    minRequiredClbs = Math.max(1, clbCount);
    minRequiredIoPads = Math.max(4, ioCount);

    consoleLog += `\n[TOPOLOGY] Base Requirements Computed:\n`;
    consoleLog += ` - Minimal Logic Elements (CLBs): ${minRequiredClbs}\n`;
    consoleLog += ` - Minimal Perimeter Package Pins: ${minRequiredIoPads}\n`;

    // Automatically expand the current canvas settings if they are smaller than the incoming netlist demands
    const currentClbCapacity = dimensions.clbWidth * dimensions.clbHeight;
    if (currentClbCapacity < minRequiredClbs) {
      const nextEdgeSize = Math.ceil(Math.sqrt(minRequiredClbs));
      dimensions.clbWidth = nextEdgeSize;
      dimensions.clbHeight = nextEdgeSize;
      consoleLog += `[WARNING] Current layout too small. Auto-expanding array core to ${nextEdgeSize}x${nextEdgeSize}.\n`;
    }
  }

  function runCadMockEngine(netlist: any): RenderState[] {
    // Generate placement array mock states using actual architectural matrix configurations
    const clbNodes = netlist.nodes.filter((n: any) => n.type === 'CLB');
    const ioNodes = netlist.nodes.filter((n: any) => n.type === 'INPUT' || n.type === 'OUTPUT');

    const mappedBlocks = [
      ...ioNodes.map((io: any, idx: number) => ({ gridX: 1 + (idx * 2), gridY: 0, label: io.id })),
      ...clbNodes.map((clb: any, idx: number) => ({ gridX: 2, gridY: 2 + (idx * 2), label: clb.id }))
    ];

    return [
      {
        phase: 'PLACING',
        currentStepDescription: 'Yosys netlist ingested. Inputs pinned to boundary pads. Core logic gates scattered randomly inside the matrix.',
        blocks: mappedBlocks,
        frontier: [],
        routedSegments: [],
        metrics: { totalWirelength: 24.5, timingCriticality: 0.85, totalCongestionCost: 0.0, aggregateCost: 24.5 }
      },
      {
        phase: 'DONE',
        currentStepDescription: 'Bitstream verification complete! All signals are fully legal, routed, and ready to flash onto the physical FPGA array hardware.',
        blocks: mappedBlocks,
        frontier: [],
        routedSegments: [
          { channelX: 1, channelY: 1, trackIndex: 0, congestion: 0.0 },
          { channelX: 2, channelY: 1, trackIndex: 0, congestion: 0.0 }
        ],
        metrics: { totalWirelength: 16.0, timingCriticality: 0.41, totalCongestionCost: 0.0, aggregateCost: 16.0 }
      }
    ];
  }

  async function handleCodeCompilation() {
    isCompiling = true;
    consoleLog = "[INFO] Spawning WebAssembly worker sandboxed execution container...\n";
    timelineSteps = [];
    currentStepIndex = 0;

    try {
      consoleLog += "[INFO] Synthesizing behavioral design using YoWASP Yosys engine...\n";
      const rawBlif = await synthesizeVerilog(verilogCode);
      consoleLog += "[SUCCESS] Generated Berkeley Logic Interchange Format netlist stream.\n";

      consoleLog += "[INFO] Tokenizing structural cells and netting interconnect dictionaries...\n";
      
      // MOCK PARSER DATA - Replace with your actual parseBlifToNetlist(rawBlif) return object
      const parsedNetlist = {
        name: "dff_design",
        nodes: [
          { id: 'clk', type: 'INPUT' },
          { id: 'clear', type: 'INPUT' },
          { id: 'd', type: 'INPUT' },
          { id: 'q', type: 'OUTPUT' },
          { id: 'qbar', type: 'OUTPUT' },
          { id: 'LUT_INV', type: 'CLB' },
          { id: 'DFF_Q', type: 'CLB' },
          { id: 'DFF_QBAR', type: 'CLB' }
        ]
      };
      
      consoleLog += `[INFO] Parsed successfully: ${parsedNetlist.nodes.length} discrete primitive nodes found.\n`;

      // Calculate minimal metrics before execution loop kicks in
      calculateMinimumFabricRequirements(parsedNetlist);
      hasCompiledOnce = true;

      consoleLog += "[INFO] Passing data vectors to SA Placer and Pathfinder router...\n";
      timelineSteps = runCadMockEngine(parsedNetlist);
      consoleLog += `[SUCCESS] Generated ${timelineSteps.length} CAD visualization frames. Ready for step playback.\n`;

    } catch (err: any) {
      consoleLog += `\n[CRITICAL ERROR] Compile pipeline broken:\n${err.message || err}\n`;
    } finally {
      isCompiling = false;
    }
  }

  // Triggered when user submits custom modifications via settings modal panel
  function updateFabricConfiguration() {
    showSettingsModal = false;
    consoleLog += `[SYSTEM] Fabric architecture scales adjusted manually to: Core Matrix [${dimensions.clbWidth}x${dimensions.clbHeight}], Interconnect Tracks: ${dimensions.channelCapacity}.\n`;
    // Re-run mock placement calculations if user resizes grid parameters after compilation
    if (timelineSteps.length > 0) {
      handleCodeCompilation();
    }
  }
</script>

<div class="ide-container">
  <div class="editor-pane">
    <div class="pane-header">
      <h2>Verilog HDL Source Editor</h2>
      <div class="action-row">
        <button class="settings-trigger-btn" on:click={() => showSettingsModal = true}>
          ⚙️ Fabric Settings
        </button>
        <button class="compile-btn" on:click={handleCodeCompilation} disabled={isCompiling}>
          {#if isCompiling}
            <span class="spinner"></span> Synthesizing Wasm...
          {:else}
            ⚡ Run Compile Engine
          {/if}
        </button>
      </div>
    </div>

    <textarea class="code-editor" bind:value={verilogCode} spellcheck="false" disabled={isCompiling}></textarea>

    <div class="console-box">
      <div class="console-header">Synthesis Output Console Log</div>
      <pre class="console-log">{consoleLog}</pre>
    </div>
  </div>

  <div class="visualizer-pane">
    <div class="pane-header">
      <h2>FPGA Co-Processor Layout Engine Viewport</h2>
      <div class="topology-badges">
        <span class="badge">Grid: {dimensions.clbWidth}x{dimensions.clbHeight} CLBs</span>
        <span class="badge">Tracks: W={dimensions.channelCapacity}</span>
      </div>
    </div>

    <div class="canvas-mount">
      {#if activeRenderState}
        <FpgaCanvas {dimensions} state={activeRenderState} />
      {:else}
        <div class="canvas-placeholder">
          <p>No active fabric layout frames loaded into cache.</p>
          <p class="sub">Click "Run Compile Engine" to view the interactive placement matrix layout traces.</p>
        </div>
      {/if}
    </div>

    {#if timelineSteps.length > 0}
      <div class="playback-controls">
        <div class="playback-meta">
          <span class="phase-badge {activeRenderState?.phase.toLowerCase()}">{activeRenderState?.phase}</span>
          <p class="step-desc"><strong>Step {currentStepIndex + 1}/{timelineSteps.length}:</strong> {activeRenderState?.currentStepDescription}</p>
        </div>
        
        <div class="slider-row">
          <button disabled={currentStepIndex === 0} on:click={() => currentStepIndex--}>◀ Prev</button>
          <input type="range" min="0" max={timelineSteps.length - 1} bind:value={currentStepIndex} />
          <button disabled={currentStepIndex === timelineSteps.length - 1} on:click={() => currentStepIndex++}>Next ▶</button>
        </div>

        {#if activeRenderState}
          <div class="metrics-grid">
            <div><span class="lbl">Wirelength:</span> {activeRenderState.metrics.totalWirelength} units</div>
            <div><span class="lbl">Timing Criticality:</span> {activeRenderState.metrics.timingCriticality}</div>
            <div><span class="lbl">Congestion Penalties:</span> {activeRenderState.metrics.totalCongestionCost}</div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

{#if showSettingsModal}
  <div class="modal-backdrop" on:click={() => showSettingsModal = false}>
    <div class="modal-card" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Adjust FPGA Hardware Architecture Specifications</h3>
        <button class="close-cross" on:click={() => showSettingsModal = false}>&times;</button>
      </div>

      <div class="modal-body">
        {#if hasCompiledOnce}
          <div class="alert-banner">
            <strong>📋 Current Netlist Requirements:</strong> Requires a minimum layout footprint of 
            <span class="highlight">{minRequiredClbs} CLB cells</span> and <span class="highlight">{minRequiredIoPads} Peripheral I/O pins</span> to complete valid placement moves.
          </div>
        {:else}
          <div class="alert-banner info">
            💡 Run a compilation pass first to let the engine compute the minimum hardware asset constraints.
          </div>
        {/if}

        <div class="form-group">
          <label for="clb-width">
            Core Matrix Width: <strong>{dimensions.clbWidth} Blocks</strong>
          </label>
          <input 
            type="range" 
            id="clb-width"
            min="1" 
            max="16" 
            step="1" 
            bind:value={dimensions.clbWidth} 
          />
        </div>

        <div class="form-group">
          <label for="clb-height">
            Core Matrix Height: <strong>{dimensions.clbHeight} Blocks</strong>
          </label>
          <input 
            type="range" 
            id="clb-height"
            min="1" 
            max="16" 
            step="1" 
            bind:value={dimensions.clbHeight} 
          />
        </div>

        <div class="form-group">
          <label for="channel-capacity">
            Channel Capacity Routing Density (W): <strong>{dimensions.channelCapacity} Tracks</strong>
          </label>
          <input 
            type="range" 
            id="channel-capacity"
            min="2" 
            max="12" 
            step="2" 
            bind:value={dimensions.channelCapacity} 
          />
          <span class="input-tip">Increasing track allocation increases physical spacing parameters inside routing channels.</span>
        </div>

        {#if hasCompiledOnce && (dimensions.clbWidth * dimensions.clbHeight < minRequiredClbs)}
          <div class="error-banner">
            ⚠️ <strong>Illegal Grid Configuration:</strong> Your selected dimensions offer only {dimensions.clbWidth * dimensions.clbHeight} cell locations, but your design demands at least {minRequiredClbs} CLB positions.
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => showSettingsModal = false}>Cancel</button>
        <button 
          class="btn-primary" 
          on:click={updateFabricConfiguration}
          disabled={hasCompiledOnce && (dimensions.clbWidth * dimensions.clbHeight < minRequiredClbs)}
        >
          Apply Hardware Topology Blueprint
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Base Layout Extensions */
  .action-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .settings-trigger-btn {
    background: #334155;
    color: #f1f5f9;
    border: 1px solid #475569;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  .settings-trigger-btn:hover { background: #475569; }

  .topology-badges {
    display: flex;
    gap: 6px;
  }
  .topology-badges .badge {
    font-size: 11px;
    background: #020617;
    color: #38bdf8;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    border: 1px solid #1e293b;
  }

  /* Modal Sheet System Style Rules */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(2, 6, 23, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-card {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    width: 520px;
    max-width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }
  .modal-header h3 { margin: 0; font-size: 15px; color: #f8fafc; font-weight: 600; }
  .close-cross { background: transparent; border: none; color: #94a3b8; font-size: 22px; cursor: pointer; }
  .close-cross:hover { color: #f8fafc; }

  .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 18px; }

  .alert-banner {
    background: #1e3a8a;
    border: 1px solid #2563eb;
    color: #bfdbfe;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
  }
  .alert-banner.info { background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; }
  .alert-banner .highlight { color: #38bdf8; font-weight: bold; }

  .error-banner {
    background: #7f1d1d;
    border: 1px solid #dc2626;
    color: #fca5a5;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .form-group label { font-size: 13px; color: #cbd5e1; }
  .form-group label strong { color: #38bdf8; }
  .form-group input[type="range"] { accent-color: #2563eb; cursor: pointer; width: 100%; }
  .input-tip { font-size: 11px; color: #64748b; margin-top: -2px; }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px;
    background: #1e293b;
    border-top: 1px solid #334155;
  }
  .modal-footer button { padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; }
  .btn-secondary { background: #334155; color: #cbd5e1; }
  .btn-secondary:hover { background: #475569; }
  .btn-primary { background: #2563eb; color: white; }
  .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
  .btn-primary:disabled { background: #475569; color: #94a3b8; cursor: not-allowed; }

  /* Copy original style definitions from your initial script below... */
  .ide-container {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 16px;
    width: 100%;
    max-width: 1400px;
    height: 820px;
    margin: 0 auto;
    background: #020617;
    color: #f8fafc;
    font-family: system-ui, sans-serif;
    box-sizing: border-box;
  }
  .editor-pane, .visualizer-pane { display: flex; flex-direction: column; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; }
  .pane-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #1e293b; border-bottom: 1px solid #334155; }
  .pane-header h2 { font-size: 14px; font-weight: 600; margin: 0; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em; }
  .code-editor { flex: 1; background: #090d16; color: #38bdf8; font-family: 'Fira Code', 'Courier New', monospace; font-size: 13px; line-height: 1.6; padding: 16px; border: none; resize: none; outline: none; border-bottom: 1px solid #1e293b; }
  .compile-btn { background: #2563eb; color: white; font-weight: 600; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 8px; transition: background 0.2s; }
  .compile-btn:hover:not(:disabled) { background: #1d4ed8; }
  .compile-btn:disabled { background: #475569; cursor: not-allowed; }
  .console-box { height: 220px; display: flex; flex-direction: column; background: #020617; }
  .console-header { font-size: 11px; text-transform: uppercase; background: #0f172a; padding: 6px 16px; color: #64748b; font-weight: bold; border-top: 1px solid #1e293b; }
  .console-log { margin: 0; padding: 12px 16px; font-family: monospace; font-size: 12px; color: #4ade80; overflow-y: auto; flex: 1; white-space: pre-wrap; }
  .canvas-mount { flex: 1; position: relative; background: #090d16; display: flex; justify-content: center; align-items: center; }
  .canvas-placeholder { text-align: center; color: #475569; padding: 32px; }
  .canvas-placeholder .sub { font-size: 12px; margin-top: 8px; color: #334155; }
  .playback-controls { background: #0f172a; border-top: 1px solid #1e293b; padding: 16px; }
  .playback-meta { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
  .phase-badge { font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
  .phase-badge.placing { background: #1e3a8a; color: #93c5fd; }
  .phase-badge.routing { background: #78350f; color: #fde68a; }
  .phase-badge.done { background: #064e3b; color: #a7f3d0; }
  .step-desc { font-size: 13px; margin: 0; color: #e2e8f0; line-height: 1.4; }
  .slider-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .slider-row input[type="range"] { flex: 1; accent-color: #3b82f6; cursor: pointer; }
  .slider-row button { background: #334155; color: #f8fafc; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .slider-row button:disabled { opacity: 0.3; cursor: not-allowed; }
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); background: #020617; padding: 8px 12px; border-radius: 4px; font-size: 11px; font-family: monospace; color: #94a3b8; border: 1px solid #1e293b; }
  .metrics-grid .lbl { color: #cbd5e1; font-weight: bold; }
  .spinner { width: 12px; height: 12px; border: 2px solid #ffffff; border-bottom-color: transparent; border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
  @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
