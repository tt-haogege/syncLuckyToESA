const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const logger = require('./logger');

// 引入路由
const configRoute = require('./router/config');
// 引入定时任务
const { startScheduler } = require('./scheduler');

// 中间件
app.use(cors()); // 启用跨域支持
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（web 目录）
app.use(express.static(path.join(__dirname, '../web')));

// API 路由（路由文件中已包含 /api 前缀）
app.use('/', configRoute);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`🚀 服务器启动成功，运行在 http://localhost:${PORT}`);
  // 启动定时任务
  startScheduler();
});

