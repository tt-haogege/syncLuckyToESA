const { getConfig } = require('../config-utill');
const logger = require('../logger');

class TencentDnsService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * 初始化腾讯云DNS客户端
   */
  async initialize() {
    if (this.initialized && this.client) {
      return this.client;
    }

    const config = getConfig();
    const {
      tencent_dns_secret_id,
      tencent_dns_secret_key,
      tencent_dns_region = 'ap-beijing',
    } = config;

    if (!tencent_dns_secret_id || !tencent_dns_secret_key) {
      throw new Error('腾讯云DNS配置不完整：缺少 secretId 或 secretKey');
    }

    try {
      // 动态加载腾讯云SDK
      const tencentcloud = require('tencentcloud-sdk-nodejs');
      const DnspodClient = tencentcloud.dnspod.v20210323.Client;

      const clientConfig = {
        credential: {
          secretId: tencent_dns_secret_id,
          secretKey: tencent_dns_secret_key,
        },
        region: tencent_dns_region,
      };

      this.client = new DnspodClient(clientConfig);
      this.initialized = true;
      return this.client;
    } catch (error) {
      logger.error('腾讯云DNS客户端初始化失败', error);
      // 如果SDK未安装，提供友好的错误提示
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('请先安装腾讯云SDK: npm install tencentcloud-sdk-nodejs');
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

      // 腾讯云API参数
      // 注意：腾讯云的主机记录，@ 需要传空字符串或域名本身
      const subDomain = host === '@' ? '' : host;
      
      const requestParams = {
        Domain: domain,
        SubDomain: subDomain, // 主机记录，@ 传空字符串
        RecordType: recordType,
        RecordLine: '默认', // 默认线路
        Value: value,
        TTL: ttl,
      };

      // 调用创建记录接口
      const response = await this.client.CreateRecord(requestParams);
      logger.success(`🌩️ 腾讯云DNS记录创建成功: ${host}.${domain} (${recordType}) -> ${value}`, {
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
      logger.error(`创建腾讯云DNS记录失败 [${params.host}.${params.domain}]`, error);
      throw error;
    }
  }
}

module.exports = new TencentDnsService();

