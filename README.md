# 未出发的假期

![游戏封面](cover.png)

**把照片里的风景，放进眼前的世界。**

一款短篇第一人称空间解谜游戏：从办公室出发，拿起三张照片，对准门框、断桥和凉亭，沿着照片铺出的路走到海边。

面向 **Tripothon S1** 制作，使用 **Tripo 3D、Blender 和 Three.js**。当前为可通关原型，星匣草稿编号 **7451**，尚未正式发布。

## 玩法

1. 找到照片，按 **F** 拿起。
2. 移动位置和视角，让照片边缘与场景接上。
3. 边框变绿后按 **F** 放下；照片里的建筑会出现在场景中。
4. 穿过门、走过桥，抵达灯塔旁的凉亭。

照片由同一套三维场景渲染。放置时视角平滑校准，保持照片与场景的投影一致；照片中的桥和建筑同时启用实体碰撞。

## 操作

| 操作 | 按键 |
| --- | --- |
| 移动 | WASD / 方向键 |
| 转动视角 | 移动鼠标 |
| 跳跃 | 空格 |
| 拿取 / 放置 / 互动 | F / E |
| 暂停、释放鼠标 | Esc |
| 声音开关 | 右上角 ♪ 按钮 |

手机提供方向按钮、触屏转向和互动按钮。建议在电脑上体验；嵌入页面不允许鼠标锁定时，会使用鼠标移动转向。

## Tripo 在游戏中的作用

10 件生成模型直接用于游戏：

| 模型 | 用途 |
| --- | --- |
| 旅行箱、明信片亭、拍立得相机 | 三张照片的获取地点 |
| 海岸拱门、石桥、凉亭 | 照片对齐后的空间变化和通行路线 |
| 灯塔、棕榈树、遮阳伞、帆船 | 海岸地标和环境布置 |

模型为自包含 GLB。生成记录合计 **200 Tripo 积分**，详见 [模型记录](public/assets/models/credits.json)；游戏开场和结尾也可打开模型画廊。运行游戏无需 Tripo API key，不会调用生成接口。

## 本地运行

需要 Node.js 22.12+（建议 24）。

```bash
npm ci
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

使用已安装的星匣 CLI，在平台环境预览：

```bash
star-letter dev dist --open
```

CLI 会返回当前 `/dev/preview` 链接。该链接依赖本机服务，不能作为公开试玩地址。此仓库的 `star-letter.json` 绑定作者的草稿；用于自己的账号前，请将 `gameId` 改为 `0`。

## 项目结构

```text
src/                  游戏、照片对齐、碰撞、跳跃和音频
public/assets/models/ Tripo 模型、预览和积分记录
public/assets/scenery/Blender 导出的地图与远山
public/assets/textures/生成贴图
public/assets/audio/  海浪录音、交互音效及来源
assets/scenes/        可编辑的 Blender 源文件和渲染图
scripts/              场景构建、音频处理和检查脚本
docs/                 生成图片提示词及草稿检查记录
```

## 场景与声音

- 建筑、庭院、室内家具与装饰：Blender 建模。
- 远山：Blender 地形网格搭配生成的岩石纹理。
- 天空、水面、石材、木纹及封面：imagegen 生成；提示词见 [图片记录](docs/generated-art.json)和[贴图记录](public/assets/textures/manifest.json)。
- 海浪：SamsterBirdies 的实地录音，经过频段整理、音量调整和循环接缝处理；进出室内时缓慢淡入淡出。
- 交互音效：Kenney Interface Sounds。音频许可和原始链接见 [Audio Credits](public/assets/audio/CREDITS.md)。

重新生成 Blender 场景（使用 Blender 4.5）：

```bash
blender --background --factory-startup --python scripts/build-scenery.py
blender --background --factory-startup --python scripts/build-mountains.py
```

## 检查

```bash
npm run verify:assets
node scripts/check-alignment.mjs
node scripts/check-bridge.mjs
node scripts/check-world.mjs
node scripts/check-jump.mjs
node scripts/check-audio.mjs
npm run build
star-letter check
```

自动检查覆盖照片对齐、桥面高度、实体碰撞、通路及跳跃。浏览器实际手感、音效和平台交互仍需试玩确认。

## 素材许可

第三方音效采用 CC0，具体作者、文件映射与处理方式已记录在 Audio Credits。生成素材和游戏代码未附统一开源许可证；仓库公开不代表所有内容采用同一种授权。
