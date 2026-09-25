import type { ModuleId } from './types'

export type Blueprint = {
  id: string
  name: string
  pieces: number
  kind: 'outfit' | 'furniture'
  description: string
  hint: string
}

export const USER_COLORS = ['#e07a5f', '#3d8b74', '#d4a017', '#6b7fd7', '#c46b8a']

export const PIECE_TONES = [
  '#e39b73',
  '#7ea184',
  '#d97870',
  '#e2c15a',
  '#7eabc4',
  '#c58cb4',
  '#c98455',
  '#9aaf7a',
  '#d9a0a8',
  '#8fbfb0',
  '#b9a0d4',
  '#e0b07a',
]

export const BLUEPRINTS: Blueprint[] = [
  {
    id: 'dino',
    name: '恐龙睡衣',
    pieces: 6,
    kind: 'outfit',
    description: '软软的连帽睡衣，背上有一排小刺。',
    hint: '拼好就会穿在猫身上。',
  },
  {
    id: 'carpet',
    name: '圆圆地毯',
    pieces: 4,
    kind: 'furniture',
    description: '一块暖色的圆地毯，铺在地板中央。',
    hint: '猫会过去打滚。',
  },
  {
    id: 'tree',
    name: '猫爬架',
    pieces: 8,
    kind: 'furniture',
    description: '最高那一层，是它自己的床。',
    hint: '猫会睡在最高处。',
  },
  {
    id: 'record',
    name: '黑胶唱片机',
    pieces: 12,
    kind: 'furniture',
    description: '木头壳子，一张会转的黑胶。',
    hint: '唱片会在房间里转起来。',
  },
]

export const MODULES: { id: ModuleId; title: string; detail: string }[] = [
  { id: 'work', title: '工作', detail: '把该做的做完' },
  { id: 'study', title: '学习', detail: '学一点就好' },
  { id: 'sport', title: '运动', detail: '动一动身体' },
]

export function getBlueprint(id: string) {
  return BLUEPRINTS.find((item) => item.id === id)
}
