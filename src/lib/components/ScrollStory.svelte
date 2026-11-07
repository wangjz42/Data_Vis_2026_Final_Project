<!--
  The full scroll story:
    blue chapter card -> subway ridership -> orange chapter card -> office vacancy -> office rent.
  One pinned (position: sticky) stage holds the charts while the reader scrolls
  through a tall section. Scroll position becomes `progress` (0 -> 1); each
  chart and chapter card read their own steps from #lib/storyTimeline.js.
  Scrolling back up rewinds everything.
-->
<script>
	import SubwayRidershipChart from './SubwayRidershipChart.svelte';
	import OfficeMarketChart from './OfficeMarketChart.svelte';
	import { TOTAL_SCREENS, stepProgress } from '#lib/storyTimeline.js';

	// Section = scroll distance of all steps + one screen for the pinned stage
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

	// ---- chapter cards ------------------------------------------------------
	// Linear on purpose: a card moves 1:1 with the scroll, like a page section.
	// Position as % of screen height: 100 = below the screen, 0 = covering it, -100 = above it
	const cardPos = (inStep, outStep) => {
		const out = stepProgress(progress, outStep);
		if (out > 0) return -out * 100;
		return inStep ? (1 - stepProgress(progress, inStep)) * 100 : 0; // no inStep = starts covering
	};
	const cards = $derived([
		{
			key: 'intro',
			text: "First, we'll look at NYC subway ridership",
			color: 'blue',
			y: cardPos(null, 'introOut'),
			hint: true
		},
		{
			key: 'market',
			text: "We'll now look at the office space rental market",
			color: 'orange',
			y: cardPos('cardIn', 'cardOut'),
			hint: false
		}
	]);

	// Swap charts once the orange card fully covers the screen, so the change is hidden
	const showVacancy = $derived(stepProgress(progress, 'cardHold') > 0);
	const hintOpacity = $derived(1 - Math.min(1, stepProgress(progress, 'introOut') * 4));
</script>

<svelte:window bind:innerHeight={viewportH} />

<section class="story" bind:this={section} style="height:{length * 100}vh">
	<div class="sticky">
		{#if showVacancy}
			<OfficeMarketChart {progress} maxHeight={viewportH - 140} />
		{:else}
			<SubwayRidershipChart {progress} maxHeight={viewportH - 140} />
		{/if}

		{#each cards as card (card.key)}
			<div
				class="card {card.color}"
				style="transform: translateY({card.y}%); visibility: {card.y > -100 && card.y < 100 ? 'visible' : 'hidden'}"
				aria-hidden={card.y !== 0}
			>
				<p>{card.text}</p>
				{#if card.hint}
					<span class="hint" style="opacity:{hintOpacity}">Scroll to begin ↓</span>
				{/if}
			</div>
		{/each}
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
		overflow: hidden;
		box-sizing: border-box;
		padding: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}
	/* Full-screen chapter cards, in the color of the chart that follows */
	.card {
		--card: #eb6834;
		position: absolute;
		inset: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 28px;
		align-items: center;
		justify-content: center;
		padding: 24px;
		box-sizing: border-box;
		background: var(--card);
		pointer-events: none;
		will-change: transform;
	}
	.card.blue {
		--card: #2a78d6;
	}
	@media (prefers-color-scheme: dark) {
		.card {
			--card: #d95926;
		}
		.card.blue {
			--card: #3987e5;
		}
	}
	.card p {
		margin: 0;
		max-width: 18ch;
		text-align: center;
		color: #fff;
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: clamp(1.9rem, 5vw, 3.4rem);
		font-weight: 700;
		line-height: 1.15;
	}
	.hint {
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.85);
	}
</style>
