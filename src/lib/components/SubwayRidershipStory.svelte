<!--
  Scroll story for the subway ridership chart.
  The chart stays pinned (position: sticky) while the reader scrolls through a
  tall section; scroll position is turned into `progress` (0 -> 1), which
  SubwayRidershipChart uses to draw each step. Scrolling back up rewinds it.
-->
<script>
	import SubwayRidershipChart from './SubwayRidershipChart.svelte';
	import { TOTAL_SCREENS } from '#lib/subwayStoryTimeline.js';

	// Section = scroll distance of all steps + one screen for the pinned chart
	const length = TOTAL_SCREENS + 1;

	let section = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let viewportH = $state(800);
	let progress = $state(0);

	function update() {
		if (!section) return;
		const rect = section.getBoundingClientRect();
		const scrollable = rect.height - window.innerHeight;
		progress = scrollable > 0 ? Math.max(0, Math.min(1, -rect.top / scrollable)) : 1;
	}

	$effect(() => {
		let frame = 0;
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		};
		update();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});
</script>

<svelte:window bind:innerHeight={viewportH} />

<section class="story" bind:this={section} style="height:{length * 100}vh">
	<div class="sticky">
		<SubwayRidershipChart {progress} maxHeight={viewportH - 140} />
		<p class="hint" style="opacity:{1 - Math.min(1, progress / 0.04)}" aria-hidden="true">
			Scroll to begin ↓
		</p>
	</div>
</section>

<style>
	.story {
		position: relative;
	}
	.sticky {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100svh;
		box-sizing: border-box;
		padding: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}
	.hint {
		margin: 0;
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.85rem;
		color: #898781;
		pointer-events: none;
	}
</style>
