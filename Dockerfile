# 基于 Node.js 镜像
FROM node:18-alpine

# 安装 nginx 和时区数据
RUN apk add --no-cache nginx tzdata

# 设置时区为东八区（北京时间）
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 设置工作目录
WORKDIR /app

# 复制 package 文件并安装依赖
COPY server/package*.json ./
RUN npm ci --only=production

# 复制服务器代码
COPY server/ ./

# 复制 web 静态文件到 nginx 目录
COPY web/ /usr/share/nginx/html/

# 复制 nginx 主配置文件
COPY nginx-main.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 创建启动脚本
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "Starting Node.js application..."' >> /start.sh && \
    echo 'node /app/app.js &' >> /start.sh && \
    echo 'sleep 2' >> /start.sh && \
    echo 'echo "Starting Nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# 启动服务
CMD ["/start.sh"]
