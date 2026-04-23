<script lang="ts">
    import { onMount } from "svelte";
    import { initWasm, isValidFormula, Engine } from "./engine";
    import Viz from 'viz.js';
    import { Module, render } from 'viz.js/full.render.js';

    // Core State (Maintained)
    let input = "";
    let isValid = false;
    let engine: Engine | null = null;
    let state: any = null;
    let ordering: string[] = [];
    let viz = new Viz({ Module, render });
    let stategraphs: String[] = [];
    let svg: String | null = null; 

    // Future-proofing state
    let currentLine = 2; // For your upcoming arrow feature

    onMount(async () => {
        await initWasm();
    });

    function handleInput(e: Event) {
        input = (e.target as HTMLInputElement).value;
        isValid = isValidFormula(input);
        if (isValid) ordering = extractVariables(input);
    }

    function extractVariables(formula: string): string[] {
        const matches = formula.match(/[A-Z]/g);
        return matches ? [...new Set(matches)] : [];
    }

    async function updateGraph() {
      if(!state) return;
      if(stategraphs.length < state.step_number){ svg = stategraphs[state.step_number];return;}
      
      // Theming the Graphviz output for Dark Mode
      const nodeColor = "#abb2bf";
      const edgeColor = "#5c6370";
      const highlight0 = "#e06c75"; // Soft Red
      const highlight1 = "#98c379"; // Soft Green

      let nodes="";
      let edges="";
      let ranks="";

      for (let i = 0; i < state.nodes.length; i++) {
        const n = state.nodes[i];
        if(n.id == 0 || n.id == 1) continue;
        nodes += `id${n.id} [label="${n.var}", color="${nodeColor}", fontcolor="${nodeColor}"];\n`;
        edges += `id${n.id} -> id${n.left} [style=dashed, label="0", color="${edgeColor}", fontcolor="${edgeColor}"];\n`;
        edges += `id${n.id} -> id${n.right} [style=solid, label="1", color="${nodeColor}", fontcolor="${nodeColor}"];\n`;
      }

      let levels: String[][] = [];
      for (let n of state.nodes) {
        if(n.id ==0 || n.id == 1) continue;
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

    // Core logic functions kept exactly as provided
    function run() {
        if (!isValid) return;
        engine = new Engine(input, ordering);
        stategraphs = [];
        state = engine.getState();
        updateGraph();
    }

    function stepForward() {
        if (!engine) return;
        engine.step();
        state = engine.getState();
        updateGraph();
    }

    function stepBack() {
        if (!engine) return;
        engine.stepBack();
        state = engine.getState();
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
    <header>
        <div class="logo">OBDD <small>Visualiser</small></div>
        <div class="input-bar">
            <input
                class:invalid={!isValid && input.length > 0}
                placeholder="Enter formula (e.g. A & B)"
                on:input={handleInput}
            />
            <button class="btn-primary" on:click={run} disabled={!isValid}>Run</button>
        </div>
        <div class="step-controls">
            <button on:click={stepBack} disabled={!state}>Back</button>
            <span class="step-label">Step {state?.step_number ?? 0}</span>
            <button on:click={stepForward} disabled={!state}>Next</button>
        </div>
    </header>

    <main>
        <aside class="panel">
            <section>
                <h3>Variable Ordering</h3>
                {#each ordering as variable, i}
                    <div class="order-item">
                        <span>{variable}</span>
                        <div class="btn-group">
                            <button on:click={() => moveUp(i)} disabled={i === 0}>↑</button>
                            <button on:click={() => moveDown(i)} disabled={i === ordering.length - 1}>↓</button>
                        </div>
                    </div>
                {/each}
            </section>

            <section class="code-flow">
                <h3>Algorithm</h3>
                <div class="code-box">
                    {#each ['apply(f, g)', '  if (terminal) return ...', '  res = new Node()', '  return res'] as line, i}
                        <div class="code-line" class:active={i === currentLine}>
                            <span class="arrow">{i === currentLine ? '▶' : ''}</span>
                            <code>{line}</code>
                        </div>
                    {/each}
                </div>
            </section>
        </aside>

        <section class="visualisation">
            {#if svg}
                <div class="svg-container">
                    {@html svg}
                </div>
            {:else}
                <div class="empty-state">Initialize to view BDD</div>
            {/if}
        </section>

        <aside class="panel">
            <h3>Stack Frame</h3>
            {#if state}
                <div class="stack-card">
                    <div class="stack-header">Function: build()</div>
                    <div class="stack-body">
                        {#each state.nodes.slice(-3) as node}
                             <div class="stack-var">
                                <strong>id_{node.id}:</strong> {node.var ?? 'T'}
                             </div>
                        {/each}
                    </div>
                </div>
            {:else}
                <p class="dim">No active frames</p>
            {/if}
        </aside>
    </main>
</div>

<style>
    :global(body) {
        margin: 0;
        background-color: #1e2227;
        color: #abb2bf;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .app {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
        background: #21252b;
        border-bottom: 1px solid #181a1f;
    }

    .logo { font-weight: bold; color: #61afef; font-size: 1.2rem; }
    .logo small { color: #5c6370; font-weight: normal; }

    .input-bar { display: flex; gap: 10px; }
    input {
        background: #282c34;
        border: 1px solid #181a1f;
        color: #abb2bf;
        padding: 6px 12px;
        border-radius: 4px;
        width: 250px;
    }
    input.invalid { border-color: #e06c75; }

    main {
        display: grid;
        grid-template-columns: 280px 1fr 250px;
        flex-grow: 1;
        overflow: hidden;
    }

    .panel {
        background: #282c34;
        padding: 1rem;
        border-right: 1px solid #181a1f;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .panel:last-child { border-right: none; border-left: 1px solid #181a1f; }

    h3 { font-size: 0.8rem; text-transform: uppercase; color: #5c6370; margin-bottom: 1rem; letter-spacing: 1px; }

    .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #21252b;
        padding: 6px 10px;
        border-radius: 4px;
        margin-bottom: 6px;
    }

    /* Code & Arrow Styles */
    .code-box { background: #1e2227; padding: 10px; border-radius: 4px; font-family: monospace; }
    .code-line { display: flex; gap: 8px; font-size: 0.85rem; height: 1.2rem; align-items: center; }
    .code-line.active { background: #2c313a; color: #61afef; }
    .arrow { color: #e06c75; width: 12px; font-size: 0.7rem; }

    /* Visualisation Area */
    .visualisation {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: auto;
        padding: 20px;
    }
    .svg-container { max-width: 100%; }
    .empty-state { color: #5c6370; font-style: italic; }

    /* Stack Frame Styles */
    .stack-card { background: #21252b; border: 1px solid #3e4451; border-radius: 4px; overflow: hidden; }
    .stack-header { background: #3e4451; padding: 4px 8px; font-size: 0.75rem; color: #d19a66; }
    .stack-body { padding: 8px; font-size: 0.8rem; }
    .stack-var { margin-bottom: 4px; border-bottom: 1px solid #2c313a; }

    /* General UI Elements */
    button {
        background: #3e4451;
        color: #abb2bf;
        border: none;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
    }
    button:hover:not(:disabled) { background: #4b5263; color: white; }
    button:disabled { opacity: 0.3; cursor: not-allowed; }
    .btn-primary { background: #61afef; color: #21252b; font-weight: bold; }
    .btn-primary:hover { background: #528bff; }
    .step-label { font-family: monospace; color: #d19a66; }
    .dim { color: #5c6370; font-size: 0.8rem; }
</style>
