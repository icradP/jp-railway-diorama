# 日式乡村铁道口微缩 Diorama — 设计规格

## Style Anchor

**Kato / Tomix N-gauge 铁路沙盘 × Studio 手办摄影 × Low-poly game asset**

- 2D：极简产品页 — 无导航、无卡片、半透明 HUD 贴边、等宽标签
- 3D：Low-poly + flat-ish PBR，保留可见棱面，但材质有细微粗糙度与边缘磨损
- 整体像「放在桌面摄影棚里的精致铁路模型」

## Palette

| Token | Hex | 用途 |
|---|---|---|
| --plinth | `#1a1814` | 深色木质展示台 |
| --plinth-edge | `#2c2416` | 台座边缘高光 |
| --grass | `#6b8f5e` | 主草地 |
| --grass-dry | `#9a8b5a` | 枯草/过渡 |
| --dirt | `#6b5340` | 泥土路肩 |
| --rail | `#3a3d42` | 钢轨金属 |
| --sleeper | `#5c4033` | 旧木枕木 |
| --ballast | `#7a7a72` | 碎石道砟 |
| --asphalt | `#6b6b68` | 乡村道路 |
| --line-white | `#e8e4dc` | 道路标线 / 栏杆白 |
| --warn-red | `#c43c3c` | 道口红 / 警示 |
| --roof | `#2d3436` | 瓦片深灰 |
| --wall | `#e8e0d0` | 车站墙面米白 |
| --wood-dark | `#3d2f24` | 深木柱 |
| --lamp | `#ffb84d` | 暖黄灯光 |
| --signal-green | `#4a9b6e` | 信号绿 |
| --signal-yellow | `#d4a017` | 信号黄 |
| --sky-top | `#87b5d9` | 天空上 |
| --sky-bot | `#d4e6f1` | 天空下 |
| --fog | `#b8c9d4` | 体积雾 |
| --vending | `#e85d4c` | 售货机红 |

## Typography

- Display / labels: `'SF Mono', 'Cascadia Code', 'Menlo', monospace` — 技术沙盘仪表感
- Body: `system-ui, 'Helvetica Neue', 'Hiragino Sans', sans-serif`
- 尺度：标题 13–14px tracking 0.12em，说明 11–12px，HUD 全大写

## Layout System

- 全屏 WebGL canvas，无滚动
- HUD 四角贴边（title / controls / auto-rotate / status）
- 安全边距 24px，字距宽松
- 无任何遮挡场景的大 UI

## Scene Composition

底座 12 × 10 m，略抬高。

```
        +Z (站台侧)
   车站候车亭 ─ 自行车/售货机/路灯
          │
  ────────┼────────  铁轨 (X轴, 轻微弧线)
          │
     道口栏杆/警报机/控制箱
          │
        -Z (田野侧)
```

- 铁轨沿 X 贯穿，路基略高
- 道路沿 Z 穿过，窄双向乡村道
- 车站在 +Z 侧偏 -X
- 植被自然散布，后方低矮山丘
- 无人物、无动物

## Signature Moments

1. **道口机循环**：红灯左右交替 → 栏杆绕真实转轴缓慢下降 → 保持 → 缓升，带机械惯性感
2. **摄影棚灯光**：暖色太阳 + 柔和环境 + 轻 Bloom + 接触阴影，像手办摄影

## Animation Budget

| 系统 | 行为 |
|---|---|
| WarningLights | 0.5s 交替闪烁，轻微 Bloom |
| Gates | 周期下降/保持/上升，机械转轴 |
| Signals | 正常绿/黄 → 道口动作红 |
| Vegetation | 相位错开的微摆 |
| Clouds | 缓慢漂移 |
| StationLamp | 呼吸灯 |
| Vending | 稳定发光 |

## Tech Stack

- Three.js r170 + TypeScript + Vite
- WebGLRenderer, PerspectiveCamera, OrbitControls
- MeshStandardMaterial (PBR)
- EffectComposer: RenderPass + UnrealBloomPass + SSAO + OutputPass
- InstancedMesh：草、石、枕木、树叶
- 自研：`ShapeFactory` / `MeshBuilder` / `MaterialLibrary` / `AssetRegistry`（GLTF 可替换）
- AnimationManager 统一 tick

## Priority

**Core must-do**
- 底座 / 铁轨 / 道口 / 道路 / 车站 / 栏杆动画 / 警示灯 / OrbitControls / 后处理
- 可复用组件库 + GLTF 接口

**Bonus**
- 自动展示模式、云、体积雾感、更多微道具、DoF
