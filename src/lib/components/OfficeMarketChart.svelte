<!--
  NYC office market: vacancy rate, then rent per sq ft, on one chart.
  `progress` (0 -> 1) is the overall story progress; steps come from #lib/storyTimeline.js:
    vacancyLine  orange vacancy line draws left to right
    vacancyFade  vacancy line and area fade to grey (kept as a ghost)
    titleSwap    title and y-axis labels slide up and out; rent title and labels slide in
    rentLine     orange rent line draws left to right over the grey vacancy ghost
  With progress = 1 the finished rent chart (with the ghost) is shown.

  Data (static/, partial QTD quarter left out, filtered to #lib/storyRange.js):
    Vacancy Rate.xlsx                          quarterly office vacancy rate
    Direct Rent Per SF Inflation Adjusted.xlsx quarterly direct rent per sq ft, inflation-adjusted
-->
<script>
	import vacancyData from '#lib/data/office_vacancy_rate.json';
	import rentData from '#lib/data/office_rent_per_sf.json';
	import { stepProgress } from '#lib/storyTimeline.js';
	import { inRangeQuarter, RANGE_START_INDEX, RANGE_END_INDEX } from '#lib/storyRange.js';

	/** @type {{ progress?: number, maxHeight?: number }} */
	let { progress = 1, maxHeight = 460 } = $props();

	const uid = $props.id();

	// ---- data ---------------------------------------------------------------
	// Each quarter is plotted at its last month, on the same month-based x-axis as the subway chart
	const toPoints = (rows, key) =>
		rows
			.map((d) => {
				const [y, q] = d.quarter.split('-Q').map(Number);
				return { year: y, q, t: y * 12 + q * 3 - 1, v: d[key] };
			})
			.filter((p) => inRangeQuarter(p.year, p.q));

	const vacancy = toPoints(vacancyData, 'rate');
	const rent = toPoints(rentData, 'rent');

	// Both y-scales have 5 gridlines (4 steps), so the gridlines stay put while the labels change
	const niceMax = (pts, step) => Math.ceil(Math.max(...pts.map((p) => p.v)) / step) * step;
	const SERIES = {
		vacancy: {
			points: vacancy,
			yMax: niceMax(vacancy, 0.04),
			tick: (v) => `${Math.round(v * 100)}%`,
			value: (v) => `${(v * 100).toFixed(1)}%`,
			title: 'NYC Office Vacancy Rate in Past Years',
			axis: 'Office vacancy rate',
			unit: 'vacant'
		},
		rent: {
			points: rent,
			yMax: niceMax(rent, 25),
			tick: (v) => `$${Math.round(v)}`,
			value: (v) => `$${v.toFixed(2)}`,
			title: 'NYC Office Rent per Square Foot in Past Years',
			axis: 'Direct rent per sq ft, inflation-adjusted',
			unit: 'per sq ft'
		}
	};
	const TICKS = 4;

	// ---- story steps --------------------------------------------------------
	const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);
	const clamp01 = (v) => Math.max(0, Math.min(1, v));

	const pVac = $derived(stepProgress(progress, 'vacancyLine'));
	const pFade = $derived(ease(stepProgress(progress, 'vacancyFade')));
	const pSwap = $derived(stepProgress(progress, 'titleSwap'));
	const pRent = $derived(stepProgress(progress, 'rentLine'));

	// Old title/labels leave during the first 60% of the swap, new ones arrive in the last 60%
	const outK = $derived(ease(clamp01(pSwap / 0.6)));
	const inK = $derived(ease(clamp01((pSwap - 0.4) / 0.6)));
	const SLIDE = 18; // px the text travels while fading

	const STEP = 3; // months between quarterly points
	const revealOf = (pts, p) => pts[0].t + p * (pts[pts.length - 1].t - pts[0].t);
	const vacReveal = $derived(revealOf(vacancy, pVac));
	const rentReveal = $derived(revealOf(rent, pRent));

	function valueAt(pts, t) {
		const f = (t - pts[0].t) / STEP;
		const i = Math.floor(f);
		const a = pts[Math.max(0, Math.min(pts.length - 1, i))];
		const b = pts[Math.max(0, Math.min(pts.length - 1, i + 1))];
		return a.v + (b.v - a.v) * (f - i);
	}

	const fmtQ = (p) => `Q${p.q} ${p.year}`;

	// ---- layout -------------------------------------------------------------
	let width = $state(800);
	const narrow = $derived(width < 560);
	const height = $derived(Math.max(260, Math.min(maxHeight, narrow ? 360 : 460)));
	// Same margins as the subway chart so the x-axes line up
	const margin = $derived({ top: 22, right: narrow ? 64 : 100, bottom: 32, left: narrow ? 44 : 52 });
	const innerW = $derived(Math.max(0, width - margin.left - margin.right));
	const innerH = $derived(height - margin.top - margin.bottom);

	const x = (t) => ((t - RANGE_START_INDEX) / (RANGE_END_INDEX - RANGE_START_INDEX)) * innerW;
	const yOf = (s, v) => innerH - (v / s.yMax) * innerH;
	const tickValues = (s) => Array.from({ length: TICKS + 1 }, (_, i) => (s.yMax / TICKS) * i);

	const allYears = [...new Set(vacancy.map((p) => p.year))];
	const years = $derived(narrow && allYears.length > 8 ? allYears.filter((_, i) => i % 2 === 0) : allYears);

	const pathsOf = (s) => {
		const line = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${yOf(s, p.v)}`).join('');
		const first = s.points[0];
		const last = s.points[s.points.length - 1];
		return { line, area: `${line}L${x(last.t)},${innerH}L${x(first.t)},${innerH}Z` };
	};
	const vacPaths = $derived(pathsOf(SERIES.vacancy));
	const rentPaths = $derived(pathsOf(SERIES.rent));
	const vacLast = vacancy[vacancy.length - 1];
	const rentLast = rent[rent.length - 1];

	// ---- hover / keyboard ---------------------------------------------------
	// One readout for every series drawn so far at the hovered quarter
	let active = $state(/** @type {number | null} */ (null));
	const drawnCount = (pts, p, reveal) => (p > 0 ? Math.floor((reveal - pts[0].t) / STEP + 1e-9) + 1 : 0);
	const vacCount = $derived(drawnCount(vacancy, pVac, vacReveal));
	const rentCount = $derived(drawnCount(rent, pRent, rentReveal));
	const maxIndex = $derived(Math.max(vacCount, rentCount) - 1);
	const activeQ = $derived(active === null || active > maxIndex ? null : vacancy[active]);

	function onPointerMove(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const t = RANGE_START_INDEX + ((e.clientX - rect.left) / innerW) * (RANGE_END_INDEX - RANGE_START_INDEX);
		active = Math.max(0, Math.min(vacancy.length - 1, Math.round((t - vacancy[0].t) / STEP)));
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

	const ariaText = $derived.by(() => {
		if (!activeQ) return 'No quarter selected';
		const parts = [];
		if (active < rentCount) parts.push(`rent ${SERIES.rent.value(rent[active].v)} per sq ft`);
		if (active < vacCount) parts.push(`vacancy ${SERIES.vacancy.value(vacancy[active].v)}`);
		return `${fmtQ(activeQ)}: ${parts.join(', ')}`;
	});

	const tipLeft = $derived(activeQ ? margin.left + x(activeQ.t) : 0);
	const tipFlip = $derived(activeQ ? x(activeQ.t) > innerW / 2 : false);
</script>

<figure class="viz-root">
	<!-- Titles share one grid cell: the old one slides up and out, the new one slides in -->
	<h2 class="sr-only">{pSwap >= 0.5 ? SERIES.rent.title : SERIES.vacancy.title}</h2>
	<div class="titles" aria-hidden="true">
		<div class="title" style="opacity:{1 - outK}; transform:translateY({-outK * SLIDE}px)">
			{SERIES.vacancy.title}
		</div>
		<div class="title" style="opacity:{inK}; transform:translateY({(1 - inK) * SLIDE}px)">
			{SERIES.rent.title}
		</div>
	</div>

	<div class="chart" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-labelledby="{uid}-desc">
			<desc id="{uid}-desc">
				Area chart of NYC office market conditions by quarter, {fmtQ(vacancy[0])} to {fmtQ(vacLast)}.
				The vacancy rate rose from {SERIES.vacancy.value(vacancy[0].v)} to
				{SERIES.vacancy.value(vacLast.v)}; inflation-adjusted direct rent fell from
				{SERIES.rent.value(rent[0].v)} to {SERIES.rent.value(rentLast.v)} per square foot.
			</desc>

			<defs>
				<clipPath id="{uid}-vac">
					<rect x="-4" y="-10" width={pVac > 0 ? x(vacReveal) + 4 : 0} height={innerH + 20} />
				</clipPath>
				<clipPath id="{uid}-rent">
					<rect x="-4" y="-10" width={pRent > 0 ? x(rentReveal) + 4 : 0} height={innerH + 20} />
				</clipPath>
			</defs>

			<g transform="translate({margin.left},{margin.top})">
				<!-- gridlines (shared by both scales) + x axis -->
				{#each tickValues(SERIES.vacancy) as v}
					<line class="grid" class:baseline={v === 0} x1="0" x2={innerW} y1={yOf(SERIES.vacancy, v)} y2={yOf(SERIES.vacancy, v)} />
				{/each}
				{#each years as yr}
					{@const tx = x(yr * 12)}
					<line class="xtick" x1={tx} x2={tx} y1={innerH} y2={innerH + 4} />
					<text class="tick" x={tx} y={innerH + 18} text-anchor={tx < 1 ? 'start' : 'middle'}>
						{narrow ? `'${String(yr).slice(2)}` : yr}
					</text>
				{/each}

				<!-- y-axis labels: vacancy set slides up and out, rent set slides in -->
				{#each [{ s: SERIES.vacancy, k: -outK * SLIDE, o: 1 - outK }, { s: SERIES.rent, k: (1 - inK) * SLIDE, o: inK }] as set}
					{#if set.o > 0}
						<g style="opacity:{set.o}" transform="translate(0,{set.k})">
							<text class="axis-title" x={-margin.left} y="-10">{set.s.axis}</text>
							{#each tickValues(set.s) as v}
								<text class="tick" x="-8" y={yOf(set.s, v)} dy="0.32em" text-anchor="end">{set.s.tick(v)}</text>
							{/each}
						</g>
					{/if}
				{/each}

				<!-- vacancy: orange, then crossfades to a grey ghost -->
				<g clip-path="url(#{uid}-vac)">
					<g style="opacity:{pFade}">
						<path class="area ghost" d={vacPaths.area} />
						<path class="line ghost" d={vacPaths.line} />
					</g>
					<g style="opacity:{1 - pFade}">
						<path class="area" d={vacPaths.area} />
						<path class="line" d={vacPaths.line} />
					</g>
				</g>
				{#if pVac > 0 && pVac < 1 && !activeQ}
					<circle class="dot" cx={x(vacReveal)} cy={yOf(SERIES.vacancy, valueAt(vacancy, vacReveal))} r="4.5" />
				{/if}
				{#if pVac >= 1}
					<g class:faded={pFade > 0.5} transform="translate({x(vacLast.t) + 10},{yOf(SERIES.vacancy, vacLast.v)})">
						<text class="end-value" dy="0.1em">{SERIES.vacancy.value(vacLast.v)}</text>
						<text class="end-sub" dy="1.4em">{pFade > 0.5 ? 'vacancy rate' : fmtQ(vacLast)}</text>
					</g>
				{/if}

				<!-- rent: orange, drawn over the grey vacancy ghost -->
				<g clip-path="url(#{uid}-rent)">
					<path class="area" d={rentPaths.area} />
					<path class="line" d={rentPaths.line} />
				</g>
				{#if pRent > 0 && pRent < 1 && !activeQ}
					<circle class="dot" cx={x(rentReveal)} cy={yOf(SERIES.rent, valueAt(rent, rentReveal))} r="4.5" />
				{/if}
				{#if pRent >= 1}
					<g transform="translate({x(rentLast.t) + 10},{yOf(SERIES.rent, rentLast.v)})">
						<text class="end-value" dy="0.1em">{SERIES.rent.value(rentLast.v)}</text>
						<text class="end-sub" dy="1.4em">per sq ft</text>
					</g>
				{/if}

				<!-- hover layer -->
				{#if activeQ}
					<line class="crosshair" x1={x(activeQ.t)} x2={x(activeQ.t)} y1="0" y2={innerH} />
					{#if active < vacCount}
						<circle class="dot" class:ghost-dot={pFade > 0.5} cx={x(activeQ.t)} cy={yOf(SERIES.vacancy, vacancy[active].v)} r="4.5" />
					{/if}
					{#if active < rentCount}
						<circle class="dot" cx={x(activeQ.t)} cy={yOf(SERIES.rent, rent[active].v)} r="4.5" />
					{/if}
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
					aria-valuetext={ariaText}
					onpointermove={onPointerMove}
					onpointerleave={() => (active = null)}
					onkeydown={onKeyDown}
					onblur={() => (active = null)}
				/>
			</g>
		</svg>

		{#if activeQ}
			<div class="tooltip" class:flip={tipFlip} style="left:{tipLeft}px; top:{margin.top + 8}px" aria-hidden="true">
				<div class="tip-month">{fmtQ(activeQ)}</div>
				{#if active < rentCount}
					<div class="tip-row">
						<span class="key"></span>
						<strong>{SERIES.rent.value(rent[active].v)}</strong>
						<span class="muted">per sq ft</span>
					</div>
				{/if}
				{#if active < vacCount}
					<div class="tip-row">
						<span class="key" class:ghost-key={pFade > 0.5}></span>
						<strong>{SERIES.vacancy.value(vacancy[active].v)}</strong>
						<span class="muted">vacant</span>
					</div>
				{/if}
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
		--ghost: #b5b3ad;

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
			--ghost: #6b6a66;
		}
	}

	.titles {
		display: grid;
		margin: 0 0 12px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	.title {
		grid-area: 1 / 1;
		margin: 0;
		font-size: 1.35rem;
		line-height: 1.3;
		font-weight: 650;
		will-change: transform, opacity;
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
	.area.ghost {
		fill: var(--ghost);
		fill-opacity: 0.16;
	}
	.line.ghost {
		stroke: var(--ghost);
	}
	.dot {
		fill: var(--series-1);
		stroke: var(--surface-1);
		stroke-width: 2;
	}
	.dot.ghost-dot {
		fill: var(--ghost);
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
	.faded .end-value,
	.faded .end-sub {
		fill: var(--text-muted);
	}
	.faded .end-value {
		font-weight: 500;
		font-size: 13px;
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
	.key.ghost-key {
		background: var(--ghost);
	}
	.muted {
		color: var(--text-muted);
	}
</style>
