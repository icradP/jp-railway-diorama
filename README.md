# 日式乡村铁道口微缩 Diorama

Three.js + TypeScript 的可 360° 环绕观察的日本乡村铁路道口微缩景观。

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
    shapes.ts       # 程序化几何工厂（挤出/路基曲线/架空线…）
    mesh.ts         # MeshBuilder + InstancedMesh
    assets.ts       # AssetRegistry：GLTF ↔ 程序化可替换
    animation.ts    # AnimationManager + 道口状态机
  scene/
    base.ts         # 展示台 + 地面
    terrain.ts      # 山丘 / 远景树 / 石块
    railway.ts      # 钢轨 / 枕木 / 道砟 / 信号
    crossing.ts     # 栏杆 / 警报灯 / 控制箱
    train.ts        # 低面数キハ轨车 + 进站编排（驱动道口）
    road.ts         # 沥青路 / 标线 / 排水
    station.ts      # 候车亭 / 长椅 / 售货机 / 路灯
    vegetation.ts   # 树 / 竹 / 草 / 野花（风吹）
    props.ts        # 自行车 / 电线杆 / 围栏 / 标牌
    environment.ts  # 天空 / 云 / 灯光 / 雾
  main.ts           # 组装 + 后处理 + 相机
```

### 可复用组件

- **ShapeFactory** — 挤出标志、铁路剖面、地形位移、悬链线电线等
- **MeshBuilder** — 命名分组 + 材质装配 + 实例化
- **MaterialLibrary** — 统一低面数手办 PBR
- **AssetRegistry** — 任意资产可 `register({ kind:'gltf' | 'procedural' })`，场景模块只按名字取

把 `props.ts` 里的自行车换成 GLB 示例：

```ts
assets.register({
  name: 'bicycle',
  source: { kind: 'gltf', url: '/assets/bicycle.glb' },
  scale: 1,
  center: true,
});
```

### 动画

全部经 `AnimationManager` 调度。

**列车进站循环**（`train.ts`）  
低面数キハ轨车自东侧驶来 → 接近道口时警报灯闪、栏杆缓降 → 通过道口 → 在站台西侧减速停车（车尾完全离开道口区）→ 停站约 4s（此时栏杆抬起）→ 发车西行离场 → 短暂重置后循环。

道口状态不再由独立时钟驱动，而是由列车占用区（车头/车尾相对 x=0）实时决定；信号灯随道口相位切换。其余：栏杆真实转轴、警报灯交替、植物风、云漂移、灯呼吸。
