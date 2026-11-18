<script lang="ts">
	import { Questionnaire as QuestionnairePrimitive } from '@shadcn-svelte/primitives/questionnaire';
	import { cn } from '#lib/shared/ui/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: QuestionnairePrimitive.ErrorProps = $props();
</script>

<QuestionnairePrimitive.Error
	bind:ref
	data-slot="questionnaire-error"
	class={cn('mt-2 text-sm text-destructive', className)}
	{...restProps}
/>
