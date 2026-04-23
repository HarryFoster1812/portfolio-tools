<script lang="ts">
    import { onMount } from "svelte";
    import { initWasm, isValidFormula, Engine } from "./engine";
    import Viz from 'viz.js';
    import { Module, render } from 'viz.js/full.render.js';

    let input = "";
    let isValid = false;
    let engine: Engine | null = null;
    let state: any = null;
    let ordering: string[] = [];
    let viz = new Viz({ Module, render });
    let stategraphs: String[] = [];
    let svg: String | null = null;

    let currentScope: 'Obdd' | 'Integrate' = 'Obdd';
    let currentLine: number | null = 0;
    let currentBlock: string = "preprocess";

    // Mobile panel state: 'graph' | 'algorithm' | 'stack'
    let mobilePanel: 'graph' | 'algorithm' | 'stack' = 'graph';

    let showHelp = false;

    const syntaxRules = [
        { symbol: "T, F", desc: "Constants (True, False)" },
        { symbol: "!", desc: "NOT (Negation)" },
        { symbol: "&", desc: "AND (Conjunction)" },
        { symbol: "|", desc: "OR (Disjunction)" },
        { symbol: "->", desc: "Implication" },
        { symbol: "<->", desc: "Bi-conditional" },
        { symbol: "( )", desc: "Parentheses for precedence" }
    ];

    const stepUIMap = {
      Obdd: {
        Simplify: { block: "preprocess", line: 1 },
        CheckBottom: { block: "base-case", line: 2 },
        CheckTop: { block: "base-case", line: 3 },
        ChooseVariable: { block: "decompose", line: 4 },
        RecurseLow: { block: "recurse", line: 5 },
        RecurseHigh: { block: "recurse", line: 6 },
        CallIntegrate: { block: "merge", line: 7 },
        Return: { block: "exit" }
      },
      Integrate: {
        CheckEqual: { block: "fast-path", line: 1 },
        LookupNode: { block: "memo", line: 2 },
        CreateNode: { block: "allocate", line: 3 },
        Return: { block: "exit" }
      }
    };

    const functions = {
        Obdd: [
            "obdd(F):",
            "  F := simplify(F)",
            "  if F = ⊥ return 0",
            "  if F = ⊤ return 1",
            "  p := max_variable(F)",
            "  n1 := obdd(F[p=0])",
            "  n2 := obdd(F[p=1])",
            "  return integrate(n1, p, n2, D)"
        ],
        Integrate: [
            "integrate(n1, p, n2, D):",
            "  if n1 = n2 return n1",
            "  if D contains node(p, n1, n2):",
            "    return existing n",
            "  n := D.create_node(p, n1, n2)",
            "  return n"
        ]
    };

    onMount(async () => {
        await initWasm();
    });

    function handleInput(e: Event) {
        input = (e.target as HTMLInputElement).value;
        isValid = isValidFormula(input);
        if (isValid) ordering = extractVariables(input);
    }

    function extractVariables(formula: string): string[] {
        return [...new Set(
            (formula.match(/[A-Z0-9a-z]+/g) || [])
                .filter((v: string) => v !== "T" && v !== "F")
        )];
    }

    async function updateGraph() {
      if (!state) return;

      const nodeColor = "#abb2bf";
      const edgeColor = "#5c6370";
      const highlight0 = "#e06c75";
      const highlight1 = "#98c379";

      let nodes = "";
      let edges = "";
      let ranks = "";

      for (let i = 0; i < state.nodes.length; i++) {
        const n = state.nodes[i];
        if (n.id == 0 || n.id == 1) continue;
        nodes += `id${n.id} [label="${n.var}", color="${nodeColor}", fontcolor="${nodeColor}"];\n`;
        edges += `id${n.id} -> id${n.left} [style=dashed, label="0", color="${edgeColor}", fontcolor="${edgeColor}"];\n`;
        edges += `id${n.id} -> id${n.right} [style=solid, label="1", color="${nodeColor}", fontcolor="${nodeColor}"];\n`;
      }

      let levels: String[][] = [];
      for (let n of state.nodes) {
        if (n.id == 0 || n.id == 1) continue;
        let index = ordering.indexOf(n.var);
        if (!levels[index]) levels[index] = [];
        levels[index].push(`id${n.id}`);
      }

      for (let level in levels) {
        ranks += `{ rank=same; ${levels[level]} }\n`;
      }

      svg = await viz.renderString(`
        digraph {
          bgcolor="transparent";
          rankdir=TB;
          node [shape=circle, fontname="Helvetica", penwidth=2];
          edge [fontname="Helvetica", fontsize=10];
          ${nodes}
          id0 [shape=box, label="0", color="${highlight0}", fontcolor="${highlight0}"];
          id1 [shape=box, label="1", color="${highlight1}", fontcolor="${highlight1}"];
          ${ranks}
          ${edges}
          { rank=same; id0; id1; };
        }
      `);
      stategraphs.push(svg);
    }

    function updateUIState() {
        if (!state || !state.execution_stack.length) return;
        const frame = state.execution_stack.at(-1);
        currentScope = frame.type;
        const stepInfo = stepUIMap[currentScope]?.[frame.step];
        if (stepInfo) {
            currentBlock = stepInfo.block;
            currentLine = stepInfo.line !== undefined ? stepInfo.line : null;
        }
    }

    function run() {
        if (!isValid) return;
        engine = new Engine(input, ordering);
        stategraphs = [];
        state = engine.getState();
        updateUIState();
        updateGraph();
        // On mobile, jump to graph view after running
        mobilePanel = 'graph';
    }

    function stepForward() {
        if (!engine) return;
        engine.step();
        state = engine.getState();
        updateUIState();
        updateGraph();
    }

    function stepBack() {
        if (!engine) return;
        engine.stepBack();
        state = engine.getState();
        updateUIState();
        updateGraph();
    }

    function goToStart() {
        if (!engine) return;
        while (true) {
            try { engine.stepBack(); }
            catch (e) { break; }
        }
        state = engine.getState();
        updateUIState();
        updateGraph();
    }

    function goToEnd() {
        if (!engine) return;
        while (true) {
            try { engine.step(); }
            catch (e) { break; }
        }
        engine.stepBack();
        state = engine.getState();
        updateUIState();
        updateGraph();
    }

    function moveUp(index: number) {
        if (index === 0) return;
        [ordering[index - 1], ordering[index]] = [ordering[index], ordering[index - 1]];
    }

    function moveDown(index: number) {
        if (index === ordering.length - 1) return;
        [ordering[index + 1], ordering[index]] = [ordering[index], ordering[index + 1]];
    }
</script>

<div class="app">
    <!-- ── HEADER ── -->
    <header>
        <div class="header-top">
            <div class="logo">OBDD <small>Visualiser</small></div>
            <button class="help-trigger" on:click={() => showHelp = true} title="Syntax Help">?</button>
            <div class="input-bar">
                <input
                    class:invalid={!isValid && input.length > 0}
                    placeholder="e.g. A & B"
                    on:input={handleInput}
                />
                <button class="btn-primary" on:click={run} disabled={!isValid}>Run</button>
            </div>
        </div>
        <div class="step-controls">
            <button on:click={goToStart} disabled={!state} title="Go to start">⏮</button>
            <button on:click={stepBack} disabled={!state} title="Step back">◀</button>
            <span class="step-label">Step {state?.step_number ?? 0}</span>
            <button on:click={stepForward} disabled={!state} title="Step forward">▶</button>
            <button on:click={goToEnd} disabled={!state} title="Go to end">⏭</button>
        </div>
    </header>

    <!-- ── MOBILE NAV TABS ── -->
    <nav class="mobile-nav">
        <button class:active={mobilePanel === 'algorithm'} on:click={() => mobilePanel = 'algorithm'}>
            <span class="nav-icon">⌥</span> Algorithm
        </button>
        <button class:active={mobilePanel === 'graph'} on:click={() => mobilePanel = 'graph'}>
            <span class="nav-icon">◉</span> Graph
        </button>
        <button class:active={mobilePanel === 'stack'} on:click={() => mobilePanel = 'stack'}>
            <span class="nav-icon">≡</span> Stack
        </button>
    </nav>

    <!-- ── MAIN CONTENT ── -->
    <main>
        <!-- LEFT PANEL: Variable Ordering + Algorithm -->
        <aside class="panel panel-left" class:mobile-hidden={mobilePanel !== 'algorithm'}>

            <section class="variable-section">
                <h3>Variable Ordering</h3>
                {#if ordering.length === 0}
                    <p class="dim">Enter a formula to see variables.</p>
                {:else}
                    <div class="variable-list">
                        {#each ordering as variable, i}
                            <div class="order-item">
                                <span class="var-label">{variable}</span>
                                <div class="btn-group">
                                    <button on:click={() => moveUp(i)} disabled={i === 0} aria-label="Move up">↑</button>
                                    <button on:click={() => moveDown(i)} disabled={i === ordering.length - 1} aria-label="Move down">↓</button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>

            <section class="code-flow">
                <div class="section-header">
                    <h3>Algorithm</h3>
                    {#if state}
                        <span class="block-badge">{currentBlock.replace('-', ' ')}</span>
                    {/if}
                </div>

                <div class="tabs">
                    <button class:active={currentScope === 'Obdd'} on:click={() => currentScope = 'Obdd'}>obdd(F)</button>
                    <button class:active={currentScope === 'Integrate'} on:click={() => currentScope = 'Integrate'}>integrate(...)</button>
                </div>

                <div class="code-box">
                    {#each functions[currentScope] as line, i}
                        <div class="code-line" class:highlight={i === currentLine}>
                            <span class="arrow">{i === currentLine ? '▶' : ''}</span>
                            <span class="line-num">{i + 1}</span>
                            <code>{line}</code>
                        </div>
                    {/each}
                </div>
            </section>
        </aside>

        <!-- CENTER: Graph Visualisation -->
        <section class="visualisation" class:mobile-hidden={mobilePanel !== 'graph'}>
            {#if svg}
                <div class="svg-container">
                    {@html svg}
                </div>
            {:else}
                <div class="empty-state">
                    <div class="empty-icon">◎</div>
                    <p>Enter a formula and press <strong>Run</strong> to visualise</p>
                </div>
            {/if}
        </section>

        <!-- RIGHT PANEL: Stack Frames -->
        <aside class="panel panel-right" class:mobile-hidden={mobilePanel !== 'stack'}>
            <h3>Stack Frames</h3>
            <div class="stack-list">
                {#if state && state.execution_stack}
                    {#each state.execution_stack.toReversed() as frame, i}
                        {@const depth = state.execution_stack.length - 1 - i}
                        <div class="stack-card" style="opacity: {Math.max(0.4, 1 - i * 0.15)}">
                            <div class="stack-header">
                                <span class="func-name">{frame.type}</span>
                                <span class="depth">Depth {depth}</span>
                            </div>
                            <div class="stack-body">
                                {#each Object.entries(frame).filter(([key]) => key !== 'var_index' && key !== 'type' && key !== 'step') as [key, value]}
                                    <div class="var-pill">
                                        <span class="key">{key}</span>
                                        <span class="val">{value}</span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                {:else}
                    <p class="dim">Engine idle…</p>
                {/if}
            </div>
        </aside>

    {#if showHelp}
        <div class="modal-backdrop" on:click|self={() => showHelp = false}>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Logic Syntax Help</h3>
                    <button class="close-btn" on:click={() => showHelp = false}>&times;</button>
                </div>
                
                <div class="modal-body">
                    <p>Use variables (A, B, p1...) and the following operators:</p>
                    
                    <div class="syntax-grid">
                        {#each syntaxRules as rule}
                            <div class="syntax-row">
                                <code class="syntax-symbol">{rule.symbol}</code>
                                <span class="syntax-desc">{rule.desc}</span>
                            </div>
                        {/each}
                    </div>

                    <div class="example-box">
                        <small>Example:</small>
                        <code>(A & B) -> !C</code>
                    </div>
                </div>
            </div>
        </div>
    {/if}
    </main>
</div>

<style>
    /* ── TOKENS ── */
    :global(*) { box-sizing: border-box; }
    :global(body) {
      margin: 0;
      background: #000;
      color: #e5e7eb;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
      overscroll-behavior: none;
    }

    /* ── APP SHELL ── */
    .app {
        display: flex;
        flex-direction: column;
        height: 100dvh; /* dynamic viewport height – handles iOS toolbar */
        overflow: hidden;
    }

    /* ── HEADER ── */
    header {
        flex-shrink: 0;
        background: #0a0a0a;
        border-bottom: 1px solid #27272a;
        padding: 0.6rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .header-top {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .logo {
        font-weight: bold;
        color: #61afef;
        font-size: 1.1rem;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .logo small { color: #5c6370; font-weight: normal; }

    .input-bar {
        display: flex;
        gap: 8px;
        flex: 1;
        min-width: 0;
    }

    input {
        flex: 1;
        min-width: 0;
        background: #282c34;
        border: 1px solid #3e4451;
        color: #abb2bf;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.9rem;
        /* Prevent iOS zoom on focus (needs font-size >= 16px in some cases) */
        font-size: max(16px, 0.9rem);
    }
    input.invalid { border-color: #e06c75; }
    input:focus { outline: none; border-color: #61afef; }

    .step-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
    }

    .step-controls button {
        /* Larger tap targets on mobile */
        min-width: 40px;
        min-height: 36px;
        font-size: 1rem;
    }

    .step-label {
        font-family: monospace;
        color: #d19a66;
        font-size: 0.85rem;
        padding: 0 4px;
        white-space: nowrap;
    }

    /* ── MOBILE NAV ── */
    .mobile-nav {
        display: none; /* shown via media query */
        flex-shrink: 0;
        background: #0a0a0a;
        border-bottom: 1px solid #27272a;
    }

    .mobile-nav button {
        flex: 1;
        padding: 10px 4px;
        border-radius: 0;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #5c6370;
        font-size: 0.75rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        cursor: pointer;
        min-height: 48px; /* WCAG touch target */
    }
    .mobile-nav button.active {
        color: #60a5fa;
        border-bottom-color: #3b82f6;
    }
    .nav-icon { font-size: 1rem; }

    /* ── MAIN GRID ── */
    main {
        display: grid;
        grid-template-columns: 280px 1fr 250px;
        flex: 1;
        overflow: hidden;
    }

    /* ── PANELS ── */
    .panel {
        background: #0a0a0a;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .panel-left  { border-right: 1px solid #27272a; }
    .panel-right { border-left:  1px solid #27272a; }

    /* Mobile-hidden: controlled by mobile nav */
    /* (hidden on mobile when not the active tab, but always shown on desktop) */

    /* ── VARIABLE SECTION ── */
    .variable-section {
        display: flex;
        flex-direction: column;
        max-height: 38%;
        margin-bottom: 1.2rem;
    }

    .variable-list {
        overflow-y: auto;
        padding-right: 4px;
    }
    .variable-list::-webkit-scrollbar { width: 4px; }
    .variable-list::-webkit-scrollbar-thumb { background: #3e4451; border-radius: 4px; }

    .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #21252b;
        padding: 8px 10px;
        border-radius: 6px;
        margin-bottom: 6px;
        gap: 8px;
    }

    .var-label { font-family: monospace; color: #fbbf24; }

    .btn-group { display: flex; gap: 4px; }
    .btn-group button {
        min-width: 32px;
        min-height: 32px;
        padding: 4px 8px;
    }

    /* ── CODE FLOW ── */
    .code-flow {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    .section-header h3 { margin-bottom: 0; }

    .block-badge {
        font-size: 0.65rem;
        background: #3e4451;
        color: #61afef;
        padding: 2px 8px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border: 1px solid rgba(97, 175, 239, 0.3);
        white-space: nowrap;
    }

    .tabs {
        display: flex;
        gap: 2px;
        margin-bottom: 8px;
    }
    .tabs button {
        flex: 1;
        background: #21252b;
        border-radius: 4px 4px 0 0;
        font-size: 0.7rem;
        padding: 6px 4px;
        border-bottom: 2px solid transparent;
        min-height: 36px;
    }
    .tabs button.active {
        background: #282c34;
        border-bottom-color: #61afef;
        color: #61afef;
    }

    .code-box {
        background: #0a0a0a;
        padding: 10px 0;
        border-radius: 4px;
        font-family: 'Fira Code', 'Consolas', monospace;
        overflow-x: auto;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    .code-box::-webkit-scrollbar { height: 5px; width: 4px; }
    .code-box::-webkit-scrollbar-thumb { background: #3e4451; border-radius: 10px; }

    .code-line {
        display: flex;
        gap: 10px;
        font-size: 0.82rem;
        padding: 4px 12px;
        align-items: flex-start;
        min-width: max-content;
        transition: background 0.15s ease;
    }
    .code-line.highlight {
        background: rgba(59, 130, 246, 0.08);;
        border-left: 2px solid #3b82f6;
        padding-left: 9px;
    }
    .code-line code { white-space: pre; color: #abb2bf; }

    .arrow {
        color: #e06c75;
        width: 14px;
        min-width: 14px;
        font-size: 0.72rem;
        display: inline-block;
    }
    .line-num {
        color: #4b5263;
        font-size: 0.72rem;
        width: 18px;
        min-width: 18px;
        text-align: right;
        user-select: none;
    }

    /* ── VISUALISATION ── */
    .visualisation {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: auto;
        padding: 20px;
        background: #000;
    }

    .svg-container {
        max-width: 100%;
        max-height: 100%;
    }
    /* Make the SVG itself scale correctly */
    .svg-container :global(svg) {
        max-width: 100%;
        height: auto;
    }

    .empty-state {
        color: #5c6370;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    .empty-icon { font-size: 3rem; opacity: 0.4; }
    .empty-state p { font-size: 0.9rem; margin: 0; }
    .empty-state strong { color: #61afef; }

    /* ── STACK FRAMES ── */
    .stack-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        flex: 1;
        padding-right: 4px;
    }
    .stack-list::-webkit-scrollbar { width: 4px; }
    .stack-list::-webkit-scrollbar-thumb { background: #3e4451; border-radius: 4px; }

    .stack-card {
        background: #0a0a0a;
        border: 1px solid #27272a;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
        transition: opacity 0.2s ease;
    }

    .stack-header {
        background: #111;
        padding: 5px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .func-name { color: #61afef; font-weight: bold; font-size: 0.8rem; }

    .depth {
        font-size: 0.6rem;
        background: #181a1f;
        color: #abb2bf;
        padding: 2px 6px;
        border-radius: 10px;
    }

    .stack-body { padding: 8px 10px; }

    .var-pill {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        padding: 3px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .var-pill:last-child { border-bottom: none; }
    .key { color: #a78bfa; font-weight: bold; }
    .val { color: #4ade80; }

    /* ── SHARED ── */
    h3 {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #5c6370;
        margin: 0 0 0.75rem;
        letter-spacing: 1px;
    }

    button {
        background: #3e4451;
        color: #abb2bf;
        border: none;
        padding: 5px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.82rem;
        transition: background 0.15s ease, color 0.15s ease;
        /* Tap highlight on mobile */
        -webkit-tap-highlight-color: transparent;
    }
    button:hover:not(:disabled) {
      background: #111;
      border-color: #3b82f6;
      color: #60a5fa;
    }
    button:active:not(:disabled) { background: #61afef22; }
    button:disabled { opacity: 0.3; cursor: not-allowed; }

    .btn-primary {
      background: #3b82f6;
      color: black;
    }
    .btn-primary:hover {
      background: #60a5fa;
    }
    .btn-primary:disabled { background: #3e4451; color: #5c6370; }

    .dim { color: #5c6370; font-size: 0.8rem; margin: 0; }

/* ── HELP MODAL ── */
    .help-trigger {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #282c34;
        color: #61afef;
        border: 1px solid #3e4451;
        font-weight: bold;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    }

    .modal-content {
        background: #111;
        border: 1px solid #3e4451;
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        animation: scaleIn 0.2s ease-out;
    }

    @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }

    .modal-header {
        padding: 1rem;
        border-bottom: 1px solid #27272a;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 { margin: 0; color: #61afef; }

    .close-btn {
        background: transparent;
        font-size: 1.5rem;
        padding: 0;
        color: #5c6370;
    }

    .modal-body { padding: 1.25rem; }
    .modal-body p { font-size: 0.9rem; color: #abb2bf; margin-top: 0; }

    .syntax-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 1.5rem;
    }

    .syntax-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px;
        background: #1a1d23;
        border-radius: 6px;
    }

    .syntax-symbol {
        color: #fbbf24;
        font-weight: bold;
        min-width: 60px;
        font-size: 1rem;
    }

    .syntax-desc { font-size: 0.85rem; color: #e5e7eb; }

    .example-box {
        background: #000;
        padding: 10px;
        border-radius: 6px;
        border: 1px dashed #3e4451;
        text-align: center;
    }
    
    .example-box small { display: block; color: #5c6370; margin-bottom: 4px; }
    .example-box code { color: #98c379; font-size: 1rem; }
    /* ─────────────────────────────────────────────
       RESPONSIVE – MOBILE BREAKPOINT (≤ 768px)
    ───────────────────────────────────────────── */
    @media (max-width: 768px) {
        /* Show mobile nav */
        .mobile-nav { display: flex; }

        /* Collapse 3-column grid to single column */
        main {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr;
            overflow: hidden;
        }

        /* All panels take full area; visibility toggled by .mobile-hidden */
        .panel, .visualisation {
            grid-column: 1;
            grid-row: 1;
        }

        .panel-left, .panel-right {
          border-right: 1px solid #27272a;
        }

        /* Hide panels that aren't selected on mobile */
        .mobile-hidden {
            display: none !important;
        }

        /* Variable section can take more height on mobile */
        .variable-section {
            max-height: 45%;
        }

        /* Full-width input */
        .input-bar { flex: 1 1 100%; }

        /* Compact header */
        header { padding: 0.5rem 0.75rem; }

        .logo { font-size: 1rem; }

        /* Step controls fill width evenly */
        .step-controls {
            width: 100%;
            justify-content: space-between;
        }
        .step-controls button {
            flex: 1;
            max-width: 52px;
        }
    }

    /* ── SMALL PHONE (≤ 380px) ── */
    @media (max-width: 380px) {
        .code-line { font-size: 0.75rem; }
        input { font-size: 16px; } /* prevent iOS zoom */
    }
</style>
