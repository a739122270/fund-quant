"""
ETF 数据拉取 API 服务
运行: python3 api_server.py
"""

import os
import csv
import time
import json
import requests
from datetime import datetime

import akshare as ak
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="ETF Data API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SCRIPT_DIR = os.path.dirname(__file__)
OUTPUT_DIRS = [
    os.path.join(SCRIPT_DIR, "public", "data", "prices"),
    os.path.join(SCRIPT_DIR, "src", "data", "prices"),
]

_fund_list_cache = None
_fund_list_cache_time = 0


def get_fund_list():
    """获取全量场外基金列表（缓存 1 小时）"""
    global _fund_list_cache, _fund_list_cache_time
    now = time.time()
    if _fund_list_cache and now - _fund_list_cache_time < 3600:
        return _fund_list_cache
    result = []
    try:
        df = ak.fund_open_fund_daily_em()
        for _, r in df.iterrows():
            code = str(r.get("基金代码", "")).strip()
            name = str(r.get("基金简称", "")).strip()
            if len(code) == 6 and name:
                result.append({"code": code, "name": name})
        _fund_list_cache = result
        _fund_list_cache_time = now
        print(f"基金列表已加载: {len(result)} 只")
        return result
    except Exception as e:
        print(f"获取基金列表失败: {e}")
        return _fund_list_cache or []


@app.get("/api/funds/search")
def search_funds(q: str = Query("", min_length=1)):
    """搜索基金（按代码或名称模糊匹配）"""
    all_funds = get_fund_list()
    if not all_funds:
        raise HTTPException(status_code=503, detail="基金列表尚未加载完成")
    q = q.strip()
    matched = [f for f in all_funds if q in f["code"] or q in f["name"]]
    return {"results": matched[:50], "total": len(matched)}


@app.post("/api/fetch/{code}")
def fetch_fund(code: str):
    if len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="基金代码必须是 6 位数字")
    try:
        df = ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势", period="成立来")
        if df.empty:
            raise HTTPException(status_code=400, detail="该基金代码无数据")
        df = df.rename(columns={"净值日期": "date", "单位净值": "nav", "累计净值": "acc_nav", "日增长率": "daily_return"})
        df["date"] = df["date"].astype(str)
        df = df.sort_values("date")
        records = []
        for _, r in df.iterrows():
            records.append({"date": r["date"], "open": "", "close": r.get("nav", ""), "high": "", "low": "", "volume": "", "amount": ""})
        for out_dir in OUTPUT_DIRS:
            os.makedirs(out_dir, exist_ok=True)
            fieldnames = ["date", "open", "close", "high", "low", "volume", "amount"]
            with open(os.path.join(out_dir, f"{code}.csv"), "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=fieldnames)
                w.writeheader()
                for r in records:
                    w.writerow({k: r.get(k, "") for k in fieldnames})
        return {"code": code, "records": len(records), "firstDate": records[0]["date"], "lastDate": records[-1]["date"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/check/{code}")
def check_fund(code: str):
    filepath = os.path.join(OUTPUT_DIRS[0], f"{code}.csv")
    return {"code": code, "exists": os.path.exists(filepath)}


def get_deepseek_key():
    """从 Claude 配置读取 DeepSeek API Key"""
    try:
        path = os.path.expanduser("~/.claude/settings.json")
        if os.path.exists(path):
            with open(path) as f:
                d = json.load(f)
            return d.get("env", {}).get("ANTHROPIC_AUTH_TOKEN", "")
    except:
        pass
    return os.environ.get("DEEPSEEK_API_KEY", "")


@app.post("/api/chat")
def chat(request: dict):
    """AI 对话：分析持仓和策略"""
    messages = request.get("messages", [])
    portfolio = request.get("portfolio", {})

    # 构建系统提示
    funds_info = []
    for f in portfolio.get("funds", []):
        funds_info.append(f"- {f.get('name', '')}({f.get('code', '')}): 每月分配 {f.get('monthlyAmount', 0)} 元, 策略={f.get('config', {}).get('strategy', 'dca')}")
    funds_text = "\n".join(funds_info) if funds_info else "暂无"

    system_prompt = f"""你是一个专业的基金投资顾问助手。用户的持仓和策略如下：

初始资金: {portfolio.get('initialCapital', 0)} 元
每月可用: {portfolio.get('monthlyAvailable', 0)} 元
持仓基金:
{funds_text}

请根据以上信息，结合你的专业知识，回答用户的问题。可以给出具体的分析和建议。"""

    api_key = get_deepseek_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="未配置 API Key")

    try:
        resp = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "system", "content": system_prompt}] + [{"role": m["role"], "content": m["content"]} for m in messages],
                "stream": False,
            },
            timeout=60,
        )
        if not resp.ok:
            raise HTTPException(status_code=502, detail=f"DeepSeek API 错误: {resp.status_code}")
        return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8765)
