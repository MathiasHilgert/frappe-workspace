<script lang="ts">
	import * as Collapsible from '#lib/shared/ui/primitives/collapsible/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { cn, type WithoutChild } from '#lib/shared/ui/utils.js';
	import TraceIcon from './trace-icon.svelte';
	import type { Collapsible as CollapsiblePrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChild<CollapsiblePrimitive.TriggerProps> = $props();
</script>

<Collapsible.Trigger
	bind:ref
	data-slot="trace-collapsible-trigger"
	class={cn(
		'group/trace-collapsible-trigger flex w-fit max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-lg text-left text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 has-[[data-status=error]]:text-destructive',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<TraceIcon class="transition-transform group-aria-expanded/trace-collapsible-trigger:rotate-90">
		<HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
	</TraceIcon>
</Collapsible.Trigger>
