"""
ETF 净值数据拉取脚本
数据源：AkShare（东方财富-天天基金网）

使用方法：
    python3 fetch_data.py                  # 拉取全部预设 ETF
    python3 fetch_data.py 510300            # 拉取指定基金代码
    python3 fetch_data.py 159915 513100     # 拉取多个指定代码

输出：将 CSV 文件保存到 src/data/prices/ 和 public/data/prices/ 目录下
"""

import os
import sys
import time
import csv
from datetime import datetime

import akshare as ak

# ============================================================
# ETF 列表（代码, 名称, 跟踪指数）
# ============================================================
ETF_LIST = [
    {"code": "005102", "name": "工银沪深300ETF联接A", "index": "沪深300"},
    {"code": "001592", "name": "天弘创业板ETF联接A", "index": "创业板指"},
    {"code": "161725", "name": "招商中证白酒指数(LOF)A", "index": "中证白酒"},
    {"code": "110003", "name": "易方达上证50指数(LOF)A", "index": "上证50"},
    {"code": "000311", "name": "景顺长城沪深300指数增强", "index": "沪深300"},
    {"code": "110011", "name": "易方达中小盘混合", "index": ""},
    {"code": "001714", "name": "工银文体产业股票", "index": ""},
    {"code": "163406", "name": "兴全合润混合(LOF)", "index": ""},
    {"code": "001938", "name": "中欧时代先锋股票A", "index": ""},
    {"code": "000083", "name": "汇添富消费行业混合", "index": ""},
    {"code": "260108", "name": "景顺长城新兴成长混合A", "index": ""},
    {"code": "040008", "name": "华安策略优选混合", "index": ""},
    {"code": "110035", "name": "易方达双债增强债券A", "index": ""},
    {"code": "000216", "name": "华安黄金易ETF联接A", "index": ""},
    {"code": "270002", "name": "广发稳健增长混合A", "index": ""},
]


def get_etf_name(code):
    """获取 ETF 名称，自定义代码返回默认名"""
    for etf in ETF_LIST:
        if etf["code"] == code:
            return etf["name"]
    return f"ETF-{code}"


def fetch_fund_nav(code):
    """通过天天基金网接口获取 ETF 净值数据"""
    name = get_etf_name(code)
    print(f"  拉取 {code} {name} ... ", end="", flush=True)

    try:
        df = ak.fund_open_fund_info_em(
            symbol=code,
            indicator="单位净值走势",
            period="成立来",
        )

        if df.empty:
            print("⚠ 无数据")
            return []

        df = df.rename(columns={
            "净值日期": "date",
            "单位净值": "nav",
            "累计净值": "acc_nav",
            "日增长率": "daily_return",
        })

        df["date"] = df["date"].astype(str)
        df = df.sort_values("date")

        records = []
        for _, r in df.iterrows():
            records.append({
                "date": r["date"],
                "open": "",
                "close": r.get("nav", ""),
                "high": "",
                "low": "",
                "volume": "",
                "amount": "",
            })

        print(f"✓ {len(records)} 条记录 ({records[0]['date']} ~ {records[-1]['date']})")
        return records

    except Exception as e:
        print(f"✗ 失败: {e}")
        return []


def save_csv(records, filepath):
    """保存为 CSV 文件"""
    if not records:
        return False

    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    fieldnames = ["date", "open", "close", "high", "low", "volume", "amount"]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow({k: r.get(k, "") for k in fieldnames})

    return True


def fetch_and_save(code, output_dirs):
    """拉取单只 ETF 并保存到多个目录"""
    records = fetch_fund_nav(code)

    for out_dir in output_dirs:
        filepath = os.path.join(out_dir, f"{code}.csv")
        save_csv(records, filepath)

    return records


def main():
    print("=" * 50)
    print("ETF 净值数据拉取工具")
    print(f"运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("数据源: 天天基金网 (AkShare)")
    print("=" * 50)

    # CSV 输出目录（同时保存到两个位置）
    script_dir = os.path.dirname(__file__)
    output_dirs = [
        os.path.join(script_dir, "src", "data", "prices"),
        os.path.join(script_dir, "public", "data", "prices"),
    ]

    # 解析命令行参数
    args = sys.argv[1:]
    if args:
        # 用户指定了代码 → 只拉取指定的
        codes = [a.strip() for a in args if a.strip()]
    else:
        # 未指定 → 拉取全部预设
        codes = [etf["code"] for etf in ETF_LIST]

    success = []
    failed = []

    for i, code in enumerate(codes, 1):
        print(f"\n[{i}/{len(codes)}]", end=" ")
        records = fetch_and_save(code, output_dirs)

        if records:
            success.append((code, get_etf_name(code), len(records)))
        else:
            failed.append(code)

        if i < len(codes):
            time.sleep(1.5)

    # 打印汇总
    print("\n" + "=" * 50)
    print(f"拉取完成！成功: {len(success)} 只", end="")
    if failed:
        print(f"，失败: {len(failed)} 只")
    else:
        print()
    for code, name, count in success:
        print(f"  ✓ {code} {name} ({count} 条)")
    for code in failed:
        print(f"  ✗ {code}")
    print(f"数据目录: {output_dirs[0]}")
    print("=" * 50)


if __name__ == "__main__":
    main()
