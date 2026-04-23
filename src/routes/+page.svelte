<script lang="ts">
  import { tools } from "$lib/tools/registry";
  import FeaturedTool from "$lib/components/featuredtool.svelte";
  import ToolCard from "$lib/components/toolcard.svelte";

  const featured = tools.filter(t => t.featured);
  const others = tools.filter(t => !t.featured);
</script>

<div class="min-h-screen bg-black text-white px-6 py-16">

  <!-- HERO -->
  <div class="text-center max-w-3xl mx-auto">
    <h1 class="text-5xl md:text-7xl font-extrabold tracking-tighter italic">
      Hello there!
    </h1>

    <p class="mt-4 text-zinc-400 text-lg">
      A playground for JavaScript and WebAssembly experiments.
    </p>
  </div>

  <!-- FEATURED -->
  {#if featured.length}
    <div class="mt-16 max-w-3xl mx-auto space-y-4">
      <h2 class="text-sm uppercase tracking-widest text-zinc-500">
        Featured
      </h2>

      {#each featured as tool (tool.id)}
        <FeaturedTool {tool} />
      {/each}
    </div>
  {/if}

  <!-- ALL TOOLS -->
  <div class="mt-16 max-w-5xl mx-auto">
    <h2 class="text-sm uppercase tracking-widest text-zinc-500 mb-4">
      All Experiments
    </h2>

    <div class="grid gap-4 sm:grid-cols-2">
      {#each others as tool (tool.id)}
        <ToolCard {tool} />
      {/each}
    </div>
  </div>

</div>
