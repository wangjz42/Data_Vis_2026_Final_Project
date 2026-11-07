<script>
	import SubwayRidershipStory from '#lib/components/SubwayRidershipStory.svelte';
</script>

<main>
	<SubwayRidershipStory />
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f9f9f7;
	}
	@media (prefers-color-scheme: dark) {
		:global(body) {
			background: #0d0d0d;
		}
	}
</style>
