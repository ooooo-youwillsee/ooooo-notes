<template>
  <div>
    <div v-for="i in c">&nbsp;&nbsp;</div>
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
