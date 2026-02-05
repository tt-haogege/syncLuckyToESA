const aliDnsService = require('./ali');
const tencentDnsService = require('./tencent');
const { getConfig } = require('../config-utill');
const logger = require('../logger');

/**
 * 通用的DNS解析记录创建方法
 * @param {Object} params - 创建记录参数
 * @param {string} params.recordType - 记录类型，默认 'CNAME'，可选值：A, AAAA, CNAME, MX, TXT, NS, SRV, CAA
 * @param {string} params.host - 主机记录（如 @, www, subdomain）
 * @param {string} params.value - 记录值
 * @param {string} params.provider - 服务商，'ali' 表示阿里云，'tencent' 表示腾讯云
   * @param {string} [params.domain] - 域名，如果不提供则默认使用config.json中的esa_domain
 * @returns {Promise<Object>} 创建结果
 */
async function createDNSAnalysis(params) {
  const {
    recordType = 'CNAME',
    host,
    value,
    provider,
    domain,
  } = params;

  // 参数验证
  if (!host || !value || !provider) {
    throw new Error('参数不完整：缺少 host、value 或 provider');
  }

  // 验证服务商
  if (provider !== 'ali' && provider !== 'tencent') {
    throw new Error(`不支持的服务商: ${provider}，仅支持 'ali' 或 'tencent'`);
  }

  // 获取域名（如果未提供，根据服务商优先使用对应的DNS域名，否则使用esa_domain）
  let targetDomain = domain;
  if (!targetDomain) {
    const config = getConfig();
    
    // 根据服务商选择域名：优先使用配置的DNS域名，如果没有则使用esa_domain
    if (provider === 'ali') {
      targetDomain = config.ali_dns_domain || config.esa_domain;
    } else if (provider === 'tencent') {
      targetDomain = config.tencent_dns_domain || config.esa_domain;
    } else {
      targetDomain = config.esa_domain;
    }
    
    if (!targetDomain) {
      throw new Error(`未提供域名参数，且配置文件中未找到 ${provider === 'ali' ? 'ali_dns_domain' : provider === 'tencent' ? 'tencent_dns_domain' : 'esa_domain'} 配置`);
    }
  }

  // 根据服务商调用对应的服务
  try {
    if (provider === 'ali') {
      return await aliDnsService.createRecord({
        recordType,
        host,
        value,
        domain: targetDomain,
      });
    } else if (provider === 'tencent') {
      return await tencentDnsService.createRecord({
        recordType,
        host,
        value,
        domain: targetDomain,
      });
    }
  } catch (error) {
    logger.error(`创建DNS记录失败 [${provider}]`, error);
    throw error;
  }
}

module.exports = {
  createDNSAnalysis,
  aliDnsService,
  tencentDnsService,
};

