// Scroll timeline for the whole story (blue card -> subway ridership -> orange card -> office vacancy -> office rent).
// Every step is measured in screen heights of scrolling, so a pause of 0.5
// always takes half a screen to scroll through, whatever the window size.
// Steps run in this order; change a number to make that step faster or slower.

export const PAUSE = 0.5;

export const STEPS = [
	// --- Opening chapter card (blue) ---
	// The page opens with this card covering the screen; it then scrolls off the top.
	{ name: 'introHold', screens: 0.6 }, // "First, we'll look at NYC subway ridership"
	{ name: 'introOut', screens: 1 }, // card scrolls off the top, subway chart underneath

	// --- Subway ridership ---
	{ name: 'axes', screens: 0.35 }, // axes only
	{ name: 'line2019', screens: 1.05 }, // line draws Jan 2019 -> Dec 2019
	{ name: 'pause', screens: PAUSE },
	{ name: 'avg2019', screens: 0.63 }, // 2019 average line draws in
	{ name: 'pause', screens: PAUSE },
	{ name: 'lineRest', screens: 1.89 }, // line draws Jan 2020 -> Dec 2025
	{ name: 'pause', screens: PAUSE },
	{ name: 'avg2025', screens: 0.63 }, // 2025 average line draws in
	{ name: 'highlight', screens: 0.63 }, // gap shaded, "15% less" appears
	{ name: 'subwayEnd', screens: 0.35 }, // hold the finished chart

	// --- Chapter card transition ---
	// cardIn / cardOut are 1 screen each so the card moves exactly with the scroll,
	// like a normal page section passing over the pinned chart.
	{ name: 'pause', screens: PAUSE },
	{ name: 'cardIn', screens: 1 }, // orange card scrolls up from the bottom
	{ name: 'cardHold', screens: 0.9 }, // "We'll now look at the office space rental market"
	{ name: 'cardOut', screens: 1 }, // card scrolls off the top, vacancy chart underneath

	// --- Office vacancy ---
	{ name: 'vacancyAxes', screens: 0.35 }, // axes only
	{ name: 'vacancyLine', screens: 1.8 }, // line draws left to right
	{ name: 'vacancyEnd', screens: 0.35 }, // hold the finished chart

	// --- Office rent (same chart, vacancy kept as a grey ghost) ---
	{ name: 'pause', screens: PAUSE },
	{ name: 'vacancyFade', screens: 0.6 }, // vacancy line and area fade to grey
	{ name: 'titleSwap', screens: 0.8 }, // title + y-axis labels slide up and out, rent ones slide in
	{ name: 'pause', screens: PAUSE },
	{ name: 'rentLine', screens: 1.8 }, // rent line draws left to right in orange
	{ name: 'rentEnd', screens: 0.5 } // hold the finished chart
];

/** Total scroll distance of the story, in screen heights */
export const TOTAL_SCREENS = STEPS.reduce((s, step) => s + step.screens, 0);

/** Start and end of a named step as fractions of overall progress (0-1) */
export function stepRange(name) {
	let start = 0;
	for (const step of STEPS) {
		if (step.name === name) return [start / TOTAL_SCREENS, (start + step.screens) / TOTAL_SCREENS];
		start += step.screens;
	}
	throw new Error(`Unknown story step: ${name}`);
}

/** How far through a named step `progress` is, from 0 (not started) to 1 (done) */
export function stepProgress(progress, name) {
	const [a, b] = stepRange(name);
	return Math.max(0, Math.min(1, (progress - a) / (b - a)));
}
