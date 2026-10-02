# 草稿检查

- SDK：v2；对照官方 v2.4.4 / rev19 文档。
- 运行时仅调用 `GameSDK.init()`。不使用 storage、ai、exchange、oss、leaderboard、multiplayer；没有运行时收费或额度依赖。
- Tripo 模型、生成贴图、第三方音频均作为本地静态资源打包。API key 不进入游戏。
- 音频来源与 CC0 许可见 `public/assets/audio/CREDITS.md`。
- 已检查：跳跃在 30/60/144 fps 下的高度、落地与禁止二段跳；实际 GLB 墙体/拱门/凉亭碰撞；石桥双向通行与栏杆；四种屏幕尺寸下照片对齐；Vite build；star-letter check。
- 浏览器内玩法、听感与平台握手由创作者在 `/dev/preview` 验收。此次只保存草稿，不正式发布。
