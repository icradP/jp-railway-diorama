# 日式住宅街铁道口微缩 Diorama

Three.js + TypeScript 的可 360° 环绕观察的**日本乡郊住宅街铁路道口**微缩景观。

15×12m 底座，铁路与道路十字交叉形成「田」字四格：三栋一户建 + 一块社区空地。

**在线演示（GitHub Pages）：** https://icradp.github.io/jp-railway-diorama/

**仓库：** https://github.com/icradP/jp-railway-diorama

## 布局（田）

```text
┌──────────────┬──────────────┐
│  一户建 A    │  一户建 B    │
│  + 庭院晾衣  │  + 车库 kei  │
├════铁路道口══╪══════════════┤
│  社区空地    │  一户建 C    │
│  (哆啦A梦感) │  + 庭院储物  │
└──────────────┴──────────────┘
        ↑ 纵向道路
```

## 运行

```bash
npm install
npm run dev
```

打开终端提示的本地地址（默认 `http://localhost:5173`）。

## 操作

| 操作 | 效果 |
|---|---|
| 左键拖拽 | 轨道旋转（水平 360°） |
| 滚轮 / 双指 | 缩放 |
| 右键拖拽 | 平移 |
| 点击 `AUTO` 或按 `A` | 自动环绕展示 |

## 架构

```
src/
  core/
    rng.ts          # 可复现随机
    materials.ts    # PBR 材质库
    shapes.ts       # 程序化几何工厂
    mesh.ts         # MeshBuilder + InstancedMesh
    assets.ts       # AssetRegistry：GLTF ↔ 程序化可替换
    animation.ts    # AnimationManager
  scene/
    base.ts         # 15×12 展示台
    house.ts        # 可复用一户建 A/B/C + 庭院 + kei car + 空地
    railway.ts      # 钢轨 / 枕木 / 道砟 / 信号
    crossing.ts     # 栏杆 / 警报灯 / 控制箱
    train.ts        # 轨车进站 + 驱动道口
    road.ts         # 乡村道路
    vegetation.ts   # 街树 / 草花（风吹）
    props.ts        # 自行车 / 电线杆 / 标牌
    environment.ts  # 天空 / 云 / 灯光 / 雾
  main.ts
```

### 可复用一户建

`buildIkkodate({ variant: 'A'|'B'|'C' })` — 两层、坡屋顶宽檐、推拉门、阳台；B 带车库，C 带储物棚与空调外机。庭院含石板路、花坛、晾衣杆（风摆）、邮箱、花盆。

### 动画

列车自东驶来 → 道口警报/栏杆下降 → 通过 → 停站 → 发车西行循环。栏杆绕真实转轴；警示灯交替闪烁；晾衣与植物微风；信号灯随道口相位切换。
