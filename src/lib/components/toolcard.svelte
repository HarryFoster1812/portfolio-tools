<script lang="ts">
  import type { Tool } from "$lib/tools/types";

  export let tool: Tool;
</script>

<a
  href={tool.href}
  class="group relative block rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-all duration-300 hover:bg-zinc-900 hover:border-zinc-700"
>
  <!-- top row -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h3 class="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
        {tool.title}
      </h3>

      <p class="mt-1 text-sm text-zinc-400 leading-snug">
        {tool.description}
      </p>
    </div>

    {#if tool.status}
      <span
        class="shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border
        {tool.status === 'live'
          ? 'border-green-500 text-green-400'
          : tool.status === 'beta'
          ? 'border-yellow-500 text-yellow-400'
          : 'border-zinc-600 text-zinc-500'}"
      >
        {tool.status}
      </span>
    {/if}
  </div>

  <!-- tags -->
  {#if tool.tags?.length}
    <div class="mt-4 flex flex-wrap gap-1.5">
      {#each tool.tags as tag}
        <span class="text-[11px] text-zinc-500 border border-zinc-800 bg-black/40 px-2 py-0.5 rounded-md">
          {tag}
        </span>
      {/each}
    </div>
  {/if}

  <!-- bottom action -->
  <div class="mt-5 flex items-center justify-between">
    <span class="text-xs text-zinc-600 group-hover:text-zinc-300 transition">
      click to enter
    </span>

    <span class="text-sm text-zinc-500 group-hover:text-blue-400 transition">
      →
    </span>
  </div>

  <!-- subtle glow accent on hover -->
  <div
    class="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none
           bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5"
  />
</a>
