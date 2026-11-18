<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRightIcon } from '@hugeicons/core-free-icons';
	import { buttonVariants, type ButtonVariant } from '#lib/shared/ui/primitives/button/index.js';
	import { cn } from '#lib/shared/ui/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = 'ghost',
		...restProps
	}: CalendarPrimitive.NextButtonProps & {
		variant?: ButtonVariant;
	} = $props();
</script>

{#snippet Fallback()}
	<HugeiconsIcon
		icon={ArrowRightIcon}
		strokeWidth={2}
		class={cn('cn-rtl-flip size-4', className)}
	/>
{/snippet}

<CalendarPrimitive.NextButton
	bind:ref
	class={cn(
		buttonVariants({ variant }),
		'size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50',
		'rtl:rotate-180',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</CalendarPrimitive.NextButton>
