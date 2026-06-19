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

# ─── Vercel KV (Redis) ──────────────────────────────────────────
KV_REST_URL = os.environ.get("KV_REST_API_URL", "")
KV_REST_TOKEN = os.environ.get("KV_REST_API_TOKEN", "")
KV_AVAILABLE = bool(KV_REST_URL and KV_REST_TOKEN)


def kv_set(key: str, value, expire: int = 86400):
    if not KV_AVAILABLE:
        return False
    try:
        requests.post(
            f"{KV_REST_URL}/set/{key}",
            params={"data": json.dumps(value), "ex": str(expire)},
            headers={"Authorization": f"Bearer {KV_REST_TOKEN}"},
            timeout=5,
        )
        return True
    except Exception as e:
        print(f"KV set 失败: {e}")
        return False


def kv_get(key: str):
    if not KV_AVAILABLE:
        return None
    try:
        resp = requests.get(
            f"{KV_REST_URL}/get/{key}",
            headers={"Authorization": f"Bearer {KV_REST_TOKEN}"},
            timeout=5,
        )
        data = resp.json()
        if data.get("result"):
            return json.loads(data["result"])
        return None
    except Exception as e:
        print(f"KV get 失败: {e}")
        return None


def kv_exists(key: str) -> bool:
    if not KV_AVAILABLE:
        return False
    try:
        resp = requests.get(
            f"{KV_REST_URL}/exists/{key}",
            headers={"Authorization": f"Bearer {KV_REST_TOKEN}"},
            timeout=5,
        )
        return resp.json().get("result", 0) > 0
    except Exception as e:
        print(f"KV exists 失败: {e}")
        return False
# ────────────────────────────────────────────────────────────────


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
        if df is None or df.empty:
            raise HTTPException(status_code=400, detail=f"akshare 返回空数据，请确认基金代码 {code} 是否正确")
        df = df.rename(columns={"净值日期": "date", "单位净值": "nav", "累计净值": "acc_nav", "日增长率": "daily_return"})
        df["date"] = df["date"].astype(str)
        df = df.sort_values("date")
        records = []
        for _, r in df.iterrows():
            records.append({"date": r["date"], "open": "", "close": r.get("nav", ""), "high": "", "low": "", "volume": "", "amount": ""})
        # 存到 KV (Vercel)
        kv_set(f"fund_data:{code}", records)
        # 写 CSV（本地开发用，Vercel 只读会静默失败）
        for out_dir in OUTPUT_DIRS:
            try:
                os.makedirs(out_dir, exist_ok=True)
                fieldnames = ["date", "open", "close", "high", "low", "volume", "amount"]
                with open(os.path.join(out_dir, f"{code}.csv"), "w", newline="", encoding="utf-8") as f:
                    w = csv.DictWriter(f, fieldnames=fieldnames)
                    w.writeheader()
                    for r in records:
                        w.writerow({k: r.get(k, "") for k in fieldnames})
            except OSError:
                pass  # Vercel 只读文件系统，忽略
        return {"code": code, "records": len(records), "firstDate": records[0]["date"], "lastDate": records[-1]["date"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/debug")
def debug():
    """调试：检查 akshare 能否正常工作"""
    import sys
    info = {
        "python": sys.version,
        "akshare": ak.__version__ if hasattr(ak, "__version__") else "未知",
        "kv_available": KV_AVAILABLE,
    }
    # 尝试拉取一小段数据
    try:
        df = ak.fund_open_fund_info_em(symbol="000001", indicator="单位净值走势", period="成立来")
        if df is not None and not df.empty:
            info["test_fetch"] = f"成功，{len(df)} 行"
            info["test_last"] = df.tail(1).to_dict("records")[0]["净值日期"] + " " + str(df.tail(1).to_dict("records")[0]["单位净值"])
        else:
            info["test_fetch"] = f"返回空数据，type={type(df).__name__}"
    except Exception as e:
        info["test_fetch"] = f"异常: {type(e).__name__}: {e}"
    return info


@app.get("/api/data/{code}")
def get_fund_data(code: str):
    """返回基金净值 JSON 数据"""
    # 先查 KV (Vercel)
    data = kv_get(f"fund_data:{code}")
    if data:
        return data
    # 再查 CSV 文件（本地）
    for out_dir in OUTPUT_DIRS:
        filepath = os.path.join(out_dir, f"{code}.csv")
        if os.path.exists(filepath):
            with open(filepath, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                return [row for row in reader]
    raise HTTPException(status_code=404, detail=f"基金 {code} 暂无数据，请先拉取")


@app.get("/api/check/{code}")
def check_fund(code: str):
    """检查基金数据是否存在"""
    # KV 或 CSV 任一存在即可
    if kv_exists(f"fund_data:{code}"):
        return {"code": code, "exists": True}
    for out_dir in OUTPUT_DIRS:
        filepath = os.path.join(out_dir, f"{code}.csv")
        if os.path.exists(filepath):
            return {"code": code, "exists": True}
    return {"code": code, "exists": False}


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
            except: pass
            if resp.status_code in (401, 403):
                raise HTTPException(status_code=401, detail=err_msg)
            raise HTTPException(status_code=502, detail=err_msg)
        return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8765)
