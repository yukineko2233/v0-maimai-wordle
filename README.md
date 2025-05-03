## 在线游玩

**[👉 点击这里游玩](https://maimai.yukineko2233.top/)**  


## To-do

* 曲目热度筛选 from diving-fish - 用于进行歌曲筛选，参考二次元猜猜呗
* 轮流猜模式
* 按钮切换结果显示顺序 (EzShrimps)
* 曲师match
* 出题模式
* 曲目热度
* 每日猜歌
  * 每日一题猜歌 - 核心
  * 根据手元猜rating - 类似Sunny Duck
  * 马赛克曲绘猜歌
  * 根据正解音猜歌
  * ...(待完善)
 
  
## 关于本项目

  **雪晴yuki**:

灵感来源 [BlAST.tv](https://blast.tv/counter-strikle) 和 [二刺猿笑传之猜猜呗](https://anime-character-guessr.netlify.app/)，对 Web 开发完全不懂的我萌生了做类似的舞萌猜歌游戏的想法。

尝试了 ChatGPT 和 Gemini 等模型，但效果不佳，于是在 Vercel 里试了一下 v0.dev，发现它生成的游戏逻辑和UI都惊艳到了我。于是基于这个蓝本开始了边摸索学习，边完善游戏玩法的过程。当然，后续的代码修改工作大部分也是由 AI 来完成的，

在惊叹于 AI 的强大之时，我开始思考更多的游戏功能、更协调的 UI 设计等等，所以一边查资料学习后做小修小补，一边思考要写的提示词。在这个过程中，也特别感谢两位朋友的帮助和大家的游玩。我也还想再继续多学点东西。我很喜欢这个项目，希望它能成为一个有趣的游戏以丰富各位舞萌玩家的生活，所以我也会继续维护下去。

## 赞助

[爱发电](https://afdian.com/a/yukineko2233) 目前服务器使用的是免费的（Vercel+Render），如果你觉得游戏还不错的话，可以赞助帮我升级下服务器或续费域名。

## 致谢

- Diving-Fish提供的[曲目数据库](https://github.com/Diving-Fish/maimaidx-prober/blob/main/database/zh-api-document.md)
- Yuri-YuzuChaN提供的[别名数据库](https://github.com/Yuri-YuzuChaN/SakuraBotDocs/blob/main/docs/api/maimaiDX.md)
- DXRating.net提供的[标签数据库](https://dxrating.net)
- 阿朱quq [GitHub](https://github.com/azhuquq)
- Yoichi-Sato [GitHub](https://github.com/Yoichi-Sato482)


# 本地配置与运行

## 方法 1：克隆仓库

1. **克隆仓库**
```
git clone https://github.com/yukineko2233/v0-maimai-wordle.git
cd v0-maimai-wordle
```
2. **安装依赖**
如果你还没有安装pnpm:
```
npm install -g pnpm
```
然后安装项目依赖：
```
pnpm install
```
3. **运行**
```
npm run server
```
