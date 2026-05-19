---
title: Vue Singleton Composable 中 watch 失效问题
date: 2026-05-19T08:00:00+08:00
draft: false
tags: [ vue ]
collections: [ 随笔 ]
---

# Vue Singleton Composable 中 watch 失效

## 背景

在 `useContractGridStrategies` 里使用了 singleton store：

```js
let strategyStore;

export function useContractGridStrategies() {
  if (strategyStore) return strategyStore;

  // create refs, computed, watch...
  strategyStore = { ... };
  return strategyStore;
}
```

这个模式可以让多个页面共享同一份状态，例如 `strategies`、`selectedId`、`selectedStrategy` 和编辑表单 `form`。

问题出现在 store 初始化时注册的 `watch`：

```js
watch(
  selectedStrategy,
  (strategy) => {
    if (strategy) {
      Object.assign(form, strategy);
    }
  },
  { immediate: true },
);
```

现象是：路由跳转后 `selectedStrategy` 的值确实变了，但这个 `watch` 没有继续触发，导致 `form` 没有同步到当前策略。

## 根因

Vue 的 `watch` 是副作用，会被注册到当前 active effect scope。

如果 `useContractGridStrategies()` 第一次是在某个页面组件的 `setup()` 中调用，那么 composable 内部创建的 `watch` 默认会绑定到这个页面组件的 effect scope。

当这个页面组件因为路由切换被卸载时，Vue 会自动停止该组件 scope 下的 effects。于是：

- singleton store 对象仍然存在
- `selectedId`、`strategies`、`selectedStrategy` 等 ref/computed 仍然被 store 持有
- 但第一次创建的 `watch(selectedStrategy, ...)` 已经被停止

所以后续路由再改变 `selectedId` 时，`selectedStrategy` 可以变，但用于同步 `form` 的 watcher 不会再运行。

## computed 为什么通常不会有这个问题

`computed` 主要表达派生状态：

```js
const selectedStrategy = computed(() =>
  strategies.value.find((strategy) => strategy.id === selectedId.value)
);
```

它是懒执行的，后续组件读取 `selectedStrategy.value` 时，会根据当前的 `selectedId` 和 `strategies` 重新计算。

只要这个 computed ref 还被 singleton store 持有，通常就不会因为首次调用它的组件卸载而表现为“值不更新”。

但 `watch` 不一样。`watch` 的目的就是执行副作用，例如：

- 同步另一个状态
- 写入 `localStorage`
- 调接口
- 打日志

这些副作用需要明确生命周期。放在 singleton composable 中时，不能无意识地绑定到某个页面组件的生命周期。

## 修复方式

把 singleton store 内部的 watcher 放到 detached `effectScope` 中：

```js
import { computed, effectScope, reactive, ref, watch } from 'vue';

let strategyStore;
let strategyStoreScope;

export function useContractGridStrategies() {
  if (strategyStore) return strategyStore;

  const strategies = ref(loadStrategies());
  const selectedId = ref(strategies.value[0]?.id ?? '');
  const form = reactive({ ...defaultInput });
  const selectedStrategy = computed(() =>
    strategies.value.find((strategy) => strategy.id === selectedId.value)
  );

  strategyStoreScope = effectScope(true);

  strategyStoreScope.run(() => {
    watch(
      selectedStrategy,
      (strategy) => {
        if (strategy) {
          Object.assign(form, strategy);
        }
      },
      { immediate: true },
    );
  });

  strategyStore = {
    form,
    selectedId,
    selectedStrategy,
  };

  return strategyStore;
}
```

`effectScope(true)` 表示创建 detached scope。它不会挂到当前组件 scope 下，因此不会跟着首次调用 composable 的页面卸载而停止。

## 什么时候需要这样做

适合使用 detached `effectScope` 的场景：

- composable 明确是 singleton/global store
- composable 内部注册了长期存在的 `watch` 或 `watchEffect`
- watcher 的生命周期应该跟 store 一致，而不是跟某个页面组件一致
- store 会被多个路由页面复用

不一定需要这样做的场景：

- composable 每次调用都创建独立局部状态
- watcher 只服务当前组件
- 组件卸载时 watcher 本来就应该停止
- 只是用 `computed` 推导值，没有长期副作用

## 经验规则

如果 composable 是 singleton，并且里面有 `watch`，就要主动问一句：

这个 watcher 的生命周期应该属于谁？

- 属于当前页面组件：普通 `watch` 就可以
- 属于全局 store：使用 detached `effectScope`
- 只是推导值：优先用 `computed`

这次问题的本质不是 `computed` 缓存失效，而是 singleton composable 里的 watcher 被首次调用它的组件 scope 自动停止了。
