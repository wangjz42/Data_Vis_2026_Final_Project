// Scroll timeline for the subway ridership story.
// Every step is measured in screen heights of scrolling, so a pause of 0.5
// always takes half a screen to scroll through, whatever the window size.

export const PAUSE = 0.5;

export const STEPS = [
	{ name: 'axes', screens: 0.35 }, // axes only
	{ name: 'line2019', screens: 1.05 }, // line draws Jan 2019 -> Dec 2019
	{ name: 'pause', screens: PAUSE },
	{ name: 'avg2019', screens: 0.63 }, // 2019 average line draws in
	{ name: 'pause', screens: PAUSE },
	{ name: 'lineRest', screens: 1.89 }, // line draws Jan 2020 -> Dec 2025
	{ name: 'pause', screens: PAUSE },
	{ name: 'avg2025', screens: 0.63 }, // 2025 average line draws in
	{ name: 'highlight', screens: 0.63 }, // gap shaded, "15% less" appears
	{ name: 'end', screens: 0.35 } // hold the finished chart
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
