/**
 * 日志工具模块
 * 提供美化的日志输出和日志存储功能
 */

// 日志存储（内存中，可配置最大条数）
const MAX_LOG_SIZE = 1000; // 最多保存1000条日志
let logs = [];

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // 文本颜色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // 背景颜色
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// 日志级别配置
const logLevels = {
  INFO: { color: colors.cyan, icon: 'ℹ️', emoji: '📝', bg: colors.bgCyan },
  SUCCESS: { color: colors.green, icon: '✓', emoji: '✅', bg: colors.bgGreen },
  WARN: { color: colors.yellow, icon: '⚠', emoji: '⚠️', bg: colors.bgYellow },
  ERROR: { color: colors.red, icon: '✗', emoji: '❌', bg: colors.bgRed },
  DEBUG: { color: colors.blue, icon: '🔍', emoji: '🐛', bg: colors.bgBlue },
};

/**
 * 根据消息内容自动识别并添加相关emoji
 */
function getContextEmoji(message) {
  const msg = message.toLowerCase();
  
  // DNS相关
  if (msg.includes('dns') || msg.includes('解析') || msg.includes('记录')) {
    if (msg.includes('创建') || msg.includes('成功')) return '🌐';
    if (msg.includes('查询')) return '🔍';
    if (msg.includes('失败') || msg.includes('错误')) return '💥';
    return '🔗';
  }
  
  // 服务器相关
  if (msg.includes('服务器') || msg.includes('server')) {
    if (msg.includes('启动') || msg.includes('运行')) return '🚀';
    if (msg.includes('停止')) return '🛑';
    return '🖥️';
  }
  
  // 定时任务相关
  if (msg.includes('定时任务') || msg.includes('scheduler') || msg.includes('cron')) {
    if (msg.includes('启动')) return '⏰';
    if (msg.includes('执行') || msg.includes('完成')) return '⏱️';
    if (msg.includes('停止')) return '⏸️';
    return '📅';
  }
  
  // 配置相关
  if (msg.includes('配置') || msg.includes('config')) {
    if (msg.includes('读取')) return '📖';
    if (msg.includes('保存') || msg.includes('更新')) return '💾';
    if (msg.includes('失败')) return '📛';
    return '⚙️';
  }
  
  // 客户端/服务初始化
  if (msg.includes('客户端') || msg.includes('初始化') || msg.includes('client')) {
    if (msg.includes('成功')) return '✨';
    if (msg.includes('失败')) return '💔';
    return '🔧';
  }
  
  // 阿里云相关
  if (msg.includes('阿里云') || msg.includes('ali')) return '☁️';
  
  // 腾讯云相关
  if (msg.includes('腾讯云') || msg.includes('tencent')) return '🌩️';
  
  // ESA相关
  if (msg.includes('esa')) return '🎯';
  
  // 域名相关
  if (msg.includes('域名') || msg.includes('domain')) return '🌍';
  
  // 规则相关
  if (msg.includes('规则') || msg.includes('rule')) return '📋';
  
  // 时间相关
  if (msg.includes('时间') || msg.includes('time') || msg.includes('下一次')) return '🕐';
  
  // 统计相关
  if (msg.includes('统计') || msg.includes('完成') || msg.includes('成功') || msg.includes('失败')) {
    if (msg.includes('成功')) return '🎉';
    if (msg.includes('失败')) return '😞';
    return '📊';
  }
  
  // 默认返回空字符串，让级别emoji显示
  return '';
}

/**
 * 格式化时间戳
 */
function formatTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * 存储日志
 */
function storeLog(level, message, data = null) {
  const logEntry = {
    id: Date.now() + Math.random(), // 唯一ID
    timestamp: new Date().toISOString(),
    time: formatTime(),
    level: level,
    message: message,
    data: data,
  };
  
  logs.push(logEntry);
  
  // 限制日志数量
  if (logs.length > MAX_LOG_SIZE) {
    logs.shift(); // 移除最旧的日志
  }
}

/**
 * 格式化日志消息
 */
function formatLogMessage(level, message, data = null) {
  const levelConfig = logLevels[level] || logLevels.INFO;
  const timeStr = formatTime();
  
  // 获取上下文相关的emoji
  const contextEmoji = getContextEmoji(message);
  const emojiDisplay = contextEmoji ? `${contextEmoji} ` : `${levelConfig.emoji} `;
  
  // 构建日志前缀 - 使用更丰富的emoji
  const prefix = `${levelConfig.color}${colors.bright}[${timeStr}]${colors.reset} ${emojiDisplay}${levelConfig.color}${levelConfig.icon} ${level}${colors.reset}`;
  
  // 构建完整消息
  let fullMessage = `${prefix} ${message}`;
  
  // 如果有额外数据，格式化输出
  if (data !== null && data !== undefined) {
    if (typeof data === 'object') {
      fullMessage += `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`;
    } else {
      fullMessage += ` ${colors.dim}${data}${colors.reset}`;
    }
  }
  
  return fullMessage;
}

/**
 * 日志输出类
 */
class Logger {
  /**
   * 信息日志
   */
  info(message, data = null) {
    const formatted = formatLogMessage('INFO', message, data);
    console.log(formatted);
    storeLog('INFO', message, data);
  }
  
  /**
   * 成功日志
   */
  success(message, data = null) {
    const formatted = formatLogMessage('SUCCESS', message, data);
    console.log(formatted);
    storeLog('SUCCESS', message, data);
  }
  
  /**
   * 警告日志
   */
  warn(message, data = null) {
    const formatted = formatLogMessage('WARN', message, data);
    console.warn(formatted);
    storeLog('WARN', message, data);
  }
  
  /**
   * 错误日志
   */
  error(message, error = null) {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    const formatted = formatLogMessage('ERROR', message, errorData);
    console.error(formatted);
    storeLog('ERROR', message, errorData);
  }
  
  /**
   * 调试日志
   */
  debug(message, data = null) {
    const formatted = formatLogMessage('DEBUG', message, data);
    console.log(formatted);
    storeLog('DEBUG', message, data);
  }
  
  /**
   * DNS相关日志（快捷方法）
   */
  dns(message, data = null) {
    this.info(`🌐 ${message}`, data);
  }
  
  /**
   * 服务器相关日志（快捷方法）
   */
  server(message, data = null) {
    this.info(`🖥️ ${message}`, data);
  }
  
  /**
   * 定时任务相关日志（快捷方法）
   */
  scheduler(message, data = null) {
    this.info(`⏰ ${message}`, data);
  }
  
  /**
   * 普通日志（兼容 console.log）
   */
  log(message, ...args) {
    const data = args.length > 0 ? (args.length === 1 ? args[0] : args) : null;
    this.info(message, data);
  }
  
  /**
   * 获取所有日志
   */
  getLogs(options = {}) {
    const {
      level = null,      // 过滤级别
      limit = null,      // 限制条数
      startTime = null,  // 开始时间
      endTime = null,    // 结束时间
    } = options;
    
    let filteredLogs = [...logs];
    
    // 按级别过滤
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    // 按时间范围过滤
    if (startTime) {
      const start = new Date(startTime).getTime();
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() >= start);
    }
    
    if (endTime) {
      const end = new Date(endTime).getTime();
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() <= end);
    }
    
    // 限制条数（返回最新的）
    if (limit && limit > 0) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    // 按时间倒序排列（最新的在前）
    return filteredLogs.reverse();
  }
  
  /**
   * 清空日志
   */
  clearLogs() {
    logs = [];
  }
  
  /**
   * 获取日志统计信息
   */
  getStats() {
    const stats = {
      total: logs.length,
      byLevel: {},
    };
    
    logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });
    
    return stats;
  }
}

// 导出单例
const logger = new Logger();

module.exports = logger;

