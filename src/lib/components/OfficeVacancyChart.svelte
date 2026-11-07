<!--
  NYC office vacancy rate by quarter (area chart), drawn left to right.
  `progress` (0 -> 1) is the overall story progress; the line draws during the
  'vacancyLine' step of #lib/storyTimeline.js. With progress = 1 the full chart is shown.

  Data: Vacancy Rate.xlsx (static/), quarterly NYC office vacancy rate.
  The partial current quarter (QTD) is left out, and only quarters inside the
  story's time range (#lib/storyRange.js) are drawn.
-->
<script>
	import defaultData from '#lib/data/office_vacancy_rate.json';
	import { stepProgress } from '#lib/storyTimeline.js';
	import { inRangeQuarter, RANGE_START_INDEX, RANGE_END_INDEX } from '#lib/storyRange.js';

	/** @type {{ data?: { quarter: string, rate: number }[], progress?: number, maxHeight?: number }} */
	let { data = defaultData, progress = 1, maxHeight = 460 } = $props();

	const uid = $props.id();

	// ---- data ---------------------------------------------------------------
	const points = $derived(
		data
			.map((d) => {
				const [y, q] = d.quarter.split('-Q').map(Number);
				// Plotted at the last month of the quarter (vacancy is an end-of-quarter figure),
				// on the same month-based x-axis as the subway chart
				return { year: y, q, t: y * 12 + q * 3 - 1, rate: d.rate };
			})
			.filter((p) => inRangeQuarter(p.year, p.q))
	);

	// ---- story step ---------------------------------------------------------
	const tMin = $derived(points[0].t);
	const tMax = $derived(points[points.length - 1].t);
	const pLine = $derived(stepProgress(progress, 'vacancyLine'));
	const revealT = $derived(tMin + pLine * (tMax - tMin));
	const lineStarted = $derived(pLine > 0);
	const lineDone = $derived(pLine >= 1);

	const STEP = 3; // months between quarterly points
	function valueAt(t) {
		const f = (t - tMin) / STEP;
		const i = Math.floor(f);
		const a = points[Math.max(0, Math.min(points.length - 1, i))];
		const b = points[Math.max(0, Math.min(points.length - 1, i + 1))];
		return a.rate + (b.rate - a.rate) * (f - i);
	}

	// ---- formatting ---------------------------------------------------------
	const fmtPct = (v) => `${(v * 100).toFixed(1)}%`;
	const fmtQ = (p) => `Q${p.q} ${p.year}`;

	// ---- layout -------------------------------------------------------------
	let width = $state(800);
	const narrow = $derived(width < 560);
	const height = $derived(Math.max(260, Math.min(maxHeight, narrow ? 360 : 460)));
	const margin = $derived({ top: 22, right: narrow ? 64 : 100, bottom: 32, left: narrow ? 44 : 52 }); // same as the subway chart so the x-axes line up
	const innerW = $derived(Math.max(0, width - margin.left - margin.right));
	const innerH = $derived(height - margin.top - margin.bottom);

	const yMax = $derived(Math.ceil(Math.max(...points.map((p) => p.rate)) / 0.04) * 0.04);
	const x = (t) => ((t - RANGE_START_INDEX) / (RANGE_END_INDEX - RANGE_START_INDEX)) * innerW;
	const y = (v) => innerH - (v / yMax) * innerH;

	const yTicks = $derived(Array.from({ length: Math.round(yMax / 0.04) + 1 }, (_, i) => i * 0.04));
	const allYears = $derived([...new Set(points.map((p) => p.year))]);
	// On narrow screens with many years, label every other year so the ticks don't collide
	const years = $derived(
		narrow && allYears.length > 8 ? allYears.filter((yr, i) => i % 2 === 0) : allYears
	);

	const linePath = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${y(p.rate)}`).join(''));
	const areaPath = $derived(`${linePath}L${x(tMax)},${y(0)}L${x(tMin)},${y(0)}Z`);
	const last = $derived(points[points.length - 1]);

	// ---- hover / keyboard (only over the part already drawn) ----------------
	let active = $state(/** @type {number | null} */ (null));
	const maxIndex = $derived(lineStarted ? Math.floor((revealT - tMin) / STEP + 1e-9) : -1);
	const activePoint = $derived(active === null || active > maxIndex ? null : points[active]);

	function onPointerMove(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const t = RANGE_START_INDEX + ((e.clientX - rect.left) / innerW) * (RANGE_END_INDEX - RANGE_START_INDEX);
		active = Math.max(0, Math.min(points.length - 1, Math.round((t - tMin) / STEP)));
		if (active > maxIndex) active = null;
	}

	function onKeyDown(e) {
		if (maxIndex < 0) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			const step = e.key === 'ArrowRight' ? 1 : -1;
			active = Math.max(0, Math.min(maxIndex, (active ?? (step > 0 ? -1 : maxIndex + 1)) + step));
		} else if (e.key === 'Escape') {
			active = null;
		}
	}

	const tipLeft = $derived(activePoint ? margin.left + x(activePoint.t) : 0);
	const tipFlip = $derived(activePoint ? x(activePoint.t) > innerW / 2 : false);
</script>

<figure class="viz-root">
	<h2>NYC Office Vacancy Rate in Past Years</h2>

	<div class="chart" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-labelledby="{uid}-desc">
			<desc id="{uid}-desc">
				Area chart of the NYC office vacancy rate by quarter from {fmtQ(points[0])} to {fmtQ(last)}.
				It rose from {fmtPct(points[0].rate)} to a peak of
				{fmtPct(Math.max(...points.map((p) => p.rate)))} and was {fmtPct(last.rate)} in {fmtQ(last)}.
			</desc>

			<defs>
				<clipPath id="{uid}-reveal">
					<rect x="-4" y="-10" width={lineStarted ? x(revealT) + 4 : 0} height={innerH + 20} />
				</clipPath>
			</defs>

			<g transform="translate({margin.left},{margin.top})">
				<!-- axes -->
				<text class="axis-title" x={-margin.left} y="-10">Office vacancy rate</text>
				{#each yTicks as v}
					<line class="grid" class:baseline={v === 0} x1="0" x2={innerW} y1={y(v)} y2={y(v)} />
					<text class="tick" x="-8" y={y(v)} dy="0.32em" text-anchor="end">
						{Math.round(v * 100)}%
					</text>
				{/each}
				{#each years as yr}
					{@const tx = x(yr * 12)}
					<line class="xtick" x1={tx} x2={tx} y1={innerH} y2={innerH + 4} />
					<text class="tick" x={tx} y={innerH + 18} text-anchor={tx < 1 ? 'start' : 'middle'}>
						{narrow ? `'${String(yr).slice(2)}` : yr}
					</text>
				{/each}

				<!-- vacancy, revealed left to right -->
				<g clip-path="url(#{uid}-reveal)">
					<path class="area" d={areaPath} />
					<path class="line" d={linePath} />
				</g>
				{#if lineStarted && !activePoint}
					<circle class="dot" cx={x(revealT)} cy={y(valueAt(revealT))} r="4.5" />
				{/if}

				<!-- latest value, once the line is drawn -->
				{#if lineDone}
					<g class="end-label" transform="translate({x(last.t) + 10},{y(last.rate)})">
						<text class="end-value" dy="0.1em">{fmtPct(last.rate)}</text>
						<text class="end-sub" dy="1.4em">{fmtQ(last)}</text>
					</g>
				{/if}

				<!-- hover layer -->
				{#if activePoint}
					<line class="crosshair" x1={x(activePoint.t)} x2={x(activePoint.t)} y1="0" y2={innerH} />
					<circle class="dot" cx={x(activePoint.t)} cy={y(activePoint.rate)} r="4.5" />
				{/if}
				<rect
					class="hit"
					width={innerW}
					height={innerH}
					tabindex="0"
					role="slider"
					aria-label="Quarter: use left and right arrow keys to read values"
					aria-valuemin="0"
					aria-valuemax={Math.max(0, maxIndex)}
					aria-valuenow={active ?? 0}
					aria-valuetext={activePoint
						? `${fmtQ(activePoint)}: ${fmtPct(activePoint.rate)} vacant`
						: 'No quarter selected'}
					onpointermove={onPointerMove}
					onpointerleave={() => (active = null)}
					onkeydown={onKeyDown}
					onblur={() => (active = null)}
				/>
			</g>
		</svg>

		{#if activePoint}
			<div
				class="tooltip"
				class:flip={tipFlip}
				style="left:{tipLeft}px; top:{margin.top + 8}px"
				aria-hidden="true"
			>
				<div class="tip-month">{fmtQ(activePoint)}</div>
				<div class="tip-row">
					<span class="key"></span>
					<strong>{fmtPct(activePoint.rate)}</strong>
					<span class="muted">vacant</span>
				</div>
			</div>
		{/if}
	</div>
</figure>

<style>
	.viz-root {
		--surface-1: #fcfcfb;
		--text-primary: #0b0b0b;
		--text-secondary: #52514e;
		--text-muted: #898781;
		--grid: #e1e0d9;
		--axis: #c3c2b7;
		--border: rgba(11, 11, 11, 0.1);
		--series-1: #eb6834;

		margin: 0;
		padding: 20px 16px 16px;
		background: var(--surface-1);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: 12px;
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		max-width: 1040px;
	}
	@media (prefers-color-scheme: dark) {
		.viz-root {
			--surface-1: #1a1a19;
			--text-primary: #f0efec;
			--text-secondary: #c3c2b7;
			--text-muted: #898781;
			--grid: #2c2c2a;
			--axis: #383835;
			--border: rgba(255, 255, 255, 0.1);
			--series-1: #d95926;
		}
	}

	h2 {
		margin: 0 0 12px;
		font-size: 1.35rem;
		line-height: 1.3;
		font-weight: 650;
	}

	.chart {
		position: relative;
		width: 100%;
		min-width: 0;
	}
	svg {
		display: block;
		overflow: visible;
	}

	.grid {
		stroke: var(--grid);
		stroke-width: 1;
	}
	.grid.baseline,
	.xtick {
		stroke: var(--axis);
	}
	.tick,
	.axis-title {
		fill: var(--text-muted);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}

	.area {
		fill: var(--series-1);
		fill-opacity: 0.12;
	}
	.line {
		fill: none;
		stroke: var(--series-1);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.dot {
		fill: var(--series-1);
		stroke: var(--surface-1);
		stroke-width: 2;
	}

	.end-value {
		fill: var(--text-primary);
		font-size: 15px;
		font-weight: 650;
	}
	.end-sub {
		fill: var(--text-secondary);
		font-size: 11px;
	}

	.crosshair {
		stroke: var(--text-muted);
		stroke-width: 1;
	}
	.hit {
		fill: transparent;
		cursor: crosshair;
		outline: none;
	}
	.hit:focus-visible {
		stroke: var(--series-1);
		stroke-width: 1;
		stroke-dasharray: 2 2;
	}

	.tooltip {
		position: absolute;
		transform: translateX(12px);
		pointer-events: none;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
		padding: 8px 10px;
		font-size: 12px;
		white-space: nowrap;
		z-index: 2;
	}
	.tooltip.flip {
		transform: translateX(calc(-100% - 12px));
	}
	.tip-month {
		color: var(--text-secondary);
		margin-bottom: 4px;
	}
	.tip-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.tip-row strong {
		font-size: 15px;
		font-weight: 650;
	}
	.key {
		width: 12px;
		height: 2px;
		background: var(--series-1);
		border-radius: 1px;
	}
	.muted {
		color: var(--text-muted);
	}
</style>
