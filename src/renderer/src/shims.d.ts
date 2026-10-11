// 缺失官方类型的第三方插件声明
declare module 'markdown-it-task-lists' {
  import type { PluginWithOptions } from 'markdown-it'
  interface TaskListsOptions {
    enabled?: boolean
    label?: boolean
    labelAfter?: boolean
  }
  const taskLists: PluginWithOptions<TaskListsOptions>
  export default taskLists
}
