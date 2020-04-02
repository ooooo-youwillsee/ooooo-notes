<template>
  <div>
    <div v-for="i in c">&ensp;</div>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'Indent',
  props: {
    c: {
      type: Number,
      default: 2
    }
  }
}
</script>

<style scoped>
  div {
    display: inline-block;
  }
</style>
