# Horizon Cloud

[English](#english) · [中文](#中文)

---

<a id="english"></a>
## English

Reliable infrastructure for modern teams.

Horizon Cloud helps you deliver low-latency edge connectivity, API routing, and uptime monitoring from a lightweight Node.js service with a Vue 3 status portal.

### Features

- **Edge Network** — global delivery with automatic failover
- **API Gateway** — secure routing and rate-friendly request handling
- **Uptime Monitoring** — simple health checks for production workloads
- **Network diagnostics** — public IP, latency, and sanitized request headers
- **Bilingual UI** — English by default, Chinese available; preference saved in the browser
- **Container-ready** — runs anywhere Docker is available

### Quick start

```bash
docker pull ghcr.io/csol521guozekui/site-pulse:latest
docker run -d -p 3000:3000 \
  -e SITE_NAME="Horizon Cloud" \
  -e SITE_TAGLINE="Reliable infrastructure for modern teams." \
  ghcr.io/csol521guozekui/site-pulse:latest
```

Open `http://localhost:3000` for the portal and diagnostics.

### Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listen port | `3000` |
| `SITE_NAME` | Brand name on the homepage | `Horizon Cloud` |
| `SITE_TAGLINE` | Homepage subtitle | `Reliable infrastructure for modern teams.` |

### HTTP API

```text
GET /health        → ok
GET /api/site      → brand / tagline JSON
GET /api/status    → service status JSON
GET /api/ip        → client public IP JSON
GET /api/ping      → latency probe JSON
GET /api/headers   → sanitized request headers JSON
GET /api/all       → all of the above in one response
```

### License

MIT

---

<a id="中文"></a>
## 中文

面向现代团队的可靠基础设施服务。

Horizon Cloud 提供低延迟边缘连接、API 路由与可用性监控能力，基于轻量 Node.js 服务，并搭配 Vue 3 状态门户。

### 功能

- **边缘网络**：全球多区域分发，支持自动故障转移  
- **API 网关**：安全路由与友好的请求处理  
- **可用性监控**：面向生产环境的健康检查  
- **网络诊断**：公网 IP、延迟、脱敏请求头  
- **中英文界面**：默认英文，可切换中文，选择保存在浏览器  
- **容器就绪**：可在任意 Docker 环境运行  

### 快速开始

```bash
docker pull ghcr.io/csol521guozekui/site-pulse:latest
docker run -d -p 3000:3000 \
  -e SITE_NAME="Horizon Cloud" \
  -e SITE_TAGLINE="Reliable infrastructure for modern teams." \
  ghcr.io/csol521guozekui/site-pulse:latest
```

打开 `http://localhost:3000` 即可访问门户与诊断工具。

### 配置

| 变量 | 说明 | 默认 |
|------|------|------|
| `PORT` | HTTP 监听端口 | `3000` |
| `SITE_NAME` | 首页品牌名 | `Horizon Cloud` |
| `SITE_TAGLINE` | 首页副标题 | `Reliable infrastructure for modern teams.` |

### HTTP API

```text
GET /health        → ok
GET /api/site      → 品牌 / 副标题 JSON
GET /api/status    → 服务状态 JSON
GET /api/ip        → 客户端公网 IP JSON
GET /api/ping      → 延迟探测 JSON
GET /api/headers   → 脱敏请求头 JSON
GET /api/all       → 一次返回以上全部内容
```

### 许可证

MIT
