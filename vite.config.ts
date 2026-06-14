import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
	optimizeDeps: {
		include: ['eventemitter3', '@xmldom/xmldom'],
		exclude: ['@yowasp/yosys', 'pixi.js']
	},

	plugins: [
		tailwindcss(), 
		sveltekit(), 
		devtoolsJson(), 
		wasm() 
	],

	server: {
		fs: {
			allow: [
				path.resolve(__dirname, 'modules') 
			]
		},
		watch: {
			// 3. Keep the file watcher out of the cache folder
			ignored: ['**/node_modules/.vite/**']
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
