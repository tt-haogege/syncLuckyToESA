# Auto ESA DNS - Lucky规则自动同步到ESA DNS服务

<div align="center">

![公众号二维码](qrcode.jpg)

**关注公众号「前端仔玩儿nas」获取更多Nas技术分享**

</div>

---

## 📚 详细文章

> 详细的部署教程和使用说明请参考以下文章（文章发布后会更新链接）：
> 
> - [项目介绍与部署教程](#) - *待发布*
> - [配置说明与使用指南](#) - *待发布*
> - [常见问题与解决方案](#) - *待发布*

---

## 📖 项目简介

Auto ESA DNS 是一个自动化工具，用于将 Lucky 代理域名自动同步到阿里云 ESA（Edge Site Accelerator）DNS 服务。该工具通过定时任务监控 Lucky 的规则变化，当检测到新增规则时，自动在 ESA 中创建对应的 DNS 解析记录，并可选择性地将解析记录同步到阿里云或腾讯云的 DNS 服务。

### 主要功能

- ✅ 定时监控 Lucky 规则变化
- ✅ 自动创建 ESA DNS 解析记录
- ✅ 支持自动同步到阿里云/腾讯云 DNS
- ✅ Web 界面配置管理
- ✅ 实时日志查看
- ✅ Docker 一键部署

---

## 📁 项目目录结构

```
autoEsaDns/
├── docker-compose.yml          # Docker Compose 配置文件
├── Dockerfile                  # Docker 镜像构建文件
├── nginx-main.conf            # Nginx 主配置文件
├── qrcode.jpg                 # 公众号二维码图片
├── README.md                  # 项目说明文档（本文件）
├── server/                    # 后端服务目录
│   ├── app.js                 # Express 应用入口文件
│   ├── config-utill.js        # 配置文件工具函数
│   ├── config.json            # 应用配置文件
│   ├── esa-dns-service.js     # ESA DNS 服务封装类
│   ├── logger.js              # 日志工具模块
│   ├── package.json           # Node.js 依赖配置
│   ├── package-lock.json      # 依赖锁定文件
│   ├── scheduler.js           # 定时任务调度器
│   ├── router/                # 路由目录
│   │   └── config.js          # 配置管理路由
│   └── nsdAnalysis/           # DNS 解析服务目录
│       ├── index.js           # DNS 解析服务入口
│       ├── ali.js             # 阿里云 DNS 服务
│       └── tencent.js         # 腾讯云 DNS 服务
└── web/                       # 前端静态文件目录
    └── index.html             # Web 管理界面
```

---

## 🚀 部署指南

### 前置要求

- Docker 和 Docker Compose 已安装
- 已获取阿里云 ESA 的 AccessKey 和 SecretKey
- 已配置 Lucky 服务并获取 OpenToken
- （可选）已配置阿里云或腾讯云 DNS 服务的密钥

### 使用 Docker Compose 部署

```
version: '3.8'

services:
  sync-lucky-to-esa:
    image: ghcr.io/tt-haogege/sync-lucky-to-esa
    ports:
      - "8036:80"

```

#### 访问 Web 界面

服务启动后，访问以下地址打开 Web 管理界面：

```
http://localhost:8036
```

---

### 使用 Docker 命令部署

如果不使用 Docker Compose，也可以直接使用 Docker 命令：

#### 1. 拉取镜像

```bash
docker pull ghcr.io/tt-haogege/sync-lucky-to-esa
```

#### 2. 运行容器

```bash
docker run -d \
  --name sync-lucky-to-esa \
  -p 8036:80 \
  ghcr.io/tt-haogege/sync-lucky-to-esa
```
---

### 配置说明

#### Lucky 配置

- **lucky_url**: Lucky 服务的完整地址（包含协议和端口）
- **lucky_cron_time**: Cron 表达式，定义定时任务的执行频率
  - 示例：`0 */2 * * * *` 表示每 2 分钟执行一次
  - 格式：`秒 分 时 日 月 周`
- **lucky_open_token**: Lucky 的 OpenToken，用于 API 认证

#### ESA 配置

- **esa_access_key_id**: 阿里云 AccessKey ID
- **esa_access_key_secret**: 阿里云 AccessKey Secret
- **esa_region_id**: ESA 服务区域（如：cn-hangzhou）
- **esa_domain**: ESA 域名（可选，如果配置了会自动添加到记录名）
- **esa_site_id**: ESA 站点 ID
- **esa_target_value**: 目标值模板（用于生成 CNAME 目标值）
- **esa_host_policy**: 主机策略（follow_hostname/ip_hash/least_conn）
- **esa_target_value_function**: 自定义目标值生成函数（JavaScript 代码字符串）

#### DNS 解析配置（可选）

- **esa_dns_analysis**: 是否启用 DNS 解析同步（true/false）
- **esa_dns_provider**: DNS 服务商（ali/tencent）

**阿里云 DNS 配置：**
- **ali_dns_region_id**: 阿里云 DNS 区域 ID
- **ali_dns_domain**: 阿里云 DNS 域名

**腾讯云 DNS 配置：**
- **tencent_dns_secret_id**: 腾讯云 SecretId
- **tencent_dns_secret_key**: 腾讯云 SecretKey
- **tencent_dns_region**: 腾讯云 DNS 区域
- **tencent_dns_domain**: 腾讯云 DNS 域名

---

## 🔧 使用说明

### Web 界面配置

1. 访问 `http://localhost:8036` 打开管理界面
2. 在配置表单中填写各项配置
3. 点击"保存配置"按钮
4. 配置会自动保存并重新加载定时任务

### 定时任务

服务启动后会自动启动定时任务，根据 `lucky_cron_time` 配置的频率执行：

1. 从 Lucky API 获取规则列表
2. 对比上次获取的规则，检测新增规则
3. 为新增规则自动创建 ESA DNS 记录
4. （可选）如果启用了 DNS 解析同步，会将 ESA 返回的 CNAME 值同步到阿里云或腾讯云 DNS

### 日志查看

在 Web 界面可以：
- 实时查看日志列表
- 按级别过滤日志
- 查看日志统计信息
- 清空日志

---

## ⚠️ 注意事项

1. **网络连接**：确保容器可以访问 Lucky 服务和阿里云/腾讯云 API
2. **时区设置**：容器已设置为东八区（北京时间），日志时间以该时区为准
3. **规则过滤**：如果 Lucky 规则的备注中包含 `_no_esa`，该规则会被跳过，不会创建 DNS 记录
4. **端口冲突**：如果 8036 端口被占用，可以在 `docker-compose.yml` 中修改端口映射

---

## 📝 更新日志

### v1.0.0
- 初始版本发布
- 支持 Lucky 规则自动同步到 ESA DNS
- 支持阿里云和腾讯云 DNS 解析同步
- Web 界面配置管理
- 实时日志查看

---

## 📄 许可证

本项目采用 MIT 许可证。

---

## 🙏 致谢

感谢所有为开源社区做出贡献的开发者！

---

<div align="center">

**如果这个项目对你有帮助，欢迎 Star ⭐**

![公众号二维码](qrcode.jpg)

**关注「前端仔玩儿nas」获取更多Nas技术分享**

</div>

