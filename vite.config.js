import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static build for GitHub Pages: every page is prerendered into the `build` folder.
			adapter: adapter(),

			// GitHub Pages serves the site from /<repo-name>/, so the build needs that base path.
			// The deploy workflow sets BASE_PATH; `npm run dev` leaves it empty.
			paths: {
				base: process.argv.includes('dev') ? '' : (process.env.BASE_PATH ?? '')
			}
		})
	]
});
