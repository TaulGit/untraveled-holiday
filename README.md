# 未出发的假期：照片里的海

一段可独立通关的第一人称视差解谜游戏。星期一的办公室里有三张海边照片：第一张打开通往海岸的门，第二张补齐跨海石桥，第三张恢复灯塔旁的凉亭。玩家走入最后的照片，收起那段可能存在过的假期。

## 操作

- 电脑：点击开始后，WASD 或方向键移动，直接移动鼠标转动视角，F 或 E 互动。Esc 释放鼠标并暂停，点击画面继续。若嵌入页面不允许锁定鼠标，则使用画面内的鼠标移动转向，同样不需要按住拖动。
- 手机：左下角方向键移动，拖动画面转动视角，点右下角按钮互动。
- 对齐照片时，让照片里的建筑线条大致接上真实场景；进入绿色贴合范围后按 F，视角会平滑归位并放下照片。容差随画面高度变化，手机竖屏也适用。
- 右上角可以开关声音；开场和结尾可查看 Tripo 模型档案。

## 构建与本地预览

```powershell
npm install
npm run verify:assets
node scripts/check-alignment.mjs
node scripts/check-bridge.mjs
npm run build
star-letter check
star-letter dev dist --open
```

`star-letter dev` 应指向构建后的 `dist`，预览页需要在启动本地服务的同一台电脑打开。源文件在 `src/`，构建产物在 `dist/`，星匣清单的 `gameFile` 指向 `./dist`。

## Tripo 使用

10 件 Tripo 模型构成主要道具与场景地标：旅行箱、海岸拱门、跨海石桥、棕榈树、拍立得相机、遮阳伞、帆船、明信片亭、灯塔、终点凉亭。生成任务编号、逐件实际积分与关卡用途记录在 `public/assets/models/credits.json`，游戏中的“Tripo 模型档案”也展示这些模型的预览。

前一版两件模型消耗 40 积分；本次新增八件消耗 160 积分；项目模型合计 200 积分。所有模型均为自包含 GLB，原始任务产物保存在 `assets/models/tripo-out/`，游戏用文件在 `public/assets/models/`。

照片不是事先画好的插图。每张照片在拿起时由关卡共用的三维场景和固定拍摄相机渲染，保留建筑边缘的真实投影；放下照片时用 340 毫秒平滑校准到该拍摄机位，再显露照片新增的三维结构。可放置范围从原来的 12 像素扩大到画面高度的 7.5%（最少 32 像素），并加上 20% 的退出容差，减少临界闪动。

## Blender 场景

石桥根据实际 GLB 采样桥面高度，角色随桥拱升降；两侧护栏使用带角色半径的碰撞边界，桥头有可见的接地坡道。碰撞与照片中的桥一起启用。

可编辑地图为 `assets/scenes/holiday-coast.blend`，包含旅行工作室、海岸庭院、Tripo 地标，以及庭院、俯瞰和室内三台构图相机。建筑、地图和装饰用 Blender 制作，按材质合并后导出 `public/assets/scenery/office.glb` 和 `coast.glb`。新景观载入后替换基础方块场景，解谜门、桥和凉亭仍由游戏控制显隐。

重建场景：`blender --background --factory-startup --python scripts/build-scenery.py`。脚本也生成 `assets/scenes/coast-preview.png` 供检查。建模坐标按米计，Blender `(x,y,z)` 对应游戏 `(x,-z,y)`。本次 Blender 建模没有调用新的 Tripo 生成任务。


## 2026-10-02 贴图与碰撞更新
- 鼠标灵敏度降至水平 0.0013、垂直 0.0012。
- 内置 imagegen 生成天空、水面、石灰岩、木纹贴图，提示词在 public/assets/textures/manifest.json。
- 场景实体使用半径 0.16 米的胶囊碰撞，保留门洞、略过叶片；凉亭台阶支持抬脚，桥面沿用实际几何高度。
- 游戏文案缩短；标题保持一行。
- 验证：node scripts/check-world.mjs、node scripts/check-bridge.mjs、node scripts/check-alignment.mjs、npm run build、star-letter check --json。

## 封面、跳跃与声音
- 空格跳跃，WASD 移动，鼠标转向，F 互动，Esc 暂停。
- 点击右上角声音按钮，启用海浪录音与 Kenney CC0 交互音效；来源见 public/assets/audio/CREDITS.md。
- 新封面用于开始界面与星匣列表；图片提示词见 docs/generated-art.json。
- 远山源文件 assets/scenes/mountains.blend，重建脚本 scripts/build-mountains.py。
- npm ci && npm run build；star-letter dev dist --open 启动平台预览。

## 项目地址
- GitHub（私有）：https://github.com/TaulGit/untraveled-holiday
- 星匣草稿：7451，未正式发布。
