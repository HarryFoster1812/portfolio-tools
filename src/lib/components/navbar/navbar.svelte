<script>
  import { page } from '$app/stores';
  import Github from './github.svelte'; // Assuming these are components
  import Linkedin from './linkedin.svelte';
  // Svelte 5 state for mobile menu
  let isMenuOpen = $state(false); 

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
</script>

<nav class="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
  <div class="max-w-screen-xl mx-auto py-4 px-4 grid grid-cols-6 md:grid-cols-12 items-center gap-4">
    
    <div class="flex items-center gap-4 col-span-4 md:col-span-6">
      <a href="/" class="flex items-center group">
        <span class="text-xl font-bold tracking-tight text-white group-hover:text-zinc-300 transition-colors">
          HF <span class="text-zinc-500">/</span> LABS
        </span>
      </a>
    </div>

    <div class="col-span-2 md:col-span-6 flex justify-end items-center gap-3 md:gap-6">
      
      <div class="hidden md:flex items-center gap-4 border-r border-zinc-800 pr-6">
        <a 
          href="https://github.com/harryfoster1812" 
          target="_blank" 
          class="fill-zinc-400 hover:fill-white transition-colors"
          aria-label="GitHub"
        >
        <Github />
        </a>
        <a 
          href="https://www.linkedin.com/in/harry-w-foster" 
          target="_blank" 
          class="fill-zinc-400 hover:fill-white transition-colors"
          aria-label="LinkedIn"
        >
        </a>
        <Linkedin />
      </div>

      <a href="https://harryfoster.tech" target="_blank">
        <button class="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
          Portfolio Site ↗
        </button>
      </a>

      <button
        type="button"
        onclick={toggleMenu}
        class="md:hidden text-zinc-400 hover:text-white"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
    </div>
  </div>

  {#if isMenuOpen}
    <div class="md:hidden border-t border-zinc-800 bg-zinc-900 p-4 flex justify-around">
      <a href="https://github.com/harryfoster1812" aria-label="Github profile" class="fill-zinc-400"><Github /></a>
      <a href="https://www.linkedin.com/in/harry-w-foster" aria-label="Linkedin profile" class="fill-zinc-400"><Linkedin /></a>
    </div>
  {/if}
</nav>
