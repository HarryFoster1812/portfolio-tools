<script lang="ts">
    import { onMount } from "svelte";
    import { initWasm, isValidFormula, Engine } from "./engine";

    let input = "";
    let isValid = false;

    let engine: Engine | null = null;
    let state: any = null;

    let ordering = ["A", "B", "C"]; // later make dynamic

    onMount(async () => {
        await initWasm();
    });

    function handleInput(e: Event) {
        input = (e.target as HTMLInputElement).value;
        isValid = isValidFormula(input);
    }

    function run() {
        if (!isValid) return;

        engine = new Engine(input, ordering);
        state = engine.getState();
    }

    function stepForward() {
        if (!engine) return;
        engine.step();
        state = engine.getState();
    }

    function stepBack() {
        if (!engine) return;
        engine.stepBack();
        state = engine.getState();
    }
</script>

<h1>Ordered Boolean Decision Diagram Visualiser</h1>

<input
    placeholder="Enter formula (e.g. A & B)"
    on:input={handleInput}
/>

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
{/if}
