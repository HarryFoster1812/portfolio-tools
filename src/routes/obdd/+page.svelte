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

    onMount(async () => {
        await initWasm();
    });

    function handleInput(e: Event) {
        input = (e.target as HTMLInputElement).value;
        isValid = isValidFormula(input);

        if (isValid) {
            ordering = extractVariables(input);
        }
    }

    function extractVariables(formula: string): string[] {
        const matches = formula.match(/[A-Z]/g);
        return matches ? [...new Set(matches)] : [];
    }

    async function updateGraph() {
      if(!state) return;
      if(stategraphs.length < state.step_number){ svg = stategraphs[state.step_number];return;}
      
      let nodes="";
      let edges="";
      let ranks="";

      for (let i = 0; i < state.nodes.length; i++) {
        const n = state.nodes[i];
        if(n.id == 0 || n.id == 1) continue; // skip terminal nodes
        // Node label
        nodes += `id${n.id} [label="${n.var}"];\n`;

        edges += `id${n.id} -> id${n.left} [style=dashed, label="0"];\n`;
        edges += `id${n.id} -> id${n.right} [style=solid, label="1"];\n`;
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
          rankdir=TB;
          node [shape=circle];

          ${nodes}

          // Terminal Nodes
          id0 [shape=box, label="0"];
          id1 [shape=box, label="1"];
          ${ranks}
          ${edges}
          { rank=same; id0;id1;};
        }
      `);

      stategraphs.push(svg);
    }

    function run() {
        if (!isValid) return;

        engine = new Engine(input, ordering);
        stategraphs = [];
        state = engine.getState();
        // load graph
        updateGraph();
    }

    function stepForward() {
        if (!engine) return;
        engine.step();
        state = engine.getState();
        //load graph
        updateGraph();
    }

    function stepBack() {
        if (!engine) return;
        engine.stepBack();
        state = engine.getState();
        //load graph
        updateGraph();
    }

    function moveUp(index: number) {
        if (index === 0) return;
        [ordering[index - 1], ordering[index]] =
            [ordering[index], ordering[index - 1]];
    }

    function moveDown(index: number) {
        if (index === ordering.length - 1) return;
        [ordering[index + 1], ordering[index]] =
            [ordering[index], ordering[index + 1]];
    }
</script>

<h1>Ordered Boolean Decision Diagram Visualiser</h1>

<input
    placeholder="Enter formula (e.g. A & B)"
    on:input={handleInput}
/>
<h3>Variable Ordering</h3>

{#each ordering as variable, i}
  <div style="display:flex; gap:8px; align-items:center;">
    <span>{variable}</span>

    <button on:click={() => moveUp(i)} disabled={i === 0}>↑</button>
    <button on:click={() => moveDown(i)} disabled={i === ordering.length - 1}>↓</button>
  </div>
{/each}

<button on:click={run} disabled={!isValid}>
    Run Visualiser
</button>

{#if !isValid && input.length > 0}
    <p style="color:red;">Invalid formula</p>
{/if}

{#if state}
    <hr />

    <h2>Step {state.step_number}</h2>

    <button on:click={stepBack}>⬅ Back</button>
    <button on:click={stepForward}>Forward ➡</button>

    <h3>Nodes</h3>
    <ul>
        {#each state.nodes as node}
            <li>
                {node.id} :
                {node.var ?? "Terminal"}
                →
                ({node.left ?? "-"}, {node.right ?? "-"})
            </li>
        {/each}
    </ul>

    {@html svg}

{/if}
