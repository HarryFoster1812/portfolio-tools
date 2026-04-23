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
                .filter((v:string) => v !== "T" && v !== "F")
        )];
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

    function updateUIState() {
          if (!state || !state.execution_stack.length) return;

          // Get the top frame (current execution context)
          const frame = state.execution_stack.at(-1);
          
          // Update scope (Tabs)
          currentScope = frame.type;

          // Look up the mapping for the current step
          const stepInfo = stepUIMap[currentScope]?.[frame.step];

          if (stepInfo) {
            currentBlock = stepInfo.block;
            // Subtract 1 if your array is 0-indexed but your map uses 1-based line numbers
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
    }

    function stepForward() {
        if (!engine) return;
        engine.step();
        state = engine.getState();
        console.log(state);
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
                <section class="variable-section">
                    <h3>Variable Ordering</h3>
                    <div class="variable-list">
                        {#each ordering as variable, i}
                            <div class="order-item">
                                <span>{variable}</span>
                                <div class="btn-group">
                                    <button on:click={() => moveUp(i)} disabled={i === 0}>↑</button>
                                    <button on:click={() => moveDown(i)} disabled={i === ordering.length - 1}>↓</button>
                                </div>
                            </div>
                        {/each}
                    </div>
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
            <h3>Stack Frames</h3>
            {#if state && state.execution_stack}
                {#each state.execution_stack as frame, i}
                    <div class="stack-card" style="opacity: {1 - (i * 0.2)}">
                        <div class="stack-header">
                            <span class="func-name">{frame.type}</span>
                            <span class="depth">Depth: {i}</span>
                        </div>
                            <div class="stack-body">
                                {#each Object.entries(frame).filter(([key]) => key !== 'var_index' && key !== 'type') as [key, value]}
                                    <div class="var-pill">
                                        <span class="key">{key}:</span>
                                        <span class="val">{value}</span>
                                    </div>
                                {/each}
                            </div>
                    </div>
                {/each}
            {:else}
                <p class="dim">Engine idle...</p>
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
        /* Prevent the panel from growing past the screen height */
        max-height: 100%; 
        overflow: hidden; 
    }

    /* New container for the Variable section */
    .variable-section {
        display: flex;
        flex-direction: column;
        max-height: 40%; /* Limits size so Code Flow stays visible */
        margin-bottom: 1.5rem;
    }

    .variable-list {
        overflow-y: auto; /* Vertical scroll if list is too long */
        padding-right: 4px; /* Space for scrollbar */
    }

    /* Custom scrollbar for a cleaner IDE look */
    .variable-list::-webkit-scrollbar {
        width: 4px;
    }
    .variable-list::-webkit-scrollbar-thumb {
        background: #3e4451;
        border-radius: 4px;
    }

    .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #21252b;
        padding: 6px 10px;
        border-radius: 4px;
        margin-bottom: 6px;
        min-height: 32px; /* Keeps size consistent */
    }

    /* Ensure the Code Flow takes up the remaining space */
    .code-flow {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        min-height: 0; /* Important for flex-grow with overflow */
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

    /* Refined Code & Arrow Styles */
    .code-box { 
        background: #1e2227; 
        padding: 10px 0; /* Vertical padding only, horizontal handled by lines */
        border-radius: 4px; 
        font-family: 'Fira Code', monospace; /* Fira Code is great for this if available */
        overflow-x: auto; /* Allows horizontal scrolling for long lines */
        display: flex;
        flex-direction: column;
    }

    .code-line { 
        display: flex; 
        gap: 12px; 
        font-size: 0.85rem; 
        padding: 4px 12px; /* Consistent padding for all lines */
        align-items: flex-start; /* Aligns arrow/number to top if line wraps */
        min-width: max-content; /* CRITICAL: Ensures highlight extends to end of long lines */
        transition: background 0.2s ease;
    }

    .code-line.highlight {
        background: rgba(97, 175, 239, 0.15); /* Slightly subtler blue */
        border-left: 3px solid #61afef; /* Visual "active" indicator */
        padding-left: 9px; /* Offset for the 3px border */
    }

    .code-line code {
        white-space: pre; /* Keeps indentation and prevents unwanted wrapping */
        color: #abb2bf;
    }

    .arrow { 
        color: #e06c75; 
        width: 14px; 
        min-width: 14px; /* Prevents arrow from shrinking */
        font-size: 0.75rem;
        display: inline-block;
    }

    .line-num {
        color: #4b5263;
        font-size: 0.75rem;
        width: 20px;
        min-width: 20px;
        text-align: right;
        user-select: none; /* Prevents selecting line numbers */
    }

    /* Scrollbar styling for a cleaner look */
    .code-box::-webkit-scrollbar {
        height: 6px;
    }
    .code-box::-webkit-scrollbar-thumb {
        background: #3e4451;
        border-radius: 10px;
    }

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
            padding: 4px;
            border-bottom: 2px solid transparent;
        }

      .tabs button.active {
          background: #282c34;
          border-bottom-color: #61afef;
          color: #61afef;
      }

      .stack-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
      }

      .depth {
          font-size: 0.6rem;
          background: #181a1f;
          padding: 2px 5px;
          border-radius: 10px;
      }

      .key { color: #c678dd; font-weight: bold; }
      .val { color: #98c379; }
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
    }

    /* Improve the func-name color in the stack */
    .func-name {
        color: #61afef;
        font-weight: bold;
        font-size: 0.8rem;
    }
</style>
