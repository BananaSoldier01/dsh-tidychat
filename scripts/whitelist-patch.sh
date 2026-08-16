#!/usr/bin/env bash
# dsh-tidychat 白名单补丁
# 作用：把 tidychat 加进 dsh-host-apiproxy 的 WEB_SETTINGS_NAMESPACES 白名单，
#       使「设置 > 插件配置」里 dsh-tidychat 的四个开关可写（否则开关会变灰）。
# 背景：DSH 的白名单硬编码在编译产物里；DSH 升级后会被覆盖，升级后重跑本脚本即可恢复。
# 幂等：已打补丁的文件会跳过。
# 用法：bash scripts/whitelist-patch.sh [dsh-checkout-dir]
#       默认 checkout 目录 /opt/homebrew/lib/node_modules/@deepseek-ai/dsh

set -euo pipefail

DSH_DIR="${1:-/opt/homebrew/lib/node_modules/@deepseek-ai/dsh}"
LIB="$DSH_DIR/node_modules/@deepseek-ai/dsh-host-apiproxy/lib"

python3 - "$LIB" <<'PY'
import sys, os, shutil

lib = sys.argv[1]

def patch(path):
    if not os.path.exists(path):
        print(f"FAIL: file missing: {path}")
        return False
    src = open(path, encoding="utf-8").read()
    if "tidychat" in src:
        print(f"skip (already patched): {path}")
        return True
    i = src.find("WEB_SETTINGS_NAMESPACES")
    if i == -1:
        print(f"FAIL: WEB_SETTINGS_NAMESPACES not found in {path}")
        return False
    end = src.find("];", i)
    if end == -1:
        print(f"FAIL: closing `];` not found in {path}")
        return False
    before = src[:end]
    # 引号风格：数组内已有的引号
    quote = "'" if "'" in before[i:] else '"'
    # 最后一个非空元素行的前导缩进
    indent = ""
    for ln in reversed(before.split("\n")):
        if ln.strip() != "":
            indent = ln[: len(ln) - len(ln.lstrip())]
            break
    # 最后一个元素后是否需要补逗号
    stripped = before.rstrip()
    comma = "" if stripped.endswith(",") else ","
    insertion = comma + "\n" + indent + quote + "tidychat" + quote
    new = src[:end].rstrip() + insertion + src[end:]
    shutil.copy2(path, path + ".tidychat.bak")
    open(path, "w", encoding="utf-8").write(new)
    print(f"patched: {path} (backup: {path}.tidychat.bak)")
    return True

ok = True
for name in ["index.js", "types/api-proxy.js"]:
    ok = patch(os.path.join(lib, name)) and ok
sys.exit(0 if ok else 1)
PY

if [ $? -ne 0 ]; then
  echo "patch failed — 见上方；文件布局可能有差异，请手动把 tidychat 加进 WEB_SETTINGS_NAMESPACES"
  exit 1
fi

# 语法自检：改坏了立刻报错，绝不留下坏文件
for f in "$LIB/index.js" "$LIB/types/api-proxy.js"; do
  if [ -f "$f" ]; then
    node --check "$f" >/dev/null 2>&1 || { echo "FAIL: $f 语法检查失败"; exit 1; }
  fi
done
echo "whitelist patch done. 重启 dsh web 生效。"
