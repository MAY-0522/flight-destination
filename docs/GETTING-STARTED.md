# 快速运行

## 网页版

1. 安装 Node.js（此次构建使用 Node.js 24）。
2. 在仓库根目录执行 `node web/build.cjs`。
3. 使用任意静态 HTTP 服务托管 `web/dist/`。例如 `python -m http.server 8000 --directory web/dist`。
4. 打开 `http://localhost:8000`，验证首页、目的地搜索、中英文、币种、单程/往返和分析页。

首次打开会读取仓库内置样本，并尝试从已配置的公开报价服务补充数据。离线或服务不可用时，内置样本仍可用于描述性分析；云端更新依赖网络和服务状态。

## 微信小程序

使用微信开发者工具导入仓库根目录。`project.config.json` 保留项目结构，AppID 已替换为 `YOUR_WECHAT_APPID` 占位符；开发者需在本地填入自己的 AppID 或使用工具支持的测试模式，不会因克隆仓库获得原作者账号权限。本地私有配置未提交。

正式请求需要按微信平台要求配置请求域名。当前服务地址在 `utils/flight-api.js`、首页和分析页等请求模块中；可搜索 `flight-destination-api` 定位。更换时也需分别修改 `web/source/` 内的副本，再构建网页。

## 公共报价 Worker

见 `cloudflare-worker/README.md`。源码内 `wrangler.jsonc` 的 KV ID 是占位符，需要自行创建 KV 并绑定为 `PUBLIC_FARES`。部署到你自己的 Cloudflare 账号，按需配置 Cron；不要覆盖他人共用服务。

接口包括 `/status.json`、`/public-fares.json?destination=PEN` 和 `/rankings.json?trip_type=one_way`。公网采集不保证每次都得到新报价。

## 重新生成离线分析

仅当样本变化时，在仓库根目录依次运行：

```bash
node price-intelligence/analyze-routes.js
node price-intelligence/round-trips/analyze-round-trips.js
node price-intelligence/build-observation-index.js
```

这些命令会改写生成报告；生成后检查差异。网页版数据副本独立维护，不会自动读取根目录更新。

## 基础检查

```bash
node --check web/dist/mobile.js
node --check web/dist/mini-bundle.js
node web/build.cjs
```

这些是语法与构建检查，不等同于浏览器端到端测试。手动验证还应覆盖目的地搜索、分析图表、刷新后链接恢复、币种与语言切换、接口失败恢复。
