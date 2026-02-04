const express = require('express');
const router = express.Router();
const { getConfig, saveConfig } = require('../config-utill');
const { reloadScheduler } = require('../scheduler');
const logger = require('../logger');

// 基础路由
router.get('/', (req, res) => {
  res.json({ message: 'Express 服务器运行正常' });
});

// 获取配置
router.get('/api/config', (req, res) => {
  const config = getConfig();
  res.json(config);
});

// 更新配置
router.post('/api/config', (req, res) => {
  const newConfig = req.body;
  const currentConfig = getConfig();
  
  // 合并配置
  const updatedConfig = { ...currentConfig, ...newConfig };
  
  if (saveConfig(updatedConfig)) {
    // 如果更新了定时任务相关配置，重新加载定时任务
    if (newConfig.lucky_cron_time || newConfig.lucky_url || newConfig.lucky_open_token) {
      reloadScheduler();
    }
    res.json({ success: true, config: updatedConfig });
  } else {
    res.status(500).json({ success: false, message: '保存配置失败' });
  }
});

// 获取日志列表
router.get('/api/logs', (req, res) => {
  try {
    const {
      level = null,
      limit = null,
      startTime = null,
      endTime = null,
    } = req.query;
    
    const options = {
      level: level || null,
      limit: limit ? parseInt(limit) : null,
      startTime: startTime || null,
      endTime: endTime || null,
    };
    
    const logs = logger.getLogs(options);
    const stats = logger.getStats();
    
    res.json({
      success: true,
      data: logs,
      stats: stats,
      total: logs.length,
    });
  } catch (error) {
    logger.error('获取日志失败', error);
    res.status(500).json({
      success: false,
      message: '获取日志失败',
      error: error.message,
    });
  }
});

// 获取日志统计信息
router.get('/api/logs/stats', (req, res) => {
  try {
    const stats = logger.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('获取日志统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取日志统计失败',
      error: error.message,
    });
  }
});

// 清空日志
router.delete('/api/logs', (req, res) => {
  try {
    logger.clearLogs();
    res.json({
      success: true,
      message: '日志已清空',
    });
  } catch (error) {
    logger.error('清空日志失败', error);
    res.status(500).json({
      success: false,
      message: '清空日志失败',
      error: error.message,
    });
  }
});

module.exports = router;

