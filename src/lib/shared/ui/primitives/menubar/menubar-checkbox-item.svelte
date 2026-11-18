<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { MinusSignIcon } from '@hugeicons/core-free-icons';
	import { Tick02Icon } from '@hugeicons/core-free-icons';
	import { cn, type WithoutChildrenOrChild } from '#lib/shared/ui/utils.js';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		inset,
		children: childrenProp,
		closeOnSelect = false,
		...restProps
	}: WithoutChildrenOrChild<MenubarPrimitive.CheckboxItemProps> & {
		inset?: boolean;
		children?: Snippet;
	} = $props();
</script>

<MenubarPrimitive.CheckboxItem
	bind:ref
	{closeOnSelect}
	bind:checked
	bind:indeterminate
	data-slot="menubar-checkbox-item"
	data-inset={inset}
	class={cn(
		'relative flex cursor-default items-center gap-2.5 rounded-xl py-2 pr-3 pl-9.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-9.5 data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
		className
	)}
	{...restProps}
>
	{#snippet children({ checked: checked, indeterminate: indeterminate })}
		<span
			class="pointer-events-none absolute left-3 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4"
		>
			{#if indeterminate}
				<HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />
			{:else if checked}
				<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
			{/if}
		</span>
		{@render childrenProp?.()}
	{/snippet}
</MenubarPrimitive.CheckboxItem>
