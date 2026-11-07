<script setup lang="ts">
import { computed } from 'vue'
import { renderWithAnchors } from '@/utils/markdown'

const props = defineProps<{
  content: string
}>()

const html = computed(() => renderWithAnchors(props.content))
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>
