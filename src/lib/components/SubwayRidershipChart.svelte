<!--
  NYC subway monthly ridership, Jan 2019 - Dec 2025, drawn step by step.

  `progress` (0 -> 1) controls what is drawn, so a scroll story can scrub it.
  The order and length of each step (including pauses) is set in
  #lib/storyTimeline.js. With the default progress = 1 the full chart is shown.

  Data: FTA National Transit Database, "Complete Monthly Ridership (with
  adjustments and estimates)", September 2026 release, UPT sheet.
  MTA New York City Transit (NTD ID 20008), Heavy Rail (HR), Directly Operated (DO).
-->
<script>
	import defaultData from '#lib/data/subway_monthly_ridership.json';
	import { stepRange } from '#lib/storyTimeline.js';
	import { inRangeMonth, RANGE_START_INDEX, RANGE_END_INDEX } from '#lib/storyRange.js';

	/**
	 * @type {{
	 *   data?: { date: string, upt: number }[],
	 *   baseYear?: number,
	 *   compareYear?: number,
	 *   progress?: number,
	 *   maxHeight?: number
	 * }}
	 */
	let {
		data = defaultData,
		baseYear = 2019,
		compareYear = 2025,
		progress = 1,
		maxHeight = 460
	} = $props();

	const uid = $props.id();

	// ---- data ---------------------------------------------------------------
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	const points = $derived(
		data
			.filter((d) => inRangeMonth(d.date))
			.map((d) => {
				const [y, m] = d.date.split('-').map(Number);
				return { year: y, month: m, t: y * 12 + (m - 1), upt: d.upt };
			})
	);

	const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
	const baseAvg = $derived(mean(points.filter((p) => p.year === baseYear).map((p) => p.upt)));
	const compareAvg = $derived(mean(points.filter((p) => p.year === compareYear).map((p) => p.upt)));
	const pctOfBase = $derived(compareAvg / baseAvg);
	const pctLess = $derived(1 - pctOfBase); // how much lower the compare year is

	// ---- story phases -------------------------------------------------------
	const clamp01 = (v) => Math.max(0, Math.min(1, v));
	const seg = (p, a, b) => clamp01((p - a) / (b - a));
	const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2);

	const tMin = $derived(points[0].t);
	const tMax = $derived(points[points.length - 1].t);
	const tBaseEnd = $derived(baseYear * 12 + 11); // Dec of base year

	// Steps come from the timeline; pauses between them hold the chart still
	const at = (name) => seg(progress, ...stepRange(name));
	const pLine1 = $derived(at('line2019'));
	const pRef1 = $derived(ease(at('avg2019')));
	const pLine2 = $derived(at('lineRest'));
	const pRef2 = $derived(ease(at('avg2025')));
	const pHi = $derived(ease(at('highlight')));

	// The month the line has been drawn up to (fractional)
	const revealT = $derived(
		pLine2 > 0 ? tBaseEnd + pLine2 * (tMax - tBaseEnd) : tMin + pLine1 * (tBaseEnd - tMin)
	);
	const lineStarted = $derived(pLine1 > 0);
	const lineDone = $derived(pLine2 >= 1);

	// Ridership at a fractional month, for the leading dot
	function valueAt(t) {
		const i = Math.floor(t - tMin);
		const a = points[Math.max(0, Math.min(points.length - 1, i))];
		const b = points[Math.max(0, Math.min(points.length - 1, i + 1))];
		const f = t - tMin - i;
		return a.upt + (b.upt - a.upt) * f;
	}

	// ---- formatting ---------------------------------------------------------
	const fmtM = (v, digits = 1) => `${(v / 1e6).toFixed(digits)}M`;
	const fmtPct = (v) => `${(v * 100).toFixed(1)}%`;
	const fmtMonth = (p) => `${MONTHS[p.month - 1]} ${p.year}`;

	// ---- layout -------------------------------------------------------------
	let width = $state(800);
	const narrow = $derived(width < 560);
	const height = $derived(Math.max(260, Math.min(maxHeight, narrow ? 360 : 460)));
	const margin = $derived({ top: 22, right: narrow ? 64 : 100, bottom: 32, left: narrow ? 44 : 52 });
	const innerW = $derived(Math.max(0, width - margin.left - margin.right));
	const innerH = $derived(height - margin.top - margin.bottom);

	const yMax = $derived(Math.ceil(Math.max(...points.map((p) => p.upt)) / 50e6) * 50e6);
	const x = (t) => ((t - RANGE_START_INDEX) / (RANGE_END_INDEX - RANGE_START_INDEX)) * innerW;
	const y = (v) => innerH - (v / yMax) * innerH;

	const yTicks = $derived(Array.from({ length: yMax / 50e6 + 1 }, (_, i) => i * 50e6));
	const years = $derived([...new Set(points.map((p) => p.year))]);

	const linePath = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${y(p.upt)}`).join(''));
	const areaPath = $derived(`${linePath}L${x(tMax)},${y(0)}L${x(tMin)},${y(0)}Z`);

	// Reference-line labels sit in the 2020-21 trough, where there is open space
	const labelX = $derived(x(tMin + 16));

	// ---- hover / keyboard (only over the part already drawn) ----------------
	let active = $state(/** @type {number | null} */ (null));
	const maxIndex = $derived(lineStarted ? Math.floor(revealT - tMin) : -1);
	const activePoint = $derived(active === null || active > maxIndex ? null : points[active]);

	function onPointerMove(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const t = RANGE_START_INDEX + ((e.clientX - rect.left) / innerW) * (RANGE_END_INDEX - RANGE_START_INDEX);
		active = Math.round(t - tMin);
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
	<h2>NYC Subway Ridership in Past Years</h2>

	<div class="chart" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-labelledby="{uid}-desc">
			<desc id="{uid}-desc">
				Area chart of monthly NYC subway ridership from {fmtMonth(points[0])} to
				{fmtMonth(points[points.length - 1])}. The {baseYear} monthly average was {fmtM(baseAvg)} trips;
				the {compareYear} monthly average was {fmtM(compareAvg)}, {fmtPct(pctLess)} less than {baseYear}.
			</desc>

			<defs>
				<clipPath id="{uid}-reveal">
					<rect x="-4" y="-10" width={lineStarted ? x(revealT) + 4 : 0} height={innerH + 20} />
				</clipPath>
			</defs>

			<g transform="translate({margin.left},{margin.top})">
				<!-- axes -->
				<text class="axis-title" x={-margin.left} y="-10">Monthly trips</text>
				{#each yTicks as v}
					<line class="grid" class:baseline={v === 0} x1="0" x2={innerW} y1={y(v)} y2={y(v)} />
					<text class="tick" x="-8" y={y(v)} dy="0.32em" text-anchor="end">
						{v === 0 ? '0' : `${v / 1e6}M`}
					</text>
				{/each}
				{#each years as yr}
					{@const tx = x(yr * 12)}
					<line class="xtick" x1={tx} x2={tx} y1={innerH} y2={innerH + 4} />
					<text class="tick" x={tx} y={innerH + 18} text-anchor={tx < 1 ? 'start' : 'middle'}>
						{narrow ? `'${String(yr).slice(2)}` : yr}
					</text>
				{/each}

				<!-- gap between the two averages, highlighted at the end -->
				<rect
					class="gap"
					x="0"
					y={y(baseAvg)}
					width={innerW}
					height={y(compareAvg) - y(baseAvg)}
					style="opacity:{pHi}"
				/>

				<!-- ridership, revealed left to right -->
				<g clip-path="url(#{uid}-reveal)">
					<path class="area" d={areaPath} />
					<path class="line" d={linePath} />
				</g>
				{#if lineStarted && !lineDone && !activePoint}
					<circle class="dot" cx={x(revealT)} cy={y(valueAt(revealT))} r="4.5" />
				{/if}

				<!-- 2019 average -->
				{#if pRef1 > 0}
					<line class="ref" x1="0" x2={innerW * pRef1} y1={y(baseAvg)} y2={y(baseAvg)} />
					<text class="ref-label" x={labelX} y={y(baseAvg) - 6} style="opacity:{seg(pRef1, 0.6, 1)}">
						{narrow ? `${baseYear} avg` : `${baseYear} average: ${fmtM(baseAvg)} / month`}
					</text>
				{/if}

				<!-- 2025 average -->
				{#if pRef2 > 0}
					<line class="ref" x1="0" x2={innerW * pRef2} y1={y(compareAvg)} y2={y(compareAvg)} />
					<text class="ref-label" x={labelX} y={y(compareAvg) + 15} style="opacity:{seg(pRef2, 0.6, 1)}">
						{narrow ? `${compareYear} avg` : `${compareYear} average: ${fmtM(compareAvg)} / month`}
					</text>
				{/if}

				<!-- 85% callout -->
				{#if pHi > 0}
					{@const midY = (y(baseAvg) + y(compareAvg)) / 2}
					<g transform="translate({innerW + 10},0)" style="opacity:{pHi}">
						<path class="bracket" d="M0,{y(baseAvg)}h6V{y(compareAvg)}h-6" />
						<g transform="translate(14,{midY}) scale({0.85 + 0.15 * pHi})">
							<text class="pct" dy="0.1em">{Math.round(pctLess * 100)}%</text>
							<text class="pct-sub" dy="1.45em">less than</text>
							<text class="pct-sub" dy="2.6em">{baseYear}</text>
						</g>
					</g>
				{/if}

				<!-- hover layer -->
				{#if activePoint}
					<line class="crosshair" x1={x(activePoint.t)} x2={x(activePoint.t)} y1="0" y2={innerH} />
					<circle class="dot" cx={x(activePoint.t)} cy={y(activePoint.upt)} r="4.5" />
				{/if}
				<rect
					class="hit"
					width={innerW}
					height={innerH}
					tabindex="0"
					role="slider"
					aria-label="Month: use left and right arrow keys to read values"
					aria-valuemin="0"
					aria-valuemax={Math.max(0, maxIndex)}
					aria-valuenow={active ?? 0}
					aria-valuetext={activePoint
						? `${fmtMonth(activePoint)}: ${fmtM(activePoint.upt)} trips, ${fmtPct(activePoint.upt / baseAvg)} of ${baseYear} average`
						: 'No month selected'}
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
				<div class="tip-month">{fmtMonth(activePoint)}</div>
				<div class="tip-row">
					<span class="key"></span>
					<strong>{fmtM(activePoint.upt)}</strong>
					<span class="muted">trips</span>
				</div>
				<div class="tip-sub">{fmtPct(activePoint.upt / baseAvg)} of {baseYear} avg month</div>
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
		--ref: #7a7974;
		--gap: rgba(122, 121, 116, 0.14);
		--border: rgba(11, 11, 11, 0.1);
		--series-1: #2a78d6;

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
			--ref: #a3a29b;
			--gap: rgba(163, 162, 155, 0.16);
			--border: rgba(255, 255, 255, 0.1);
			--series-1: #3987e5;
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

	.ref {
		stroke: var(--ref);
		stroke-width: 1.5;
		stroke-dasharray: 5 4;
	}
	.ref-label {
		fill: var(--text-secondary);
		font-size: 12px;
	}
	.gap {
		fill: var(--gap);
	}
	.bracket {
		fill: none;
		stroke: var(--text-secondary);
		stroke-width: 1.5;
	}
	.pct {
		fill: var(--text-primary);
		font-size: 22px;
		font-weight: 700;
	}
	.pct-sub {
		fill: var(--text-secondary);
		font-size: 11px;
	}

	.crosshair {
		stroke: var(--text-muted);
		stroke-width: 1;
	}
	.dot {
		fill: var(--series-1);
		stroke: var(--surface-1);
		stroke-width: 2;
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
	.muted,
	.tip-sub {
		color: var(--text-muted);
	}
	.tip-sub {
		margin-top: 2px;
	}
</style>
