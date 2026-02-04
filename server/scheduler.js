const schedule = require('node-schedule');
const axios = require('axios');
const dayjs = require('dayjs')
const _ = require('lodash');
const { getConfig, getDomainRecordValue } = require('./config-utill');
const esaDnsService = require('./esa-dns-service');
const logger = require('./logger');

let currentJob = null;

let luckyData = null;

// 处理新增规则，自动创建DNS解析记录
async function handleNewRules(newRules, config) {

  const { esa_site_id, esa_target_value, esa_host_policy, esa_target_value_function } = config;
  // 检查ESA配置是否完整
  if (!esa_site_id) {
    logger.warn('ESA配置不完整，跳过自动创建DNS记录', { missing: 'esa_site_id' });
    return;
  }

  try {
    // 源站地址
    const getValueCallback = (rule) => {
      if (esa_target_value_function) {
        const getValue = eval(`(${esa_target_value_function})`)
        
        const targetValue = getValue(rule, getDomainRecordValue);

        logger.debug('esa_target_value_function 生成回源地址：', { domain: rule.Domains[0], targetValue });

        return targetValue
          
      }

      const hostName = getDomainRecordValue(rule.Domains[0])

      const value = esa_target_value ? `${hostName}.${esa_target_value}`: `${hostName}a.${rule.Domains[0].split(':')[0].split('.').slice(1).join('.')}`;

      logger.debug('生成回源地址：', { domain: rule.Domains[0], targetValue: value });

      return value
    };

    const results = await esaDnsService.createRecordsForRules(newRules, {
      siteId: esa_site_id,
      hostPolicy: esa_host_policy,
      getValueCallback: getValueCallback,
    });

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info(`📊 DNS记录创建完成: 成功 ${successCount} 条，失败 ${failCount} 条`, {
      success: successCount,
      fail: failCount,
      total: results.length,
    });

    // 打印失败的记录
    if (failCount > 0) {
      results.filter(r => !r.success).forEach(r => {
        logger.error(`创建失败: ${r.domain || r.rule?.Key || '未知'}`, { error: r.error });
      });
    }
  } catch (error) {
    logger.error('处理新增规则时出错', error);
  }
}

// 执行定时任务
async function executeTask() {
  try {
    const config = getConfig();
    const { lucky_url, lucky_open_token } = config;

    if (!lucky_url || !lucky_open_token) {
      logger.warn('定时任务配置不完整，跳过执行', { missing: !lucky_url ? 'lucky_url' : 'lucky_open_token' });
      return;
    }

    // 生成时间戳
    const timestamp = Date.now();
    
    // 构建请求 URL，添加时间戳和 openToken 参数
    const url = new URL(lucky_url);
    url.searchParams.append('_', timestamp.toString());
    url.searchParams.append('openToken', lucky_open_token);
    // 发送 GET 请求
    const response = await axios.get(url.toString());

    if (response.status  === 200) {
      const data = response.data.ruleList;
      const proxyList = []
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const { ProxyList } = item;
        proxyList.push(...ProxyList);
      }

      // const newRules = [{
      //   Domains: ["wer2.tthaogege.cn:2280"],
      //   Key: "e3kPfv80eXdU25Ol"
      // }];

      // if (newRules.length > 0) {
      //   await handleNewRules(newRules, config);
      // }

      const newRules = []
      
      if (luckyData) {
        const difference = _.differenceWith(proxyList, luckyData, _.isEqual)
        if (difference && difference.length > 0) {
          logger.info('查询到有规则变动：', { difference: difference.length });
          difference.forEach(item => {
            const oldItem = luckyData.find(i => i.Key === item.Key);
            // if (oldItem) {
            //   logger.info(`原来对应：${oldItem.Domains}，现在对应：${item.Domains}`);
            // }
            if (!oldItem) {
              logger.info(`新增规则：${item.Domains}`);
              newRules.push(item);
            }
          });
        }

        // 如果有新增规则，自动创建DNS解析记录
        if (newRules.length > 0) {
          await handleNewRules(newRules, config);
        }
      }

    
      luckyData = proxyList;
    }

    const nextInvocation = currentJob ? dayjs(currentJob.nextInvocation()).format('YYYY-MM-DD HH:mm:ss') : '未知';
    logger.success('⏱️ 定时任务执行完成');
    logger.info(`🕐 下一次任务执行时间: ${nextInvocation}`);
  } catch (error) {
    logger.error('🕐 定时任务执行失败', error);
  }
}

// 启动定时任务
function startScheduler() {
  // 先停止现有任务（如果存在）
  if (currentJob) {
    currentJob.cancel();
  }

  const config = getConfig();
  const { lucky_cron_time } = config;

  if (!lucky_cron_time) {
    logger.warn('未配置 lucky_cron_time，定时任务未启动');
    return;
  }

  try {
    // 使用 Cron 表达式创建定时任务
    currentJob = schedule.scheduleJob(lucky_cron_time, executeTask);
    logger.success(`⏰ 定时任务已启动，Cron 表达式: ${lucky_cron_time}`, { cron: lucky_cron_time });
    executeTask()
  } catch (error) {
    logger.error('启动定时任务失败', error);
  }
}

// 停止定时任务
function stopScheduler() {
  if (currentJob) {
    currentJob.cancel();
    currentJob = null;
    logger.info('定时任务已停止');
  }
}

// 重新加载定时任务（配置更新后调用）
function reloadScheduler() {
  stopScheduler();
  startScheduler();
}

module.exports = {
  startScheduler,
  stopScheduler,
  reloadScheduler,
  executeTask
};

