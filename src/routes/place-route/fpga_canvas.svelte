<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { FabricVisualiser } from './FabricVisualiser';
  import type { FabricDimensions, RenderState } from './types';

  export let dimensions: FabricDimensions;
  export let state: RenderState;

  let container: HTMLDivElement;
  let visualiser: FabricVisualiser;

  onMount(async () => {
    visualiser = new FabricVisualiser(container);
    await visualiser.init(dimensions);
    visualiser.updateState(state);
  });

  // Keep drawing calls clear of garbage collection loops
  $: if (visualiser && state) {
    visualiser.updateState(state);
  }

  onDestroy(() => {
    visualiser?.destroy();
  });
</script>

<div class="canvas-wrapper" bind:this={container}></div>

<style>
  .canvas-wrapper {
    width: 100%;
    height: 580px;
    border-radius: 6px;
    overflow: hidden;
    background: #090d16;
  }
</style>
