# AI 投资顾问 — 技术说明

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器 (React)                        │
│  AIChat.tsx                                             │
│  ├── 用户输入问题                                        │
│  ├── POST /api/chat → 发送 messages + portfolio 上下文   │
│  ├── 接收 DeepSeek 回复并展示                            │
│  └── 聊天记录保存在 React 状态中（切换 Tab 不丢失）       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                Python FastAPI (:8765)                    │
│  POST /api/chat                                         │
│  ├── 1. 接收前端请求（messages + portfolio）             │
│  ├── 2. 构建系统提示（持仓 + 策略上下文）                │
│  ├── 3. 调用 DeepSeek API（OpenAI 兼容格式）             │
│  │      POST https://api.deepseek.com/v1/chat/completions│
│  │      Model: deepseek-chat                             │
│  ├── 4. 返回 DeepSeek 响应给前端                         │
│  └── API Key 从 ~/.claude/settings.json 读取             │
└──────────────────────────────────────────────────────────┘
```

## 数据流

### 请求格式
前端发送：
```json
{
  "messages": [
    {"role": "user", "content": "我的组合风险怎么样？"}
  ],
  "portfolio": {
    "initialCapital": 100000,
    "monthlyAvailable": 10000,
    "funds": [
      {
        "name": "工银沪深300ETF联接A",
        "code": "005102",
        "monthlyAmount": 3000,
        "config": { "strategy": "dca", "amount": 3000, ... }
      }
    ]
  }
}
```

### 系统提示（自动构建）
```python
system_prompt = f"""你是一个专业的基金投资顾问助手。用户的持仓和策略如下：

初始资金: 100000 元
每月可用: 10000 元
持仓基金:
- 工银沪深300ETF联接A(005102): 每月分配 3000 元, 策略=dca

请根据以上信息，结合你的专业知识，回答用户的问题。"""
```

### 响应格式
DeepSeek 返回标准 OpenAI 格式：
```json
{
  "choices": [{
    "message": {
      "content": "根据您的持仓情况..."
    }
  }]
}
```

## 组件位置

### 前端
- 组件：`src/pages/Portfolio/AIChat.tsx`
- 集成：`src/pages/PortfolioBacktest.tsx` 右侧 360px 区域
- 样式：固定在卡片内，消息列表可滚动，输入框在底部

### 后端
- 端点：`api_server.py` POST `/api/chat`
- API Key 来源：读取 `~/.claude/settings.json` 中的 `ANTHROPIC_AUTH_TOKEN`（即 DeepSeek Key）

## 依赖
- Python: `requests` 库（调用 DeepSeek API）
- 前端：无额外依赖（原生 fetch）

## 注意事项
- API Key 存储在服务端，不暴露在浏览器
- 对话上下文仅限于当前会话（刷新页面后聊天记录清空，切换 Tab 保留）
- 持仓信息在每次请求时实时获取，确保 AI 获取最新配置
