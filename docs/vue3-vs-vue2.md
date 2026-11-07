# Vue 3 与 Vue 2 学习手册

> 面向已经熟悉 Vue 2、需要系统迁移到 Vue 3 的开发者。
> 示例尽量取自本仓库（Vue 3.5 + Pinia + vue-router 4 + Vite），文件路径可直接跳转对照。

---

## 目录

1. [核心差异总览](#1-核心差异总览)
2. [响应式系统](#2-响应式系统)
3. [应用创建与全局 API](#3-应用创建与全局-api)
4. [Composition API](#4-composition-api)
5. [生命周期](#5-生命周期)
6. [组件通信](#6-组件通信)
7. [模板与指令](#7-模板与指令)
8. [样式与 CSS](#8-样式与-css)
9. [路由 vue-router 3 → 4](#9-路由-vue-router-3--4)
10. [状态管理 Vuex → Pinia](#10-状态管理-vuex--pinia)
11. [TypeScript 与工程化](#11-typescript-与工程化)
12. [其他 API 变化](#12-其他-api-变化)
13. [常见迁移坑](#13-常见迁移坑)
14. [学习路径](#14-学习路径)
15. [本仓库对照索引](#15-本仓库对照索引)

---

## 1. 核心差异总览

| 维度 | Vue 2 | Vue 3 |
| --- | --- | --- |
| 响应式实现 | `Object.defineProperty` 递归劫持 | `Proxy` 代理整个对象 |
| 组件写法 | Options API 为主 | Composition API 为主，Options API 仍可用 |
| 应用创建 | `new Vue({ render: h => h(App) }).$mount('#app')` | `createApp(App).mount('#app')` |
| 全局 API | `Vue.use / Vue.component / Vue.directive` | `app.use / app.component / app.directive` |
| 根节点 | 必须单根 | 支持多根（Fragment） |
| 生命周期 | `beforeDestroy / destroyed` | `beforeUnmount / unmounted` |
| 组件 `v-model` | `value` + `input` | `modelValue` + `update:modelValue` |
| 双向绑定语法 | `:foo.sync="x"` | `v-model:foo="x"` |
| 多 v-model | 不支持 | 支持，可绑定多个字段 |
| `filters` | 支持 | 移除，用 computed / 方法替代 |
| `$listeners` | 独立存在 | 合并进 `$attrs` |
| `$children` | 支持 | 移除，改用 `ref` |
| 事件总线 | `$on / $off / $emit` | 实例事件 API 移除，用 mitt / Pinia |
| `.native` 修饰符 | 支持 | 移除，监听器默认透传 |
| `v-if` / `v-for` 优先级 | `v-for` 更高 | `v-if` 更高 |
| 全局类型 | 无官方 TS 重写 | 源码 TypeScript 重写，类型完善 |
| 构建工具 | Vue CLI（webpack） | Vite（开发用 esbuild，生产用 Rollup） |
| 新内置能力 | 无 | `Teleport`、`Suspense`、`<script setup>`、`defineModel` |

仓库版本参考：`package.json` 中 `vue ^3.5.12`、`vue-router ^4.4.5`、`pinia ^2.2.4`。

---

## 2. 响应式系统

### 2.1 原理差异

Vue 2 用 `Object.defineProperty` 在初始化时递归遍历 `data`，为每个属性定义 `getter/setter`：

```js
// Vue 2 的近似实现
function defineReactive(obj, key, val) {
  Object.defineProperty(obj, key, {
    get() {
      return val
    },
    set(next) {
      val = next
      dep.notify()
    },
  })
}
```

这种方式有三个典型限制：

- **新增/删除属性不响应**，必须用 `Vue.set` / `Vue.delete`。
- **数组索引赋值、`length` 修改不响应**，Vue 2 通过重写 `push/pop/splice` 等方法绕开。
- **初始化时就要递归遍历整棵对象**，大对象首次渲染成本高。

Vue 3 改用 `Proxy` 代理整个对象，按访问惰性收集依赖：

```js
const state = new Proxy({ list: [] }, {
  get(target, key, receiver) {
    track(target, key)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    const ok = Reflect.set(target, key, value, receiver)
    trigger(target, key)
    return ok
  },
})
```

结果：新增/删除属性、数组索引、`length`、`Map/Set` 等都能被追踪，`$set/$delete` 不再需要。

### 2.2 三种声明响应式数据的方式

| API | 适用场景 | 注意 |
| --- | --- | --- |
| `ref(value)` | 基本类型、单值、需要整体替换 | 脚本里用 `.value`，模板里自动解包 |
| `reactive(object)` | 对象/数组的聚合状态 | 解构会丢失响应性，需 `toRefs` |
| `shallowRef` / `shallowReactive` | 大对象、只关心整体替换 | 不深度追踪，性能更好 |

```ts
import { reactive, ref, toRefs } from 'vue'

const count = ref(0)
count.value++

const state = reactive({ keyword: '', list: [] as string[] })
state.list.push('vue') // Vue 2 里也可以，但 Vue 3 对索引赋值同样响应
state.list[0] = 'vue3'

const { keyword, list } = toRefs(state) // 解构后仍是响应式 ref
```

本仓库直接使用 `ref` 管理列表：`src/stores/notes.ts:19` 的 `const notes = ref<Note[]>(...)`，之后通过 `notes.value` 读写。

### 2.3 迁移要点

```js
// Vue 2
this.$set(this.obj, 'newKey', 1)
this.$delete(this.obj, 'oldKey')
Vue.set(arr, 0, 'x')
```

```ts
// Vue 3：直接操作即可
obj.newKey = 1
delete obj.oldKey
arr[0] = 'x'
```

> 唯一仍需注意：如果整个对象被替换，要保证替换的是响应式对象本身（`state.value = {...}`），而不是把响应式对象的引用丢掉。

---

## 3. 应用创建与全局 API

### 3.1 创建应用

```js
// Vue 2 main.js
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

Vue.use(router)
Vue.use(store)
Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app')
```

```ts
// Vue 3 main.ts（本仓库 src/main.ts）
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Antd)
app.mount('#app')
```

关键变化：

- `new Vue()` 变成 `createApp()`，返回的应用实例与组件实例分离。
- `Vue.xxx` 全局 API 全部迁移到 `app.xxx`。
- 一个页面可以创建多个独立应用，互不污染全局配置。

### 3.2 全局 API 对照

| Vue 2 | Vue 3 |
| --- | --- |
| `Vue.use(plugin)` | `app.use(plugin)` |
| `Vue.component(name, comp)` | `app.component(name, comp)` |
| `Vue.directive(name, def)` | `app.directive(name, def)` |
| `Vue.mixin(mixin)` | `app.mixin(mixin)` |
| `Vue.prototype.$http = x` | `app.config.globalProperties.$http = x` |
| `Vue.config.errorHandler` | `app.config.errorHandler` |
| `Vue.observable(obj)` | `reactive(obj)` |
| `Vue.set / Vue.delete` | 移除，直接赋值/删除 |
| `Vue.filter` | 移除，用 computed / 方法 |
| `Vue.extend` | 移除，用 `defineComponent` |

本仓库把 Ant Design Vue 作为插件整体注册（`src/main.ts:15`），所以模板里可以直接写 `a-button`、`a-select` 等，无需逐个导入组件。

---

## 4. Composition API

这是 Vue 3 最核心的变化。Options API 仍完全可用，但新项目推荐 Composition API，原因是逻辑可以按功能聚合、可抽成函数复用、TypeScript 推导更自然。

### 4.1 Options API vs Composition API

同一个计数器：

```js
// Vue 2 Options API
export default {
  data() {
    return { count: 0 }
  },
  computed: {
    double() {
      return this.count * 2
    },
  },
  methods: {
    inc() {
      this.count++
    },
  },
  mounted() {
    console.log('mounted')
  },
}
```

```vue
<!-- Vue 3 Composition API -->
<script setup>
import { computed, onMounted, ref } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)
function inc() {
  count.value++
}

onMounted(() => console.log('mounted'))
</script>
```

### 4.2 `<script setup>` 与 `setup()`

- `setup()`：在 `beforeCreate` 之前执行，返回的对象暴露给模板；需要手动 `return`。
- `<script setup>`：编译期语法糖，顶层变量/函数自动暴露给模板，代码更短，类型推导最好。

```vue
<script setup lang="ts">
import { ref } from 'vue'

const title = ref('')
const emit = defineEmits<{ (e: 'save', value: string): void }>()
defineProps<{ noteId: string }>()

function save() {
  emit('save', title.value)
}
</script>
```

本仓库所有组件都使用 `<script setup lang="ts">`，例如 `src/views/NoteEditView.vue:1`、`src/components/NoteCard.vue:1`。

### 4.3 `ref` 与 `reactive` 的选型

| 场景 | 推荐 |
| --- | --- |
| 字符串/数字/布尔 | `ref` |
| 需要整体替换的对象 | `ref` |
| 多个字段一起更新、不需要替换引用 | `reactive` |
| 从 `reactive` 中解构 | 配合 `toRefs` |
| 只想追踪第一层 | `shallowRef` / `shallowReactive` |

常见错误：

```ts
const state = reactive({ count: 0 })
const { count: broken } = state // ❌ 解构后失去响应性
const { count } = toRefs(state) // ✅ count 是 ref，模板/脚本需按 ref 使用
```

模板中 `ref` 会自动解包，所以本仓库模板里写 `notesStore.notes.length`，脚本里则必须写 `notes.value`。

### 4.4 `computed`

```ts
import { computed, ref } from 'vue'

const notes = ref<Note[]>([])
const sortedByUpdated = computed(() =>
  [...notes.value].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ),
)
```

Vue 3 支持可写 `computed`（getter + setter），本仓库用它桥接 `v-model` 与 `null` 值：`src/views/NoteEditView.vue:41`。

```ts
const categoryValue = computed({
  get: () => categoryId.value ?? '',
  set: (val: string) => {
    categoryId.value = val || null
  },
})
```

### 4.5 `watch` 与 `watchEffect`

```ts
import { ref, watch, watchEffect } from 'vue'

const keyword = ref('')

// 监听单个来源，带配置
watch(keyword, (val, oldVal) => {
  console.log(val, oldVal)
}, { immediate: true, deep: false })

// 监听多个来源
const sortBy = ref<'updated' | 'created'>('updated')
watch([keyword, sortBy], ([kw, sort]) => {
  console.log(kw, sort)
})

// 监听 getter（可监听对象里的某个字段）
watch(() => route.fullPath, load, { immediate: true })

// 自动收集依赖，回调里用到了谁就监听谁
watchEffect(() => {
  console.log(keyword.value)
})
```

| 对比 | `watch` | `watchEffect` |
| --- | --- | --- |
| 依赖收集 | 显式指定来源 | 自动收集回调内依赖 |
| 是否立即执行 | 默认否，可 `immediate` | 默认立即执行 |
| 是否能拿到旧值 | 能 | 不能 |
| 适合场景 | 需要精确控制 | 副作用依赖较多 |

`watch` 的常用选项：`immediate`、`deep`、`flush: 'pre' | 'post' | 'sync'`、`once`（3.4+）。

### 4.6 props / emits / expose

```vue
<script setup lang="ts">
import type { Note } from '@/types'

const props = defineProps<{
  note: Note
  tags?: string[]
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'delete', id: string): void
}>()

function open() {
  emit('open', props.note.id)
}
</script>
```

- `defineProps` / `defineEmits` 是编译宏，无需导入。
- 默认值用 `withDefaults`：

```ts
const props = withDefaults(defineProps<{ size?: 'sm' | 'lg' }>(), { size: 'sm' })
```

- 父组件通过模板 `ref` 访问子组件时，`<script setup>` 默认关闭，需要 `defineExpose`：

```ts
const inputRef = ref<HTMLInputElement | null>(null)
defineExpose({ focus: () => inputRef.value?.focus() })
```

### 4.7 生命周期钩子映射

| Vue 2 | Vue 3（Composition API） |
| --- | --- |
| `beforeCreate` | `setup()` 开头 |
| `created` | `setup()` 内 |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |
| `activated` | `onActivated` |
| `deactivated` | `onDeactivated` |
| `errorCaptured` | `onErrorCaptured` |

本仓库在 `src/views/NoteEditView.vue:121` 使用 `onMounted` / `onBeforeUnmount` 注册和移除键盘事件。

### 4.8 `provide` / `inject`

跨层级传值，替代部分 Vuex 场景：

```ts
// 祖先
import { provide, ref } from 'vue'
const theme = ref('light')
provide('theme', theme)

// 后代
import { inject } from 'vue'
const theme = inject<Ref<string>>('theme', ref('light'))
```

注意：`provide` 的值本身不会自动变成响应式，传 `ref` / `reactive` 才具备响应性。

### 4.9 组合式函数（Composables）

Options API 用 mixin 复用逻辑，容易出现来源不明、命名冲突。Composition API 用普通函数复用：

```ts
// composables/useNotes.ts
import { computed } from 'vue'
import { useNotesStore } from '@/stores/notes'

export function useStarredNotes() {
  const notesStore = useNotesStore()
  const starred = computed(() => notesStore.starredNotes)
  return { starred }
}
```

约定：以 `use` 开头，内部可以调用其他组合式函数，返回 `ref` / `reactive` / 方法。

---

## 5. 生命周期

除了上表的钩子改名，还有几个行为差异：

1. **`setup()` 没有 `this`**。需要组件实例时用 `getCurrentInstance()`，但应尽量少用。
2. **`created` 不再是独立钩子**。在 `setup()` 或 `<script setup>` 顶层直接执行即可。
3. **同一钩子可注册多次**，按注册顺序执行。
4. **`onUnmounted` 常用于清理副作用**：定时器、事件监听、订阅。

```ts
import { onBeforeUnmount, onMounted } from 'vue'

function handleKeydown(e: KeyboardEvent) {
  // ...
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
```

---

## 6. 组件通信

| 方式 | Vue 2 | Vue 3 |
| --- | --- | --- |
| 父传子 | `props` | `props`，类型可推导 |
| 子传父 | `this.$emit` | `emit()` / `defineEmits` |
| 双向绑定 | `value` + `input` | `modelValue` + `update:modelValue` |
| 多字段双向绑定 | `.sync` | `v-model:foo` |
| 透传属性 | `$attrs`（不含 class/style） | `$attrs`（含 class/style） |
| 透传事件 | `$listeners` + `.native` | 合并进 `$attrs`，默认透传 |
| 访问子组件 | `this.$refs` | 模板 `ref` + `defineExpose` |
| 跨层级 | `provide/inject` | `provide/inject` |
| 全局状态 | Vuex / 事件总线 | Pinia / mitt / provide |
| 访问父/根 | `$parent` / `$root` | 仍存在，但不推荐 |

### 6.1 组件 `v-model`

Vue 2：

```vue
<!-- 子组件 -->
<template>
  <input :value="value" @input="$emit('input', $event.target.value)" />
</template>
<script>
export default {
  props: ['value'],
  model: { prop: 'value', event: 'input' },
}
</script>
```

Vue 3：

```vue
<!-- 子组件 -->
<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <input
    :value="props.modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
```

本仓库仍使用显式的 `modelValue` + `update:modelValue` 写法：`src/components/MarkdownEditor.vue:7`、`src/components/TagSelect.vue:5`。

Vue 3.4+ 可以用 `defineModel` 进一步简化：

```vue
<script setup lang="ts">
const model = defineModel<string>({ required: true })
const title = defineModel<string>('title', { default: '' })
</script>

<template>
  <input v-model="model" />
  <input v-model="title" />
</template>
```

### 6.2 `.sync` → `v-model:prop`

```vue
<!-- Vue 2 -->
<Child :visible.sync="visible" />

<!-- Vue 3 -->
<Child v-model:visible="visible" />
```

子组件对应 `visible` prop 和 `update:visible` 事件。

### 6.3 `.native` 移除

Vue 2 需要 `.native` 才能监听组件根元素的原生事件；Vue 3 中未声明为 `emits` 的监听器会自动落到根元素上（fallthrough）。

```vue
<!-- Vue 2 -->
<MyButton @click.native="handle" />

<!-- Vue 3 -->
<MyButton @click="handle" />
```

如果子组件有多个根节点，需要显式 `v-bind="$attrs"` 到目标元素，否则会警告。

### 6.4 事件总线

Vue 3 移除了实例上的 `$on / $off / $once`，不能用 `new Vue()` 做事件总线。可选方案：

```ts
// mitt
import mitt from 'mitt'
export const bus = mitt<{ 'note:saved': string }>()

bus.on('note:saved', (id) => console.log(id))
bus.emit('note:saved', 'n1')
```

更推荐用 Pinia 管理共享状态，或用 `provide/inject` 传递回调。

---

## 7. 模板与指令

### 7.1 多根节点（Fragment）

Vue 2 组件模板必须只有一个根节点；Vue 3 允许：

```vue
<template>
  <header>标题</header>
  <main>内容</main>
  <footer>页脚</footer>
</template>
```

注意：多根组件不再自动继承 `attrs`，需要手动指定挂载位置。

### 7.2 `v-if` 与 `v-for` 优先级

```vue
<!-- Vue 2：先循环，再判断（v-for 优先） -->
<li v-for="item in list" v-if="item.active" :key="item.id">{{ item.name }}</li>
```

Vue 3 中 `v-if` 优先级更高，上面的写法会先判断再循环，访问不到 `item`，属于错误用法。推荐用 computed 过滤：

```ts
const activeList = computed(() => list.filter((item) => item.active))
```

```vue
<li v-for="item in activeList" :key="item.id">{{ item.name }}</li>
```

### 7.3 `key` 的变化

- `v-if` / `v-else` 分支建议加 `key`，避免复用错误节点。
- `<template v-for>` 上，`key` 应写在 `<template>` 上，而不是子元素上。
- Vue 3 不再自动为 `v-if` 分支生成唯一 key。

### 7.4 动态参数与 `v-bind`

```vue
<a v-bind:[attrName]="value" />
<button v-on:[eventName]="handler" />
```

Vue 3 中 `v-bind` 的对象展开与普通属性的合并顺序有意义，后写的覆盖先写的；Vue 2 中单个属性总是覆盖对象展开。不要依赖顺序时，明确写清楚。

### 7.5 自定义指令

| Vue 2 | Vue 3 |
| --- | --- |
| `bind` | `beforeMount` |
| `inserted` | `mounted` |
| `update` | `beforeUpdate`（新增） / `updated` |
| `componentUpdated` | `updated` |
| `unbind` | `unmounted` |

```ts
// Vue 3
app.directive('focus', {
  mounted(el) {
    el.focus()
  },
})
```

### 7.6 插槽

`slot` / `slot-scope` 已移除，统一用 `v-slot`：

```vue
<!-- Vue 2 -->
<template slot="header" slot-scope="{ title }">...</template>

<!-- Vue 3 -->
<template #header="{ title }">...</template>
```

`$scopedSlots` 合并进 `$slots`。

---

## 8. 样式与 CSS

- 深度选择器：`::v-deep` / `/deep/` / `>>>` → `:deep()`。

```css
/* Vue 2 */
.parent ::v-deep .child { color: red; }

/* Vue 3 */
.parent :deep(.child) { color: red; }
```

- 插槽内容样式：`:slotted(selector)`。
- 全局样式：`:global(selector)`。
- 本仓库主题使用 `<html data-theme="...">` 加 `--km-*` CSS 变量（`src/styles/main.css`），不要硬编码颜色，否则暗色模式会失效。

---

## 9. 路由 vue-router 3 → 4

### 9.1 创建方式

```js
// vue-router 3
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'history',
  routes: [],
})
```

```ts
// vue-router 4（本仓库 src/router/index.ts:1）
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
})
```

| vue-router 3 | vue-router 4 |
| --- | --- |
| `new VueRouter()` | `createRouter()` |
| `mode: 'history'` | `history: createWebHistory()` |
| `mode: 'hash'` | `history: createWebHashHistory()` |
| `mode: 'abstract'` | `history: createMemoryHistory()` |
| `base` 选项 | `createWebHistory(base)` |
| `path: '*'` | `path: '/:pathMatch(.*)*'` |
| `router.match()` | `router.resolve()` |
| `Vue.prototype.$router` | `useRouter()` / `app.config.globalProperties.$router` |

本仓库的兜底路由写在 `src/router/index.ts:48`：

```ts
{ path: '/:pathMatch(.*)*', redirect: '/' }
```

### 9.2 组件内使用

```vue
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const id = computed(() => String(route.params.id))
router.push('/notes')
</script>
```

`this.$route` / `this.$router` 在 Options API 中仍可用。

### 9.3 导航守卫

- 全局守卫：`beforeEach`、`beforeResolve`、`afterEach`。
- `next` 仍可用，但推荐返回值风格：`return false` / `return '/login'`。
- 组件内守卫改名：`beforeRouteEnter` 保留，`beforeRouteLeave` 保留，`beforeRouteUpdate` 保留。

本仓库在 `src/router/index.ts:55` 用 `afterEach` 设置页面标题。

### 9.4 `RouterLink` 插槽

Vue Router 3 的 `tag`、`event`、`exact` 等 prop 已移除，需要自定义渲染时用 `custom` + `v-slot`：

```vue
<RouterLink to="/notes" custom v-slot="{ href, navigate, isActive }">
  <a :href="href" :class="{ active: isActive }" @click="navigate">笔记</a>
</RouterLink>
```

---

## 10. 状态管理 Vuex → Pinia

Pinia 是 Vue 3 官方推荐的状态库，核心变化：

- 移除 `mutations`，直接改 `state` 或在 `actions` 里改。
- 没有嵌套模块，每个 store 独立，靠导入组合。
- 完整 TypeScript 支持，不需要 `Module` 类型体操。
- 支持 setup 写法，和 Composition API 一致。

### 10.1 Vuex 写法

```js
// Vuex
const store = createStore({
  state: { notes: [] },
  getters: {
    starred: (state) => state.notes.filter((n) => n.starred),
  },
  mutations: {
    ADD(state, note) {
      state.notes.push(note)
    },
  },
  actions: {
    add({ commit }, note) {
      commit('ADD', note)
    },
  },
})
```

### 10.2 Pinia Options 写法

```ts
import { defineStore } from 'pinia'

export const useNotesStore = defineStore('notes', {
  state: () => ({ notes: [] as Note[] }),
  getters: {
    starred: (state) => state.notes.filter((n) => n.starred),
  },
  actions: {
    add(note: Note) {
      this.notes.push(note)
    },
  },
})
```

### 10.3 Pinia Setup 写法（本仓库）

`src/stores/notes.ts:18` 使用 setup store：

```ts
export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])

  const sortedByUpdated = computed(() => [...notes.value].sort(/* ... */))

  function createNote(payload: Partial<Note> = {}) {
    // 直接修改 ref
    notes.value.unshift(note)
  }

  return { notes, sortedByUpdated, createNote }
})
```

`ref` 相当于 `state`，`computed` 相当于 `getters`，`function` 相当于 `actions`。

### 10.4 在组件中使用

```ts
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/stores/notes'

const notesStore = useNotesStore()

// 直接访问
notesStore.createNote({ title: 'Vue 3' })

// 解构 state/getters 时保留响应性
const { notes, sortedByUpdated } = storeToRefs(notesStore)
```

> 方法可以直接解构（`const { createNote } = notesStore`），但 `state` / `getters` 必须用 `storeToRefs`，否则失去响应性。

---

## 11. TypeScript 与工程化

### 11.1 构建工具

| Vue 2 常见方案 | Vue 3 常见方案 |
| --- | --- |
| Vue CLI（webpack） | Vite（esbuild + Rollup） |
| `vue.config.js` | `vite.config.ts` |
| `require()` | `import` |
| `process.env.VUE_APP_*` | `import.meta.env.VITE_*` |
| `require('@/assets/x.png')` | `new URL('@/assets/x.png', import.meta.url)` |

本仓库构建命令来自 `package.json`：

```bash
npm run dev     # Vite 开发服务器
npm run build   # vue-tsc --noEmit && vite build
npm run preview # 预览构建产物
```

`npm run build` 是唯一的类型检查步骤，没有独立的 lint / test 脚本。

### 11.2 类型推导

```vue
<script setup lang="ts">
import type { Note } from '@/types'

const props = defineProps<{ note: Note }>()
const emit = defineEmits<{ (e: 'open', id: string): void }>()
</script>
```

- `defineProps` / `defineEmits` 用类型字面量声明，自动生成运行时校验。
- 需要运行时默认值时用 `withDefaults`。
- 模板 `ref` 通过 `ref<HTMLInputElement | null>(null)` 获得元素类型。

### 11.3 `vite.config.ts` 与 `tsconfig.json`

路径别名 `@/` 需要两处同步配置（见 `vite.config.ts` 和 `tsconfig.json`），改一处忘另一处会出现「编辑器正常、构建报错」或反之。

### 11.4 异步组件与 Suspense

```ts
import { defineAsyncComponent } from 'vue'

const Editor = defineAsyncComponent(() => import('@/components/MarkdownEditor.vue'))
```

路由懒加载写法不变，本仓库大量使用：`src/router/index.ts:9` 的 `component: () => import('@/views/DashboardView.vue')`。

`<Suspense>` 是 Vue 3 新增的内置组件，用于包裹异步依赖并展示 fallback：

```vue
<Suspense>
  <template #default><AsyncEditor /></template>
  <template #fallback>加载中…</template>
</Suspense>
```

### 11.5 `Teleport`

把子树渲染到 DOM 的其他位置，适合弹窗、Toast：

```vue
<Teleport to="body">
  <div class="modal">...</div>
</Teleport>
```

---

## 12. 其他 API 变化

| 项目 | Vue 2 | Vue 3 |
| --- | --- | --- |
| 过滤器 `filters` | 支持 | 移除 |
| `$children` | 支持 | 移除 |
| `$listeners` | 独立 | 合并进 `$attrs` |
| `$scopedSlots` | 独立 | 合并进 `$slots` |
| `inline-template` | 支持 | 移除 |
| `propsData` | 支持 | 移除 |
| 函数式组件 | `<template functional>` | 普通函数组件 |
| `model` 选项 | 支持 | 移除，用 `modelValue` |
| `emits` 选项 | 无 | 支持，声明后不再透传 |
| `inheritAttrs` | 支持 | 支持 |
| `v-once` | 支持 | 支持 |
| `Vue.extend` | 支持 | 移除，用 `defineComponent` |
| `Vue.prototype` | 支持 | `app.config.globalProperties` |

过滤器迁移示例：

```vue
<!-- Vue 2 -->
<template>{{ price | currency }}</template>
```

```vue
<!-- Vue 3 -->
<script setup lang="ts">
const currency = (v: number) => `¥${v.toFixed(2)}`
</script>

<template>{{ currency(price) }}</template>
```

---

## 13. 常见迁移坑

1. **`this` 不可用**：Composition API 里没有 `this`，把 `this.xxx` 改成对应的 `ref` / store / 导入函数。
2. **`ref` 忘记 `.value`**：脚本里必须写，模板里自动解包；从 `reactive` 解构要用 `toRefs`。
3. **丢失响应性**：`const { x } = reactiveObj`、直接替换 `reactive` 对象的引用、把 `ref` 当普通值传递，都会出问题。
4. **`v-model` 改写**：组件从 `value/input` 改为 `modelValue/update:modelValue`；`.sync` 改为 `v-model:prop`。
5. **`.native` 失效**：删除 `.native`，未声明的事件会透传；多根组件需手动 `v-bind="$attrs"`。
6. **`v-if` + `v-for` 同用**：Vue 3 优先级变了，改用 computed 过滤。
7. **事件总线失效**：`$on/$off` 已移除，改 mitt / Pinia / provide。
8. **路由 `*` 失效**：改为 `/:pathMatch(.*)*`。
9. **`filters` 报错**：改为 computed 或方法。
10. **`$children` 报错**：改用模板 `ref` 或 `provide/inject`。
11. **`Vue.set` 报错**：直接赋值/删除。
12. **深度选择器报错**：`::v-deep` 改为 `:deep()`。
13. **`process.env` 为空**：Vite 用 `import.meta.env`，变量前缀 `VITE_`。
14. **样式穿透/主题失效**：不要硬编码颜色，沿用 `--km-*` 变量和 `data-theme`。
15. **第三方库不兼容**：优先找 Vue 3 版本；库作者可用 `vue-demi` 同时支持 Vue 2/3。

官方迁移构建 `@vue/compat` 可以让 Vue 2 写法在 Vue 3 下运行并给出警告，适合大项目渐进迁移；新项目不需要。

---

## 14. 学习路径

建议按「先会写，再懂原理，最后迁移」的顺序：

1. **响应式**：`ref` / `reactive` / `computed` / `watch`，理解 `.value` 和解包规则。
2. **Composition API**：`<script setup>`、`defineProps`、`defineEmits`、`defineExpose`、生命周期钩子。
3. **组件通信**：props/emit、`v-model`、`v-model:prop`、`$attrs`、`ref`、`provide/inject`。
4. **模板变化**：多根、`v-if`/`v-for` 优先级、`v-slot`、动态参数、自定义指令钩子。
5. **路由与状态**：`createRouter` / `createWebHistory`、`useRoute` / `useRouter`、Pinia setup store、`storeToRefs`。
6. **工程化**：Vite、`import.meta.env`、`vue-tsc`、类型化 props/emits、异步组件与 `Suspense`。
7. **实战迁移**：拿一个 Vue 2 小项目，按「全局 API → 组件 `v-model` → 路由 → 状态 → 过滤器/事件总线」顺序改造，每步跑通再继续。

---

## 15. 本仓库对照索引

| 主题 | 文件 | 说明 |
| --- | --- | --- |
| 应用创建 / 插件注册 | `src/main.ts` | `createApp` + `app.use` |
| 路由创建 / 懒加载 / 兜底路由 | `src/router/index.ts` | `createRouter`、`createWebHistory`、`/:pathMatch(.*)*` |
| Pinia setup store | `src/stores/notes.ts` | `ref` + `computed` + 函数即 actions |
| `<script setup>` + 生命周期 | `src/views/NoteEditView.vue` | `onMounted` / `onBeforeUnmount`、可写 computed |
| props / emits 类型化 | `src/components/NoteCard.vue` | `defineProps<{...}>`、`defineEmits<{...}>` |
| `modelValue` 双向绑定 | `src/components/MarkdownEditor.vue` | 经典 Vue 3 组件 `v-model` |
| `v-model` / `update:modelValue` | `src/components/TagSelect.vue` | 多选组件双向绑定 |
| 筛选与 computed | `src/views/NoteListView.vue` | `computed` 派生列表、`watch` 监听 query |
| 路由守卫 / 标题 | `src/router/index.ts` | `afterEach` 修改 `document.title` |
| 主题变量 | `src/styles/main.css` | `--km-*` + `data-theme` |

---

## 参考

- Vue 3 官方文档：<https://cn.vuejs.org/>
- Vue 3 迁移指南：<https://v3-migration.vuejs.org/zh/>
- Vue Router 4：<https://router.vuejs.org/zh/>
- Pinia：<https://pinia.vuejs.org/zh/>
- Vite：<https://cn.vitejs.dev/>
