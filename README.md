# 舞萌猜猜呗之潘一把 (maimai-wordle)

根据歌曲属性反馈猜测 maimai 曲目的 Web 游戏。支持单人自由练习、每日一首全服挑战与多人实时对战！

## ✨ 重构特性 (v2.0)

- **现代轻量化架构**：基于 React 19 + Vite + TypeScript + Tailwind CSS + Node.js + Socket.IO。前后端一体化单端口部署，生产环境内存占用仅 **~35MB**，针对 2核2G 低配服务器深度调优。
- **全新等级判定规则**：
  - 定数小数位自 `*.6` 起计算 `+` 号等级（例如定数 12.6 为 `12+`）；
  - 精确半级接近判定（目标为 12+ 时，猜 12 或 13 均判定为接近 🟨）。
- **动态标签与别名匹配**：
  - 曲目主数据源：Diving-Fish `music_data`（自动过滤 6 位数宴谱）；
  - 别名库：YuzuChaN（按 `SongID` 匹配）；
  - 标签库：DXRating `https://miruku.dxrating.net/api/v1/tags`（仅匹配 Master 难度标签）。
- **版本更新至 舞萌DX 2026**：包含 20 代版本拓扑体系（PRiSM PLUS 对应 舞萌DX 2026）。
- **优化“入门”难度预设**：版本范围 maimai ~ 舞萌DX 2026，等级 10+ ~ 15，前 100 首热门歌曲。
- **浮动搜索框体验修复**：候选下拉列表使用绝对浮层，解决猜歌记录为空时候选框被裁剪或遮挡的问题。
- **客户端封面缓存**：引入 Cache Storage API 本地持久化缓存，避免重复请求封面节省流量。
- **多人对战断线保护**：支持 30 秒断线重连宽限期与 SessionToken 恢复。

---

## 🛠️ 本地开发与构建

### 环境要求
- Node.js >= 20
- pnpm >= 9

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
# 启动服务端（同时自动拉取曲库数据，默认端口 3001）
pnpm dev

# 在另一个终端启动 Vite 前端开发服务器（端口 5173，自动代理 /api 和 /socket.io 至 3001）
pnpm dev:client
```

浏览器打开 `http://localhost:5173` 即可开始游戏。

### 运行单元测试
```bash
pnpm test
```

### 生产打包构建
```bash
pnpm build
```

---

## 🐳 Docker 一键部署

在自建 2C2G 服务器上执行以下命令即可启动单容器服务：

```bash
docker compose up -d --build
```

- 服务将监听宿主机 `3000` 端口。
- 前端静态页面与 Socket.IO 实时通信共用单一端口，无需复杂的双端口反代配置。

---

## 📄 开源致谢与许可

- 曲目数据与封面：[Diving-Fish maimaidx-prober](https://github.com/Diving-Fish/maimaidx-prober)
- 别名数据：[Yuri-YuzuChaN maimaiDX Alias](https://github.com/Yuri-YuzuChaN/SakuraBotDocs)
- 谱面标签数据：[DXRating.net](https://dxrating.net/)
- 原项目作者博客：[Yukineko's Blog](https://yukineko2233.top/2025/04/26/maimai-wordle/)
