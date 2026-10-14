# 星阵 · 3D 五子消除

基于 Three.js 和 TypeScript 的浏览器棋类小游戏，支持本地双人、三人和人机对局。

[在线游玩](https://eugnelnc.github.io/ywk-ai.github.io/games/3d-gomoku/) · [个人主页](https://eugnelnc.github.io/ywk-ai.github.io/)

## 玩法

在 `10 × 10 × 15` 的空间棋盘中轮流落子，任意方向连成至少五子即可消除得分；重力压缩后可以继续触发连锁。先累计消除 20 枚棋子的玩家获胜。

- 中央层 `z=0` 可以自由落子，其他层需与已有棋子相邻。
- 拖动旋转视角，滚轮缩放；点击空间格点落子，也可用层滑杆或 `− / ＋` 切换平面。
- 左上角切换对局模式、音效或重新开始。建议使用支持 WebGL 的桌面浏览器。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。

```bash
npm run test:run  # 核心规则与 AI 测试
npm run build     # 类型检查并构建到 dist/
```

`src/game/` 为规则和 AI，`src/render/` 为三维场景，`src/ui/` 为操作界面。构建使用相对资源路径，可将 `dist/` 部署到静态网站的子目录；当前在线版本位于个人网站的 `games/3d-gomoku/`。
