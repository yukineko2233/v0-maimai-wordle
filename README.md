# 舞萌猜猜呗之潘一把 (maimai-wordle)

根据歌曲属性反馈猜测 maimai 曲目的 Web 游戏。支持单人自由练习、每日一首全服挑战与多人实时对战！

## ✨ 重构特性 (v2.0)

- **现代轻量化架构**：基于 React 19 + Vite + TypeScript + Tailwind CSS + Node.js + Socket.IO。前后端一体化单端口部署，生产环境内存占用仅 **~35MB**，针对 2核2G 低配服务器深度调优。
- **全新等级判定规则**：
  - 定数小数位自 `*.6` 起计算 `+` 号等级（例如定数 12.6 为 `12+`，Master 等级范围 `10+` ~ `14+`）；
  - 精确半级接近判定（目标为 12+ 时，猜 12 或 13 均判定为接近 🟨）。
- **动态标签与别名匹配**：
  - 曲目主数据源：Diving-Fish `music_data`（自动过滤 6 位数宴谱）；
  - 别名库：YuzuChaN（按 `SongID` 匹配）；
  - 标签库：DXRating `https://miruku.dxrating.net/api/v1/tags`（仅匹配 Master 难度标签）。
- **版本更新至 舞萌DX 2026**：包含 20 代版本拓扑体系（PRiSM PLUS 对应 舞萌DX 2026）。
- **预设难度与歌曲热度梯度**：
  - 离散档位控制（50、100、150 ... 500、无限制）；
  - “入门”预设（前 100 首热门歌曲，等级 10+ ~ 14+）；
  - 单人模式预设默认无限制，多人联机预设默认 200 首。
- **全顶层浮动架构 (FloatingPortal)**：搜索候选下拉列表、标签说明弹层、设置面板使用 Portal 挂载到顶层，彻底杜绝被卡片裁剪或遮挡的问题。
- **多人对战断线保护与防作弊**：支持 30 秒断线重连宽限期与 SessionToken 恢复，服务端权威校验猜测有效性。

---

## 🛠️ 本地开发与构建

### 环境要求
- Node.js >= 20
- Corepack（仓库通过 `packageManager` 固定 pnpm 10.8.1）

### 安装依赖
```bash
corepack enable
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

构建并启动前后端一体化单镜像：

```bash
docker build -t maimai-wordle .
docker run -d --name maimai-wordle -p 3000:3000 \
  -e CORS_ORIGINS=https://wordle.example.com \
  -e DAILY_SECRET=replace-with-a-long-random-secret \
  maimai-wordle
```

- 服务将监听宿主机 `3000` 端口。
- 前端静态页面与 Socket.IO 实时通信共用单一端口，无需复杂的双端口反代配置。
- 容器以非 root 用户运行，`/api/health` 仅在曲库成功加载后返回 200，并用于容器健康检查。

### 服务端配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | 开发环境 `3001`，镜像内 `3000` | HTTP 与 Socket.IO 监听端口 |
| `CORS_ORIGINS` | 生产环境无跨域来源 | 逗号分隔的允许来源；同源请求无需配置 |
| `DAILY_SECRET` | 启动时随机生成 | 每日权威题目的 HMAC 密钥；生产环境必须固定配置，否则服务重启后当日题目可能变化 |
| `ADMIN_REFRESH_TOKEN` | 未设置 | 设置后启用 `POST /api/refresh`；使用 `Authorization: Bearer <token>` 或 `X-Admin-Token` |
| `REFRESH_COOLDOWN_MS` | `60000` | 管理员手动刷新成功或失败后的最短调用间隔 |

不要把 `.env` 文件加入镜像构建上下文或版本控制。管理员 token 未配置时，手动刷新接口默认禁用；曲库仍会在启动时及每小时自动刷新。

---

## 📄 开源致谢与许可

本仓库当前未声明软件许可证。这意味着除法律明确允许的情形外，不自动授予复制、修改或再分发代码的权利；数据源与素材还可能受各自条款约束。在维护者明确选择许可证前，不应假定本项目采用某种开源许可证。

- 曲目数据与封面：[Diving-Fish maimaidx-prober](https://github.com/Diving-Fish/maimaidx-prober)
- 别名数据：[Yuri-YuzuChaN maimaiDX Alias](https://github.com/Yuri-YuzuChaN/SakuraBotDocs)
- 谱面标签数据：[DXRating.net](https://dxrating.net/)
- 原项目作者博客：[Yukineko's Blog](https://yukineko2233.top/2025/04/26/maimai-wordle/)
