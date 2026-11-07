// Time range shown in every chart of the story. Change it here to change them all.
// Format: 'YYYY-MM' (first and last month, inclusive).
export const RANGE_START = '2019-01';
export const RANGE_END = '2025-12';

const toIndex = (ym) => {
	const [y, m] = ym.split('-').map(Number);
	return y * 12 + (m - 1);
};

/** Month index (year * 12 + month - 1) of the first and last month; every chart's x-axis spans these */
export const RANGE_START_INDEX = toIndex(RANGE_START);
export const RANGE_END_INDEX = toIndex(RANGE_END);

/** True if the month 'YYYY-MM' is inside the story range */
export function inRangeMonth(ym) {
	const i = toIndex(ym);
	return i >= toIndex(RANGE_START) && i <= toIndex(RANGE_END);
}

/** True if the whole quarter (year, 1-4) is inside the story range */
export function inRangeQuarter(year, q) {
	const first = year * 12 + (q - 1) * 3;
	return first >= toIndex(RANGE_START) && first + 2 <= toIndex(RANGE_END);
}
