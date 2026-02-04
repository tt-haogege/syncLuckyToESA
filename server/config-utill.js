const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'config.json');

// 读取配置文件
function getConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('读取配置文件失败', error);
    return { settings: {} };
  }
}

// 保存配置文件
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error('保存配置文件失败', error);
    return false;
  }
}


/**
 * 根据域名匹配对应的记录值
 * @param {string} domain - 待匹配的域名（支持带端口，如test.abc.com:8080、abc.com、aaa.bbb.abc.com）
 * @returns {string} 匹配后的记录值（如@、test、aaa.bbb）
 */
function getDomainRecordValue(domain) {
  // 校验入参是否为有效字符串
  if (typeof domain !== 'string' || domain.trim() === '') {
    throw new Error('请传入有效的域名字符串');
  }

  let pureDomain = domain.trim();
  // 规则1：移除端口号（按:分割，取前面的纯域名部分）
  if (pureDomain.includes(':')) {
    pureDomain = pureDomain.split(':')[0];
  }

  // 按.分割域名成数组（如qwe.342131.cn → ['qwe','342131','cn']，342131.cn → ['342131','cn']）
  const domainParts = pureDomain.split('.');
  // 处理特殊情况：如域名是localhost、127.0.0.1这类无多段的情况，直接返回@
  if (domainParts.length <= 1) {
    return '@';
  }

  /**
   * 核心逻辑：根域名为【最后两段】（如342131.cn、abc.com、bbb.xyz），
   * 根域名前面的所有部分即为记录值，无则返回@
   */
  // 截取根域名（最后两段）之外的所有部分
  const recordParts = domainParts.slice(0, -2);
  // 拼接成记录值，无则返回@
  return recordParts.length > 0 ? recordParts.join('.') : '@';
}

module.exports = {
  getConfig,
  saveConfig,
  getDomainRecordValue
};

