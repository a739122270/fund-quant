# API 接口设计

## 基础信息

- 框架: FastAPI
- 默认端口: 8765
- 跨域: 允许所有来源 (CORS `*`)
- 数据格式: JSON

## 接口列表

### 1. 基金搜索

```
GET /api/funds/search?q={keyword}
```

**参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词，按代码或名称模糊匹配 |

**响应:**
```json
{
  "results": [
    { "code": "005102", "name": "工银沪深300ETF联接A" }
  ],
  "total": 128
}
```
- `results` 最多返回 50 条
- 数据来源: `ak.fund_open_fund_daily_em()` 全市场基金列表

**实现细节:**
- 基金列表首次加载后内存缓存 1 小时
- 后端做字符串模糊匹配 (`q in code or q in name`)

### 2. 拉取基金净值数据

```
POST /api/fetch/{code}
```

**路径参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 6 位数字基金代码 |

**响应 (成功):**
```json
{
  "code": "005102",
  "records": 856,
  "firstDate": "2018-01-02",
  "lastDate": "2024-12-31"
}
```

**响应 (失败):**
```json
// 400: 基金代码无效或无数据
// 500: 数据源接口异常
```

**实现细节:**
- 校验 `code` 为 6 位数字
- 调用 `ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势", period="成立来")`
- 转换为类 K 线 CSV 格式: `date, open, close, high, low, volume, amount`
- 净值填入 `close` 字段
- 同时写入 `src/data/prices/` 和 `public/data/prices/` 两个目录

### 3. 检查数据文件

```
GET /api/check/{code}
```

**响应:**
```json
{
  "code": "005102",
  "exists": true
}
```

### 4. AI 对话

```
POST /api/chat
```

**请求体:**
```json
{
  "messages": [
    { "role": "user", "content": "我的组合怎么样？" }
  ],
  "portfolio": {
    "initialCapital": 100000,
    "monthlyAvailable": 10000,
    "funds": [
      {
        "code": "005102",
        "name": "工银沪深300ETF联接A",
        "monthlyAmount": 3000,
        "config": { "strategy": "dca", ... }
      }
    ]
  },
  "api_key": "sk-xxx"  // 可选，不传则从服务端 ~/.claude/settings.json 读取
}
```

**响应:** 透传 DeepSeek API 的 chat completion 响应

**系统提示词核心内容:**
```
你是专业的基金投资顾问。请以 JSON 格式输出分析结果:
- summary: 一句话总评
- score: 0-100 评分
- strengths: 优势点列表
- risks: 风险点列表 (含 level 等级)
- suggestions: 改进建议
- asset_allocation: 资产配置评估
- fund_analysis: 逐只基金分析
```

**API Key 获取优先级:**
1. 请求体中的 `api_key` 字段
2. `~/.claude/settings.json` 中的 `env.ANTHROPIC_AUTH_TOKEN`
3. 环境变量 `DEEPSEEK_API_KEY`

**调用的外部 API:**
```
POST https://api.deepseek.com/v1/chat/completions
Model: deepseek-chat
response_format: json_object
```

## 错误处理

| 状态码 | 场景 |
|--------|------|
| 400 | 基金代码格式错误 / 数据为空 |
| 500 | 数据源异常 / 未配置 API Key |
| 502 | DeepSeek API 返回错误 |
| 503 | 基金列表尚未初始化 |

## 启动方式

```bash
python3 api_server.py
# 或
uvicorn api_server:app --host 0.0.0.0 --port 8765
```
