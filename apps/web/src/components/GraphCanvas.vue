<template>
  <div class="graph-stage glass-panel">
    <svg class="graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line
        v-for="edge in renderedEdges"
        :key="edge.id"
        :x1="edge.source.x"
        :y1="edge.source.y"
        :x2="edge.target.x"
        :y2="edge.target.y"
        class="graph-edge"
        :class="{ dimmed: isEdgeDimmed(edge.id) }"
      />
    </svg>

    <button
      v-for="node in props.nodes"
      :key="node.id"
      class="graph-node"
      :class="[node.type, { dimmed: isNodeDimmed(node.id), active: currentFocusId === node.id }]"
      :style="nodeStyle(node.id)"
      @mouseenter="hoveredId = node.id"
      @mouseleave="hoveredId = null"
      @click="emit('select', node)"
    >
      <strong>{{ node.label }}</strong>
      <span>{{ node.subtitle }}</span>
    </button>

    <div class="graph-legend">
      <span>注册号码</span>
      <span>主邮箱</span>
      <span>辅助邮箱</span>
      <span>辅助号码</span>
      <span>平台标签</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GraphEdge, GraphNode } from '@/types';

const props = defineProps<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId?: string | null;
}>();

const emit = defineEmits<{
  select: [GraphNode];
}>();

const hoveredId = ref<string | null>(null);

const groupedNodes = computed(() => {
  const groups: Record<GraphNode['type'], GraphNode[]> = {
    registerPhone: [],
    primaryEmail: [],
    recoveryEmail: [],
    recoveryPhone: [],
    platform: []
  };

  for (const node of props.nodes) {
    groups[node.type].push(node);
  }

  return groups;
});

const currentFocusId = computed(() => props.selectedId || hoveredId.value);

const positions = computed(() => {
  const result: Record<string, { x: number; y: number }> = {};

  const assignColumn = (type: GraphNode['type'], x: number) => {
    const nodes = groupedNodes.value[type];
    nodes.forEach((node, index) => {
      const total = nodes.length;
      const y = total <= 1 ? 50 : 14 + (index * 64) / Math.max(total - 1, 1);
      result[node.id] = { x, y };
    });
  };

  assignColumn('registerPhone', 12);
  assignColumn('primaryEmail', 34);
  assignColumn('recoveryEmail', 58);
  assignColumn('recoveryPhone', 82);

  groupedNodes.value.platform.forEach((node, index) => {
    const total = groupedNodes.value.platform.length;
    const x = total <= 1 ? 50 : 18 + (index * 64) / Math.max(total - 1, 1);
    result[node.id] = { x, y: 88 };
  });

  return result;
});

const adjacencyMap = computed(() => {
  const map = new Map<string, Set<string>>();

  for (const edge of props.edges) {
    if (!map.has(edge.source)) {
      map.set(edge.source, new Set());
    }
    if (!map.has(edge.target)) {
      map.set(edge.target, new Set());
    }

    map.get(edge.source)?.add(edge.target);
    map.get(edge.target)?.add(edge.source);
  }

  return map;
});

const highlightedNodeIds = computed(() => {
  const focus = currentFocusId.value;
  if (!focus) {
    return new Set<string>();
  }

  return new Set([focus, ...(adjacencyMap.value.get(focus) || [])]);
});

const highlightedEdgeIds = computed(() => {
  const focus = currentFocusId.value;
  if (!focus) {
    return new Set<string>();
  }

  return new Set(
    props.edges
      .filter((edge) => edge.source === focus || edge.target === focus)
      .map((edge) => edge.id)
  );
});

const renderedEdges = computed(() =>
  props.edges.map((edge) => ({
    ...edge,
    source: positions.value[edge.source],
    target: positions.value[edge.target]
  }))
);

function nodeStyle(nodeId: string) {
  const position = positions.value[nodeId];
  return {
    left: `${position?.x || 0}%`,
    top: `${position?.y || 0}%`
  };
}

function isNodeDimmed(nodeId: string) {
  return Boolean(currentFocusId.value && !highlightedNodeIds.value.has(nodeId));
}

function isEdgeDimmed(edgeId: string) {
  return Boolean(currentFocusId.value && !highlightedEdgeIds.value.has(edgeId));
}
</script>
