#!/usr/bin/env bash
set -euo pipefail

脚本目录="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
仓库根目录="$(cd "${脚本目录}/.." && pwd)"
实例目录="${脚本目录}/instances"
实例编排文件="${脚本目录}/docker-compose.vps.yml"
网关编排文件="${脚本目录}/docker-compose.gateway.yml"
网关目录="${脚本目录}/gateway"
网关配置文件="${网关目录}/Caddyfile"
公网网络名称="eigp-public"

mkdir -p "${实例目录}" "${网关目录}"
touch "${实例目录}/.gitkeep" "${网关目录}/.gitkeep"

检查命令() {
  local 命令="$1"
  if ! command -v "${命令}" >/dev/null 2>&1; then
    echo "缺少命令：${命令}"
    exit 1
  fi
}

检查命令 docker
docker compose version >/dev/null

去空格() {
  local 值="$1"
  值="${值#"${值%%[![:space:]]*}"}"
  值="${值%"${值##*[![:space:]]}"}"
  printf '%s' "${值}"
}

输入必填() {
  local 提示="$1"
  local 默认值="${2:-}"
  local 输入值

  if [[ -n "${默认值}" ]]; then
    read -r -p "${提示} [${默认值}]: " 输入值
    输入值="$(去空格 "${输入值}")"
    printf '%s' "${输入值:-${默认值}}"
    return
  fi

  while true; do
    read -r -p "${提示}: " 输入值
    输入值="$(去空格 "${输入值}")"
    if [[ -n "${输入值}" ]]; then
      printf '%s' "${输入值}"
      return
    fi
    echo "该项不能为空。"
  done
}

输入可留空() {
  local 提示="$1"
  local 默认值="${2:-}"
  local 输入值

  if [[ -n "${默认值}" ]]; then
    read -r -p "${提示} [${默认值}]: " 输入值
    输入值="$(去空格 "${输入值}")"
    printf '%s' "${输入值:-${默认值}}"
    return
  fi

  read -r -p "${提示}: " 输入值
  输入值="$(去空格 "${输入值}")"
  printf '%s' "${输入值}"
}

确认是非() {
  local 提示="$1"
  local 默认值="${2:-y}"
  local 后缀="[Y/n]"
  local 输入值

  if [[ "${默认值}" == "n" ]]; then
    后缀="[y/N]"
  fi

  while true; do
    read -r -p "${提示} ${后缀}: " 输入值
    输入值="$(去空格 "${输入值}")"
    输入值="${输入值,,}"
    if [[ -z "${输入值}" ]]; then
      输入值="${默认值}"
    fi

    case "${输入值}" in
      y|yes) return 0 ;;
      n|no) return 1 ;;
      *) echo "请输入 y 或 n。" ;;
    esac
  done
}

生成随机密钥() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi
  tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64
}

规范实例名() {
  local 原始="$1"
  原始="${原始,,}"
  原始="$(printf '%s' "${原始}" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
  printf '%s' "${原始}"
}

实例环境文件() {
  local 实例名="$1"
  printf '%s/%s.env' "${实例目录}" "${实例名}"
}

实例工作目录() {
  local 实例名="$1"
  printf '%s/%s' "${实例目录}" "${实例名}"
}

载入环境文件() {
  local 文件="$1"
  set -a
  # shellcheck disable=SC1090
  source "${文件}"
  set +a
}

生成前端地址() {
  local 域名="$1"
  local 启用HTTPS="$2"
  if [[ "${启用HTTPS}" == "true" ]]; then
    printf 'https://%s' "${域名}"
  else
    printf 'http://%s' "${域名}"
  fi
}

写入实例环境() {
  local 文件="$1"
  cat >"${文件}" <<EOF
INSTANCE_NAME="${INSTANCE_NAME}"
STACK_NAME="${STACK_NAME}"
DOMAIN="${DOMAIN}"
ENABLE_HTTPS="${ENABLE_HTTPS}"
FRONTEND_URL="${FRONTEND_URL}"
POSTGRES_DB="${POSTGRES_DB}"
POSTGRES_USER="${POSTGRES_USER}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
JWT_SECRET="${JWT_SECRET}"
APP_ENCRYPTION_KEY="${APP_ENCRYPTION_KEY}"
RESEND_API_KEY="${RESEND_API_KEY}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL}"
MAIL_DEBUG="${MAIL_DEBUG}"
VERIFICATION_CODE_EXPIRES_MINUTES="${VERIFICATION_CODE_EXPIRES_MINUTES}"
EOF
}

写入实例辅助文件() {
  local 实例名="$1"
  local 环境文件="$2"
  local 目录
  目录="$(实例工作目录 "${实例名}")"

  mkdir -p "${目录}"
  cp "${环境文件}" "${目录}/.env"

  cat >"${目录}/启动并重建.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
脚本目录="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
仓库根目录="$(cd "${脚本目录}/../../.." && pwd)"
环境文件="${脚本目录}/.env"
实例编排文件="${仓库根目录}/deploy/docker-compose.vps.yml"
网关编排文件="${仓库根目录}/deploy/docker-compose.gateway.yml"

set -a
source "${环境文件}"
set +a

docker compose --env-file "${环境文件}" --project-name "${STACK_NAME}" -f "${实例编排文件}" up -d --build --remove-orphans
docker compose -f "${网关编排文件}" up -d --remove-orphans
EOF

  cat >"${目录}/拉取更新并重建.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
脚本目录="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
仓库根目录="$(cd "${脚本目录}/../../.." && pwd)"
环境文件="${脚本目录}/.env"
实例编排文件="${仓库根目录}/deploy/docker-compose.vps.yml"
网关编排文件="${仓库根目录}/deploy/docker-compose.gateway.yml"

git -C "${仓库根目录}" pull --ff-only

set -a
source "${环境文件}"
set +a

docker compose --env-file "${环境文件}" --project-name "${STACK_NAME}" -f "${实例编排文件}" up -d --build --remove-orphans
docker compose -f "${网关编排文件}" up -d --remove-orphans
EOF

  cat >"${目录}/仅启动.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
脚本目录="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
仓库根目录="$(cd "${脚本目录}/../../.." && pwd)"
环境文件="${脚本目录}/.env"
实例编排文件="${仓库根目录}/deploy/docker-compose.vps.yml"
网关编排文件="${仓库根目录}/deploy/docker-compose.gateway.yml"

set -a
source "${环境文件}"
set +a

docker compose --env-file "${环境文件}" --project-name "${STACK_NAME}" -f "${实例编排文件}" up -d
docker compose -f "${网关编排文件}" up -d --remove-orphans
EOF

  cat >"${目录}/停止.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
脚本目录="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
仓库根目录="$(cd "${脚本目录}/../../.." && pwd)"
环境文件="${脚本目录}/.env"
实例编排文件="${仓库根目录}/deploy/docker-compose.vps.yml"

set -a
source "${环境文件}"
set +a

docker compose --env-file "${环境文件}" --project-name "${STACK_NAME}" -f "${实例编排文件}" stop
EOF

  cat >"${目录}/删除容器保留数据库.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
脚本目录="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
仓库根目录="$(cd "${脚本目录}/../../.." && pwd)"
环境文件="${脚本目录}/.env"
实例编排文件="${仓库根目录}/deploy/docker-compose.vps.yml"

set -a
source "${环境文件}"
set +a

docker compose --env-file "${环境文件}" --project-name "${STACK_NAME}" -f "${实例编排文件}" down --remove-orphans
EOF

  cat >"${目录}/查看日志.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
脚本目录="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
仓库根目录="$(cd "${脚本目录}/../../.." && pwd)"
环境文件="${脚本目录}/.env"
实例编排文件="${仓库根目录}/deploy/docker-compose.vps.yml"

set -a
source "${环境文件}"
set +a

docker compose --env-file "${环境文件}" --project-name "${STACK_NAME}" -f "${实例编排文件}" logs -f
EOF

  cat >"${目录}/说明.txt" <<EOF
实例名称：${INSTANCE_NAME}
Compose 项目名：${STACK_NAME}
绑定域名：${DOMAIN}
前端访问地址：${FRONTEND_URL}
数据库卷：${STACK_NAME}_postgres_data

已自动生成：
- ${目录}/.env
- ${目录}/启动并重建.sh
- ${目录}/拉取更新并重建.sh
- ${目录}/仅启动.sh
- ${目录}/停止.sh
- ${目录}/删除容器保留数据库.sh
- ${目录}/查看日志.sh

访问前请确认：
1. 域名 A 记录已经手动指向 VPS 公网 IP。
2. VPS 的 80/443 端口已经放行。
3. 如果启用 HTTPS，首次签证书时域名必须已经解析到当前服务器。
4. 数据库不会因为容器停止、重建、docker compose down 而丢失。
5. 只有手动 down -v 或删除 volume 才会真的删库。
EOF

  chmod +x \
    "${目录}/启动并重建.sh" \
    "${目录}/拉取更新并重建.sh" \
    "${目录}/仅启动.sh" \
    "${目录}/停止.sh" \
    "${目录}/删除容器保留数据库.sh" \
    "${目录}/查看日志.sh"
}

确保公网网络() {
  if ! docker network inspect "${公网网络名称}" >/dev/null 2>&1; then
    docker network create "${公网网络名称}" >/dev/null
  fi
}

实例状态() {
  local 项目名="$1"
  local 运行中
  local 全部

  运行中="$(docker ps --filter "label=com.docker.compose.project=${项目名}" -q | wc -l | tr -d ' ')"
  if [[ "${运行中}" != "0" ]]; then
    printf '运行中'
    return
  fi

  全部="$(docker ps -a --filter "label=com.docker.compose.project=${项目名}" -q | wc -l | tr -d ' ')"
  if [[ "${全部}" != "0" ]]; then
    printf '已停止'
    return
  fi

  printf '仅配置未启动'
}

实例编排() {
  local 环境文件="$1"
  local 项目名="$2"
  shift 2
  docker compose --env-file "${环境文件}" --project-name "${项目名}" -f "${实例编排文件}" "$@"
}

生成网关配置() {
  mapfile -t 环境文件列表 < <(find "${实例目录}" -maxdepth 1 -type f -name '*.env' | sort)

  cat >"${网关配置文件}" <<'EOF'
{
  auto_https disable_redirects
}

EOF

  local 文件
  for 文件 in "${环境文件列表[@]}"; do
    载入环境文件 "${文件}"
    if [[ "${ENABLE_HTTPS}" == "true" ]]; then
      cat >>"${网关配置文件}" <<EOF
${DOMAIN} {
  reverse_proxy ${STACK_NAME}-web:80
}

EOF
    else
      cat >>"${网关配置文件}" <<EOF
http://${DOMAIN} {
  reverse_proxy ${STACK_NAME}-web:80
}

EOF
    fi
  done
}

启动或更新网关() {
  确保公网网络
  生成网关配置
  docker compose -f "${网关编排文件}" up -d --remove-orphans
}

打印实例摘要() {
  cat <<EOF

实例名称：${INSTANCE_NAME}
Compose 项目名：${STACK_NAME}
绑定域名：${DOMAIN}
启用 HTTPS：${ENABLE_HTTPS}
前端访问地址：${FRONTEND_URL}
数据库名：${POSTGRES_DB}
数据库用户：${POSTGRES_USER}
数据库卷：${STACK_NAME}_postgres_data
Resend Key：$( [[ -n "${RESEND_API_KEY}" ]] && printf '已填写' || printf '未填写' )
MAIL_DEBUG：${MAIL_DEBUG}

提醒：
- JWT_SECRET、APP_ENCRYPTION_KEY、POSTGRES_PASSWORD 建议使用强随机值。
- 脚本会自动创建实例 .env、实例管理脚本以及网关配置。
- 域名解析不会自动在 DNS 厂商后台创建，你必须手动把 A 记录指向 VPS 公网 IP。
- 只要 80/443 已放行，并且域名已解析到本机，使用域名即可直接访问前端页面。
- 数据库不会因为容器停止、重建、docker compose down 而丢失。
- 只有手动 down -v 或删除 volume 才会真的删库。
EOF
}

采集实例配置() {
  local 模式="$1"

  if [[ "${模式}" == "新建" ]]; then
    local 原始名称
    原始名称="$(输入必填 "请输入实例名称（例如 prod、demo、client-a）")"
    INSTANCE_NAME="$(规范实例名 "${原始名称}")"
    if [[ -z "${INSTANCE_NAME}" ]]; then
      echo "实例名称无效。"
      exit 1
    fi

    STACK_NAME="eigp-${INSTANCE_NAME}"
    DOMAIN="$(输入必填 "请输入要绑定的域名")"
    if 确认是非 "是否启用 HTTPS 自动证书" "y"; then
      ENABLE_HTTPS="true"
    else
      ENABLE_HTTPS="false"
    fi
    FRONTEND_URL="$(生成前端地址 "${DOMAIN}" "${ENABLE_HTTPS}")"
    POSTGRES_DB="$(输入必填 "请输入 PostgreSQL 数据库名" "eigp")"
    POSTGRES_USER="$(输入必填 "请输入 PostgreSQL 用户名" "postgres")"

    local 数据库密码输入
    数据库密码输入="$(输入可留空 "请输入 PostgreSQL 密码（留空自动生成）")"
    POSTGRES_PASSWORD="${数据库密码输入:-$(生成随机密钥)}"

    local jwt输入
    jwt输入="$(输入可留空 "请输入 JWT_SECRET（留空自动生成）")"
    JWT_SECRET="${jwt输入:-$(生成随机密钥)}"

    local 加密输入
    加密输入="$(输入可留空 "请输入 APP_ENCRYPTION_KEY（留空自动生成）")"
    APP_ENCRYPTION_KEY="${加密输入:-$(生成随机密钥)}"

    RESEND_API_KEY="$(输入可留空 "请输入 RESEND_API_KEY（选填）")"
    RESEND_FROM_EMAIL="$(输入必填 "请输入发件邮箱标识" "EIGP <onboarding@resend.dev>")"
    MAIL_DEBUG="$(输入必填 "是否启用 MAIL_DEBUG（true/false）" "false")"
    VERIFICATION_CODE_EXPIRES_MINUTES="$(输入必填 "验证码有效期（分钟）" "10")"
    return
  fi

  DOMAIN="$(输入必填 "域名" "${DOMAIN}")"
  if 确认是非 "是否启用 HTTPS 自动证书" "$( [[ "${ENABLE_HTTPS}" == "true" ]] && printf 'y' || printf 'n' )"; then
    ENABLE_HTTPS="true"
  else
    ENABLE_HTTPS="false"
  fi
  FRONTEND_URL="$(生成前端地址 "${DOMAIN}" "${ENABLE_HTTPS}")"
  RESEND_API_KEY="$(输入可留空 "RESEND_API_KEY（选填）" "${RESEND_API_KEY}")"
  RESEND_FROM_EMAIL="$(输入必填 "发件邮箱标识" "${RESEND_FROM_EMAIL}")"
  MAIL_DEBUG="$(输入必填 "MAIL_DEBUG（true/false）" "${MAIL_DEBUG}")"
  VERIFICATION_CODE_EXPIRES_MINUTES="$(输入必填 "验证码有效期（分钟）" "${VERIFICATION_CODE_EXPIRES_MINUTES}")"
}

新建实例() {
  采集实例配置 "新建"
  local 环境文件
  环境文件="$(实例环境文件 "${INSTANCE_NAME}")"

  if [[ -f "${环境文件}" ]]; then
    echo "实例 ${INSTANCE_NAME} 已存在。"
    return
  fi

  打印实例摘要
  if ! 确认是非 "确认创建并启动该实例？" "y"; then
    echo "已取消。"
    return
  fi

  写入实例环境 "${环境文件}"
  写入实例辅助文件 "${INSTANCE_NAME}" "${环境文件}"
  确保公网网络
  实例编排 "${环境文件}" "${STACK_NAME}" up -d --build --remove-orphans
  启动或更新网关
  echo "实例 ${INSTANCE_NAME} 已创建并启动。"
  echo "已生成目录：$(实例工作目录 "${INSTANCE_NAME}")"
}

选择已有实例() {
  mapfile -t 环境文件列表 < <(find "${实例目录}" -maxdepth 1 -type f -name '*.env' | sort)
  if [[ ${#环境文件列表[@]} -eq 0 ]]; then
    echo "当前没有已配置实例。"
    return 1
  fi

  echo
  echo "可管理实例："
  local 序号=1
  local 文件
  for 文件 in "${环境文件列表[@]}"; do
    载入环境文件 "${文件}"
    local 状态
    状态="$(实例状态 "${STACK_NAME}")"
    printf '%s) %s [%s] -> %s\n' "${序号}" "${INSTANCE_NAME}" "${状态}" "${DOMAIN}"
    序号=$((序号 + 1))
  done
  echo "0) 返回"

  local 选择
  while true; do
    read -r -p "请选择实例: " 选择
    选择="$(去空格 "${选择}")"
    if [[ "${选择}" == "0" ]]; then
      return 1
    fi

    if [[ "${选择}" =~ ^[0-9]+$ ]] && (( 选择 >= 1 && 选择 <= ${#环境文件列表[@]} )); then
      SELECTED_ENV_FILE="${环境文件列表[$((选择 - 1))]}"
      载入环境文件 "${SELECTED_ENV_FILE}"
      写入实例辅助文件 "${INSTANCE_NAME}" "${SELECTED_ENV_FILE}"
      return 0
    fi

    echo "输入无效，请重新选择。"
  done
}

从当前代码重建实例() {
  local 环境文件="$1"
  local 项目名="$2"
  实例编排 "${环境文件}" "${项目名}" up -d --build --remove-orphans
  启动或更新网关
  echo "实例 ${INSTANCE_NAME} 已基于当前代码重建完成。"
}

拉取最新代码() {
  if ! git -C "${仓库根目录}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "当前目录不是 Git 仓库，无法执行 git pull。"
    return 1
  fi

  git -C "${仓库根目录}" pull --ff-only
}

管理已有实例() {
  if ! 选择已有实例; then
    return
  fi

  while true; do
    echo
    echo "当前实例：${INSTANCE_NAME} (${STACK_NAME})"
    echo "1) 查看配置摘要"
    echo "2) 修改配置并更新实例"
    echo "3) 直接重建/重启实例"
    echo "4) 拉取最新代码并更新实例"
    echo "5) 停止实例"
    echo "6) 启动实例"
    echo "7) 删除实例容器（保留数据库）"
    echo "8) 删除实例容器和数据库（危险）"
    echo "9) 重新生成域名网关配置"
    echo "0) 返回主菜单"

    local 操作
    read -r -p "请选择操作: " 操作
    操作="$(去空格 "${操作}")"

    case "${操作}" in
      1)
        打印实例摘要
        ;;
      2)
        采集实例配置 "编辑"
        打印实例摘要
        if 确认是非 "确认保存配置并更新该实例？" "y"; then
          写入实例环境 "${SELECTED_ENV_FILE}"
          写入实例辅助文件 "${INSTANCE_NAME}" "${SELECTED_ENV_FILE}"
          从当前代码重建实例 "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      3)
        从当前代码重建实例 "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        ;;
      4)
        if 确认是非 "确认先 git pull 再更新该实例？" "y"; then
          拉取最新代码
          从当前代码重建实例 "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      5)
        实例编排 "${SELECTED_ENV_FILE}" "${STACK_NAME}" stop
        echo "实例已停止。"
        ;;
      6)
        实例编排 "${SELECTED_ENV_FILE}" "${STACK_NAME}" up -d
        启动或更新网关
        echo "实例已启动。"
        ;;
      7)
        if 确认是非 "确认删除实例容器但保留数据库卷？" "n"; then
          实例编排 "${SELECTED_ENV_FILE}" "${STACK_NAME}" down --remove-orphans
          启动或更新网关
          echo "实例容器已删除，数据库卷仍然保留。"
        fi
        ;;
      8)
        if 确认是非 "确认删除实例容器和数据库卷？此操作不可恢复。" "n"; then
          实例编排 "${SELECTED_ENV_FILE}" "${STACK_NAME}" down -v --remove-orphans
          if 确认是非 "是否同时删除该实例配置文件和实例目录？" "n"; then
            rm -f "${SELECTED_ENV_FILE}"
            rm -rf "$(实例工作目录 "${INSTANCE_NAME}")"
            echo "实例配置文件和实例目录已删除。"
          fi
          启动或更新网关
          echo "实例及数据库卷已删除。"
          return
        fi
        ;;
      9)
        启动或更新网关
        echo "域名网关配置已重新生成并重载。"
        ;;
      0)
        return
        ;;
      *)
        echo "输入无效，请重新选择。"
        ;;
    esac
  done
}

主菜单() {
  while true; do
    echo
    echo "=============================="
    echo " EIGP VPS 容器管理脚本"
    echo "=============================="
    echo "1) 管理已有实例"
    echo "2) 新建实例并启动"
    echo "0) 退出"

    local 选择
    read -r -p "请选择操作: " 选择
    选择="$(去空格 "${选择}")"

    case "${选择}" in
      1) 管理已有实例 ;;
      2) 新建实例 ;;
      0) exit 0 ;;
      *) echo "输入无效，请重新选择。" ;;
    esac
  done
}

主菜单
