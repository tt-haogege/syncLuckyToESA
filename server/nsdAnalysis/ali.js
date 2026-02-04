const { getConfig } = require('../config-utill');
const logger = require('../logger');

class AliDnsService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * 初始化阿里云DNS客户端
   */
  async initialize() {
    if (this.initialized && this.client) {
      return this.client;
    }

    const config = getConfig();
    const {
      esa_access_key_id,
      esa_access_key_secret,
    } = config;

    // 使用ESA的密钥
    const accessKeyId = esa_access_key_id;
    const accessKeySecret = esa_access_key_secret;

    if (!accessKeyId || !accessKeySecret) {
      throw new Error('阿里云DNS配置不完整：缺少 esa_access_key_id 或 esa_access_key_secret');
    }

    try {
      // 使用最新的阿里云DNS SDK
      const Core = require('@alicloud/pop-core');
      
      this.client = new Core({
        accessKeyId: accessKeyId,
        accessKeySecret: accessKeySecret,
        endpoint: 'https://alidns.aliyuncs.com',
        apiVersion: '2015-01-09'
      });
      
      this.initialized = true;
      return this.client;
    } catch (error) {
      logger.error('阿里云DNS客户端初始化失败', error);
      // 如果SDK未安装，提供友好的错误提示
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('请先安装阿里云DNS SDK: npm install @alicloud/pop-core');
      }
      throw error;
    }
  }

  /**
   * 创建DNS解析记录
   * @param {Object} params - 创建记录参数
   * @param {string} params.recordType - 记录类型，默认 'CNAME'
   * @param {string} params.host - 主机记录（如 @, www, subdomain）
   * @param {string} params.value - 记录值
   * @param {string} params.domain - 域名
   * @param {number} [params.ttl=600] - TTL值，默认600秒
   * @returns {Promise<Object>} 创建结果
   */
  async createRecord(params) {
    try {
      await this.initialize();

      const {
        recordType = 'CNAME',
        host,
        value,
        domain,
        ttl = 600,
      } = params;

      if (!host || !value || !domain) {
        throw new Error('创建DNS记录参数不完整：缺少 host、value 或 domain');
      }

      // 构建请求参数
      const requestParams = {
        DomainName: domain,
        RR: host, // 主机记录
        Type: recordType, // 记录类型
        Value: value, // 记录值
        TTL: ttl, // TTL
      };

      const requestOption = {
        method: 'POST'
      };

      // 调用API创建记录
      const response = await this.client.request('AddDomainRecord', requestParams, requestOption);
      logger.success(`☁️ 阿里云DNS记录创建成功: ${host}.${domain} (${recordType}) -> ${value}`, {
        recordId: response.RecordId,
        host,
        domain,
        recordType,
        value,
      });
      return {
        success: true,
        recordId: response.RecordId,
        data: response,
      };
    } catch (error) {
      logger.error(`创建阿里云DNS记录失败 [${params.host}.${params.domain}]`, error);
      throw error;
    }
  }
}

module.exports = new AliDnsService();

