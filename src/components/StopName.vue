<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{
  name: string;
  charLimit: number;
  isInactive: boolean;
  compact: boolean;
  backgroundColor?: string;
}>();

const lines = computed(() => {
  const words = props.name.split(" ");
  let currentLine = "";
  const result = [];

  words.forEach((word) => {
    if (currentLine.length + word.length + 1 > props.charLimit) {
      result.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += " " + word;
    }
  });

  if (currentLine.length > 0) {
    result.push(currentLine.trim());
  }

  if (result.at(0) === "") {
    result.shift();
  }

  return result;
});

const formattedName = computed(() => {
  return lines.value.reduce(
    (prev, curr, i) => prev + "\n" + " ".repeat(6).repeat(i) + curr,
    "",
  );
});

const width = computed(() => {
  if (props.compact) {
    return 0;
  }

  const longestLineCharCount = Math.max(
    ...lines.value.map((line) => line.length),
  );
  const linesCount = lines.value.length;

  return longestLineCharCount * 0.1 + linesCount * 7;
});

const svgPath = computed(() => {
  let path = "";
  const lineHeight = 8;
  lines.value.forEach((line, i) => {
    const y = i * lineHeight;
    const xOffset = i * 10;
    const width = line.length * 5.3;
    path += `M${xOffset},${y} h${width} a5,5 0 0 1 5,5 v${
      lineHeight - 2
    } a5,5 0 0 1 -5,5 h-${width} a5,5 0 0 1 -5,-5 v-${
      lineHeight - 2
    } a5,5 0 0 1 5,-5 Z `;
  });
  return path;
});
</script>

<template>
  <div
    :class="{ inactive: isInactive, labelHidden: compact }"
    :style="{
      width: width + 'vh',
    }"
  >
    <template v-if="backgroundColor">
      <svg class="lettersBackground" viewBox="0 0 100 100">
        <path :d="svgPath" :fill="backgroundColor" />
      </svg>
      <svg
        class="dotBackground"
        width="25"
        height="44"
        viewBox="0 0 25 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 33.5V13.5662C10 13.2149 10.1843 12.8894 10.4855 12.7087L15 10"
          :stroke="backgroundColor"
          stroke-width="20"
          stroke-linecap="round"
        />
      </svg>
    </template>
    <span :class="{ whiteText: backgroundColor === 'var(--title-color)' }">{{
      formattedName
    }}</span>
  </div>
</template>

<style scoped>
div {
  display: flex;
  flex-direction: column;
  height: 20vh;
  transform: translateX(-2%);
}

span {
  white-space: pre;
  display: block;
  transform: translateY(9vh) translateX(-3vh) rotate(-30deg);
  transform-origin: top left;
  font-size: 5vh;
  font-weight: bold;
  color: var(--title-color);
  line-height: 4vh;
}

span.whiteText {
  color: white;
}

.labelHidden span {
  display: none;
}

.inactive span {
  color: #cfcaca;
}

.dotBackground {
  width: auto;
  height: 4.2vh;
  bottom: 0;
  left: 0;
  position: absolute;
  transform: translateY(-30%) translateX(20%) scale(3.6);
}

.lettersBackground {
  height: 9.3vh;
  position: absolute;
  top: 50%;
  left: 0;
  transform-origin: top left;
  transform: rotate(-30deg) scale(5);
  pointer-events: none;
}
</style>
