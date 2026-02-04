const ESA20240910 = require('@alicloud/esa20240910');
const OpenApi = require('@alicloud/openapi-client');
const { getConfig, getDomainRecordValue } = require('./config-utill');
const { createDNSAnalysis } = require('./nsdAnalysis/index');
const logger = require('./logger');

class ESADnsService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * 初始化ESA客户端
   */
  async initialize() {
    if (this.initialized && this.client) {
      return this.client;
    }

    const config = getConfig();
    const {
      esa_access_key_id,
      esa_access_key_secret,
      esa_region_id,
    } = config;

    if (!esa_access_key_id || !esa_access_key_secret) {
      throw new Error('ESA配置不完整：缺少 accessKeyId 或 accessKeySecret');
    }

    try {
      // 构建 ESA 服务的 endpoint
      const endpoint = `esa.${esa_region_id}.aliyuncs.com`;
      
      const openApiConfig = new OpenApi.Config({
        accessKeyId: esa_access_key_id,
        accessKeySecret: esa_access_key_secret,
        regionId: esa_region_id,
        endpoint: endpoint,
      });

      // 处理不同的导出方式
      const ESAClient = ESA20240910.default || ESA20240910;
      this.client = new ESAClient(openApiConfig);
      this.initialized = true;
      return this.client;
    } catch (error) {
      logger.error('ESA客户端初始化失败', error);
      throw error;
    }
  }

  /**
   * 创建DNS解析记录
   * @param {Object} params - 创建记录参数
   * @param {string} params.recordName - 记录名称（域名）
   * @param {string} params.targetValue - CNAME目标值
   * @param {number} params.siteId - 站点ID
   * @param {number} [params.ttl=1] - TTL值，默认1
   * @param {boolean} [params.proxied=true] - 是否开启代理加速，默认true
   * @param {string} [params.bizName='web'] - 业务场景，可选值：web/api/video_image，默认web
   * @param {string} [params.comment=''] - 备注信息
   * @returns {Promise<Object>} 创建结果
   */
  async createRecord(params) {
    try {
      await this.initialize();

      const {
        recordName,
        targetValue,
        siteId,
        ttl = 1,
        proxied = true,
        bizName = 'web',
        comment = '',
        hostPolicy = 'follow_hostname'
      } = params;

      if (!recordName || !targetValue || !siteId) {
        throw new Error('创建DNS记录参数不完整：缺少 recordName、targetValue 或 siteId');
      }

      // 获取请求类
      const ESA = require('@alicloud/esa20240910');
      const CreateRecordRequest = ESA.CreateRecordRequest || ESA.default?.CreateRecordRequest;
      const CreateRecordRequestData = ESA.CreateRecordRequestData || ESA.default?.CreateRecordRequestData;
      const CreateRecordRequestAuthConf = ESA.CreateRecordRequestAuthConf || ESA.default?.CreateRecordRequestAuthConf;

      const {esa_domain} = getConfig()
      const domainName = esa_domain ? getDomainRecordValue(recordName)+"." + esa_domain : recordName;
      logger.debug('创建DNS记录', { domain: domainName, targetValue });

      const request = new CreateRecordRequest({
        type: 'CNAME',
        recordName: esa_domain ? getDomainRecordValue(recordName) +"."+ esa_domain : recordName,
        ttl: ttl,
        proxied: proxied,
        bizName: bizName, // 开启代理加速时必须指定业务场景
        comment: comment,
        sourceType: 'Domain',
        hostPolicy,
        data: new CreateRecordRequestData({
          value: targetValue,
        }),
        authConf: new CreateRecordRequestAuthConf({}),
        siteId: siteId,
      });

      const response = await this.client.createRecord(request);
      return response.body;
    } catch (error) {
      logger.error(`创建DNS记录失败 [${params.recordName}]`, error);
      throw error;
    }
  }

/**
 * 第二步：通过ESA SDK根据RecordId精准查询刚添加的记录，提取CNAME值
 * @param {string} recordId - 第一步返回的记录唯一ID
 * @returns {Promise<string>} 返回CNAME目标值（Value字段）
 */
async getEsaCnameValueByRecordId(recordId) {
    try {
      const ESA = require('@alicloud/esa20240910');
      const QueryRequest = ESA.GetRecordRequest || ESA.default?.GetRecordRequest;
      const queryRequest = new QueryRequest({
        recordId: recordId // 刚添加记录的RecordId
      });
      const queryResponse = await this.client.getRecord(queryRequest);
      const cnameValue = queryResponse.body;
      return cnameValue;
    } catch (error) {
      logger.error('ESA记录查询失败', error.body || error);
      throw new Error('查询CNAME值失败');
    }
  }

  /**
   * 批量创建DNS记录（用于新增规则）
   * @param {Array} rules - 规则列表，每个规则包含 Domains 和 Key
   * @param {Object} options - 选项
   * @param {number} options.siteId - 站点ID
   * @param {string} options.hostPolicy - 主机策略
   * @param {string} [options.bizName='web'] - 业务场景，可选值：web/api/video_image
   * @param {Function} options.getValueCallback - 获取目标值的回调函数 (rule) => string
   * @returns {Promise<Array>} 创建结果列表
   */
  async createRecordsForRules(rules, options) {
    const { siteId, getValueCallback, hostPolicy, bizName = 'web' } = options;

    if (!siteId) {
      throw new Error('缺少 siteId 参数');
    }

    if (!getValueCallback || typeof getValueCallback !== 'function') {
      throw new Error('缺少 getValueCallback 回调函数');
    }

    const results = [];

    for (const rule of rules) {
      try {
        // 从规则中提取域名，支持字符串或数组格式
        let domains = rule.Domains || rule.domains;
        
        // 如果domains是字符串，转换为数组
        if (typeof domains === 'string') {
          domains = domains.split(',').map(d => d.trim()).filter(d => d);
        }
        
        if (!domains || !Array.isArray(domains) || domains.length === 0) {
          logger.warn(`规则 ${rule.Key || rule.key} 没有有效的域名`);
          continue;
        }

        // 获取目标值
        const targetValue = getValueCallback(rule);
        
        if (!targetValue) {
          logger.warn(`规则 ${rule.Key || rule.key} 无法获取目标值`);
          continue;
        }

        // 为每个域名创建DNS记录
        for (const domain of domains) {
          if (!domain || typeof domain !== 'string') {
            continue;
          }

          try {
            const result = await this.createRecord({
              recordName: domain,
              targetValue: targetValue,
              hostPolicy,
              siteId: siteId,
            });

            logger.success(`🌐 DNS记录创建成功: ${domain} -> ${targetValue}`, {
              domain,
              targetValue,
              recordId: result.recordId,
            });

            const {esa_dns_analysis, esa_dns_provider} = getConfig()
            if (esa_dns_analysis) {
                logger.info(`🔍 开始查询需要配置的CNAME值: ${domain} -> ${targetValue}`);
                const recordResult = await this.getEsaCnameValueByRecordId(result.recordId);
                const host = recordResult.recordModel.recordName.split('.')[0]
                logger.success(`✅ CNAME值查询成功: ${recordResult.recordModel.recordCname}, 主机值：${host}`, {
                  cname: recordResult.recordModel.recordCname,
                  host,
                });

                logger.info(`🔗 开始DNS解析`, { host, value: recordResult.recordModel.recordCname, provider: esa_dns_provider });

                await createDNSAnalysis({
                    host,
                    value: recordResult.recordModel.recordCname,
                    provider: esa_dns_provider
                })
            }

            results.push({
                success: true,
                domain: domain,
                targetValue: targetValue,
                result: result,
              });

          } catch (error) {
            logger.error(`创建DNS记录失败 [${domain}]`, error);
            results.push({
              success: false,
              domain: domain,
              targetValue: targetValue,
              error: error.message,
            });
          }
        }
      } catch (error) {
        logger.error(`处理规则失败 [${rule.Key || rule.key}]`, error);
        results.push({
          success: false,
          rule: rule,
          error: error.message,
        });
      }
    }

    return results;
  }
}

// 导出单例
const esaDnsService = new ESADnsService();

module.exports = esaDnsService;
