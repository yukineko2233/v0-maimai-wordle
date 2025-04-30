# 构建阶段
# 使用 Node.js 20 作为基础镜像
FROM node:20-alpine AS build

# 设置工作目录
WORKDIR /app

# 声明环境变量
ARG NEXT_PUBLIC_SOCKET_URL

# 安装 pnpm
RUN npm i pnpm -g

# 复制 package.json 和 package-lock.json
COPY package*.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm i --frozen-lockfile

# 复制源代码
COPY . .

# 设置环境变量
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

# 构建
RUN pnpm build

# 生产阶段
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制构建结果
COPY --from=build /app ./

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "run", "start"]