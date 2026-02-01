<script>
	import './layout.css';
  import Navbar from "$lib/components/navbar/navbar.svelte";
  
  let { children } = $props(); // Svelte 5 syntax
</script>

<svelte:head>
  <title>Harry Foster - Software Engineer</title>
  <meta name="description" content="Portfolio and blog of Harry Foster..." />
  
  <meta property="og:title" content="Harry Foster - Software Engineer" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://harryfoster.tech" />
  
  <meta name="twitter:card" content="summary_large_image" />
  
  </svelte:head>

<div class="h-full flex flex-col min-h-screen bg-black text-white antialiased">
  <Navbar />
  
  <main class="flex-1 flex flex-col">
    {@render children()}
  </main>
  
</div>
