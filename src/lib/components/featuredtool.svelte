<script lang="ts">
  import type { Tool } from "$lib/tools/types";
  export let tool: Tool;
</script>

<a
  href={tool.href}
  class="group block rounded-2xl border border-zinc-800 bg-zinc-950 p-8 hover:bg-zinc-900 transition"
>
  <div class="flex items-center justify-between">
    <h2 class="text-2xl md:text-3xl font-semibold group-hover:text-blue-400 transition">
      {tool.title}
    </h2>

    {#if tool.status === "live"}
      <span class="text-xs px-2 py-1 rounded-full border border-green-500 text-green-400">
        live
      </span>
    {/if}
  </div>

  <p class="mt-3 text-zinc-400">
    {tool.description}
  </p>

  <div class="mt-6 text-sm text-zinc-500 group-hover:text-zinc-300 transition">
    Enter →
  </div>
</a>
