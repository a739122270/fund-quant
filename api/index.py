"""
Vercel Serverless API — 场外基金回测后端
"""
import os
import csv
import json
import time
import re
from datetime import datetime

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ETF Data API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Vercel 只允许写 /tmp
TMP_DIR = "/tmp/data/prices"
os.makedirs(TMP_DIR, exist_ok=True)

_fund_list_cache = None
_fund_list_cache_time = 0


# ─── 东方财富 API 直调（替代 akshare，省掉 pandas/numpy 等重依赖） ───

def fetch_eastmoney_fund_list():
    """从东方财富获取全量基金列表（JS 格式）"""
    url = "https://fund.eastmoney.com/js/fundcode_search.js"
    resp = requests.get(url, timeout=15)
    resp.encoding = "utf-8"
    # 格式: var r = [["000001","HXCZ","华厦成长","HXCZ","混合型"], ...]
    match = re.search(r'var r = (\[.*?\]);', resp.text, re.DOTALL)
    if not match:
        raise Exception("解析基金列表失败")
    data = json.loads(match.group(1))
    result = []
    for item in data:
        if len(item) >= 3:
            code = str(item[0]).strip()
            name = str(item[2]).strip()
            if len(code) == 6 and name:
                result.append({"code": code, "name": name})
    return result


def fetch_fund_nav(code: str):
    """从东方财富获取基金净值历史"""
    url = "https://api.fund.eastmoney.com/f10/lsjz"
    params = {
        "callback": "jQuery",
        "fundCode": code,
        "pageIndex": 1,
        "pageSize": 10000,
    }
    headers = {"Referer": "https://fundf10.eastmoney.com/"}
    resp = requests.get(url, params=params, headers=headers, timeout=15)
    resp.encoding = "utf-8"
    # 提取 JSON 部分
    match = re.search(r'jQuery\((.*)\)', resp.text, re.DOTALL)
    if not match:
        raise Exception("解析净值数据失败")
    data = json.loads(match.group(1))
    records = data.get("Data", {}).get("LSJZList", [])
    if not records:
        raise HTTPException(status_code=400, detail="该基金代码无数据")
    result = []
    for r in records:
        date = r.get("FSRQ", "")
        nav = r.get("DWJZ", "")
        if date and nav:
            result.append({
                "date": date,
                "open": "",
                "close": nav,
                "high": "",
                "low": "",
                "volume": "",
                "amount": "",
            })
    return sorted(result, key=lambda x: x["date"])


# ─── API 路由 ───

def get_fund_list():
    """获取全量场外基金列表（缓存 1 小时）"""
    global _fund_list_cache, _fund_list_cache_time
    now = time.time()
    if _fund_list_cache and now - _fund_list_cache_time < 3600:
        return _fund_list_cache
    try:
        result = fetch_eastmoney_fund_list()
        _fund_list_cache = result
        _fund_list_cache_time = now
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
    """拉取基金净值数据"""
    if len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="基金代码必须是 6 位数字")
    try:
        records = fetch_fund_nav(code)
        # 写 /tmp（Vercel 可写目录）
        fieldnames = ["date", "open", "close", "high", "low", "volume", "amount"]
        filepath = os.path.join(TMP_DIR, f"{code}.csv")
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            for r in records:
                w.writerow({k: r.get(k, "") for k in fieldnames})
        return {
            "code": code,
            "records": len(records),
            "firstDate": records[0]["date"],
            "lastDate": records[-1]["date"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data/{code}")
def get_fund_data(code: str):
    """返回基金净值 JSON 数据（供前端直接调）"""
    # 优先检查 /tmp
    tmp_path = os.path.join(TMP_DIR, f"{code}.csv")
    if os.path.exists(tmp_path):
        with open(tmp_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return [row for row in reader]
    raise HTTPException(status_code=404, detail=f"基金 {code} 暂无数据，请先拉取")


@app.get("/api/check/{code}")
def check_fund(code: str):
    """检查基金数据是否存在"""
    tmp_path = os.path.join(TMP_DIR, f"{code}.csv")
    return {"code": code, "exists": os.path.exists(tmp_path)}


def get_deepseek_key():
    """从环境变量读取 DeepSeek API Key"""
    return os.environ.get("DEEPSEEK_API_KEY", "")


@app.post("/api/chat")
def chat(request: dict):
    """AI 对话：分析持仓和策略"""
    messages = request.get("messages", [])
    portfolio = request.get("portfolio", {})

    funds_info = []
    for f in portfolio.get("funds", []):
        funds_info.append(f"- {f.get('name', '')}({f.get('code', '')}): 每月分配 {f.get('monthlyAmount', 0)} 元, 策略={f.get('config', {}).get('strategy', 'dca')}")
    funds_text = "\n".join(funds_info) if funds_info else "暂无"

    system_prompt = f"""你是一位专业的基金投资顾问。请以JSON格式输出分析结果，包含以下字段：
- summary: 一句话总体评价
- score: 综合评分（0-100的整数）
- strengths: 优势点列表（字符串数组，最多3条）
- risks: 风险点列表（数组，每条包含 level 为 "high"/"medium"/"low"，description 为字符串）
- suggestions: 改进建议列表（字符串数组，最多3条）
- asset_allocation: 资产配置评估（字符串）
- fund_analysis: 逐只基金分析列表（数组，每条包含 fund_name、evaluation、suggestion）

用户组合信息：
- 初始资金：{portfolio.get('initialCapital', 0)} 元
- 每月可用：{portfolio.get('monthlyAvailable', 0)} 元
- 持仓基金：
{funds_text}

只输出JSON，不要包含其他文字。"""

    api_key = request.get("api_key", "") or get_deepseek_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="未配置 API Key，请在 AI 投资顾问面板输入你的 DeepSeek API Key")

    try:
        resp = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "system", "content": system_prompt}] + [{"role": m["role"], "content": m["content"]} for m in messages],
                "response_format": {"type": "json_object"},
                "stream": False,
            },
            timeout=60,
        )
        if not resp.ok:
            err_msg = resp.text[:300]
            try:
                eb = resp.json()
                em = eb.get('error', {}).get('message', '') or eb.get('message', '')
                if em: err_msg = em
            except:
                pass
            if resp.status_code in (401, 403):
                raise HTTPException(status_code=401, detail=err_msg)
            raise HTTPException(status_code=502, detail=err_msg)
        return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
