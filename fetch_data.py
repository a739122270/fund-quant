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
    {"code": "510300", "name": "沪深300ETF",   "index": "沪深300"},
    {"code": "510500", "name": "中证500ETF",   "index": "中证500"},
    {"code": "510050", "name": "上证50ETF",     "index": "上证50"},
    {"code": "159915", "name": "创业板ETF",     "index": "创业板指"},
    {"code": "513100", "name": "纳指ETF",       "index": "纳斯达克100"},
    {"code": "513050", "name": "中概互联ETF",   "index": "中证海外中国互联网50"},
    {"code": "518880", "name": "黄金ETF",       "index": "黄金现货"},
    {"code": "159920", "name": "恒生ETF",       "index": "恒生指数"},
    {"code": "588000", "name": "科创50ETF",     "index": "上证科创板50"},
    {"code": "512880", "name": "证券ETF",       "index": "中证全指证券"},
    {"code": "510310", "name": "沪深300ETF易方达", "index": "沪深300"},
    {"code": "159949", "name": "创业板50ETF",   "index": "创业板50"},
    {"code": "515050", "name": "5G ETF",        "index": "中证5G通信"},
    {"code": "512100", "name": "中证1000ETF",   "index": "中证1000"},
    {"code": "159865", "name": "养殖ETF",       "index": "中证畜牧"},
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
