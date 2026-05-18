#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTANCES_DIR="${SCRIPT_DIR}/instances"
INSTANCE_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.vps.yml"
GATEWAY_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.gateway.yml"
GATEWAY_DIR="${SCRIPT_DIR}/gateway"
GATEWAY_CADDYFILE="${GATEWAY_DIR}/Caddyfile"
PUBLIC_NETWORK_NAME="eigp-public"
HTTP_PROXY_PORT="5649"
HTTPS_PROXY_PORT="9823"

mkdir -p "${INSTANCES_DIR}" "${GATEWAY_DIR}"
touch "${INSTANCES_DIR}/.gitkeep" "${GATEWAY_DIR}/.gitkeep"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "缺少命令：${cmd}"
    exit 1
  fi
}

require_cmd docker
docker compose version >/dev/null

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "${value}"
}

prompt_required() {
  local prompt="$1"
  local default_value="${2:-}"
  local answer

  if [[ -n "${default_value}" ]]; then
    read -r -p "${prompt} [${default_value}]: " answer
    answer="$(trim "${answer}")"
    printf '%s' "${answer:-${default_value}}"
    return
  fi

  while true; do
    read -r -p "${prompt}: " answer
    answer="$(trim "${answer}")"
    if [[ -n "${answer}" ]]; then
      printf '%s' "${answer}"
      return
    fi
    echo "该项不能为空。"
  done
}

prompt_optional() {
  local prompt="$1"
  local default_value="${2:-}"
  local answer

  if [[ -n "${default_value}" ]]; then
    read -r -p "${prompt} [${default_value}]: " answer
    answer="$(trim "${answer}")"
    printf '%s' "${answer:-${default_value}}"
    return
  fi

  read -r -p "${prompt}: " answer
  answer="$(trim "${answer}")"
  printf '%s' "${answer}"
}

prompt_yes_no() {
  local prompt="$1"
  local default_value="${2:-y}"
  local suffix="[Y/n]"
  local answer

  if [[ "${default_value}" == "n" ]]; then
    suffix="[y/N]"
  fi

  while true; do
    read -r -p "${prompt} ${suffix}: " answer
    answer="$(trim "${answer}")"
    answer="${answer,,}"
    if [[ -z "${answer}" ]]; then
      answer="${default_value}"
    fi

    case "${answer}" in
      y|yes) return 0 ;;
      n|no) return 1 ;;
      *) echo "请输入 y 或 n。" ;;
    esac
  done
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi

  tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64
}

sanitize_instance_name() {
  local raw="$1"
  raw="${raw,,}"
  raw="$(printf '%s' "${raw}" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
  printf '%s' "${raw}"
}

instance_env_file() {
  local instance_name="$1"
  printf '%s/%s.env' "${INSTANCES_DIR}" "${instance_name}"
}

instance_dir() {
  local instance_name="$1"
  printf '%s/%s' "${INSTANCES_DIR}" "${instance_name}"
}

load_env_file() {
  local file="$1"
  set -a
  # shellcheck disable=SC1090
  source "${file}"
  set +a
}

build_frontend_url() {
  local domain="$1"
  local enable_https="$2"

  if [[ "${enable_https}" == "true" ]]; then
    printf 'https://%s:%s' "${domain}" "${HTTPS_PROXY_PORT}"
  else
    printf 'http://%s:%s' "${domain}" "${HTTP_PROXY_PORT}"
  fi
}

write_instance_env() {
  local file="$1"

  cat >"${file}" <<EOF
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

write_helper_scripts() {
  local instance_name="$1"
  local env_file="$2"
  local dir
  dir="$(instance_dir "${instance_name}")"

  mkdir -p "${dir}"
  cp "${env_file}" "${dir}/.env"

  cat >"${dir}/up.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
INSTANCE_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
GATEWAY_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.gateway.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${INSTANCE_COMPOSE_FILE}" up -d --build --remove-orphans
docker compose -f "${GATEWAY_COMPOSE_FILE}" up -d --remove-orphans
EOF

  cat >"${dir}/update.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
INSTANCE_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
GATEWAY_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.gateway.yml"

git -C "${REPO_ROOT}" pull --ff-only

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${INSTANCE_COMPOSE_FILE}" up -d --build --remove-orphans
docker compose -f "${GATEWAY_COMPOSE_FILE}" up -d --remove-orphans
EOF

  cat >"${dir}/start.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
INSTANCE_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"
GATEWAY_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.gateway.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${INSTANCE_COMPOSE_FILE}" up -d
docker compose -f "${GATEWAY_COMPOSE_FILE}" up -d --remove-orphans
EOF

  cat >"${dir}/stop.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
INSTANCE_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${INSTANCE_COMPOSE_FILE}" stop
EOF

  cat >"${dir}/remove-keep-db.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
INSTANCE_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${INSTANCE_COMPOSE_FILE}" down --remove-orphans
EOF

  cat >"${dir}/logs.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
INSTANCE_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${INSTANCE_COMPOSE_FILE}" logs -f
EOF

  cat >"${dir}/README.txt" <<EOF
实例名称：${INSTANCE_NAME}
Compose 项目名：${STACK_NAME}
域名：${DOMAIN}
前端地址：${FRONTEND_URL}
数据库卷：${STACK_NAME}_postgres_data

已自动生成文件：
- ${dir}/.env
- ${dir}/up.sh
- ${dir}/update.sh
- ${dir}/start.sh
- ${dir}/stop.sh
- ${dir}/remove-keep-db.sh
- ${dir}/logs.sh

访问前必须确认：
1. 域名 A 记录已经手动指向 VPS 公网 IP。
2. VPS 的 ${HTTP_PROXY_PORT}/${HTTPS_PROXY_PORT} 端口已经放行。
3. 如果启用 HTTPS，域名必须先解析到当前服务器，Caddy 才能自动签发证书。
4. 如果 VPS 的 80/443 已被别的服务占用，自动 HTTPS 证书通常签不下来；这时优先访问 http://域名:${HTTP_PROXY_PORT}。
5. 数据库不会因为容器停止、重建、docker compose down 而丢失。
6. 只有手动 down -v 或删除 volume 才会真的删库。
EOF

  chmod +x \
    "${dir}/up.sh" \
    "${dir}/update.sh" \
    "${dir}/start.sh" \
    "${dir}/stop.sh" \
    "${dir}/remove-keep-db.sh" \
    "${dir}/logs.sh"
}

ensure_public_network() {
  if ! docker network inspect "${PUBLIC_NETWORK_NAME}" >/dev/null 2>&1; then
    docker network create "${PUBLIC_NETWORK_NAME}" >/dev/null
  fi
}

instance_status() {
  local project_name="$1"
  local running
  local all

  running="$(docker ps --filter "label=com.docker.compose.project=${project_name}" -q | wc -l | tr -d ' ')"
  if [[ "${running}" != "0" ]]; then
    printf '运行中'
    return
  fi

  all="$(docker ps -a --filter "label=com.docker.compose.project=${project_name}" -q | wc -l | tr -d ' ')"
  if [[ "${all}" != "0" ]]; then
    printf '已停止'
    return
  fi

  printf '仅配置未启动'
}

compose_instance() {
  local env_file="$1"
  local project_name="$2"
  shift 2
  docker compose --env-file "${env_file}" --project-name "${project_name}" -f "${INSTANCE_COMPOSE_FILE}" "$@"
}

render_gateway_config() {
  mapfile -t env_files < <(find "${INSTANCES_DIR}" -maxdepth 1 -type f -name '*.env' | sort)

  cat >"${GATEWAY_CADDYFILE}" <<'EOF'
EOF

  local file
  for file in "${env_files[@]}"; do
    load_env_file "${file}"

    if [[ "${ENABLE_HTTPS}" == "true" ]]; then
      cat >>"${GATEWAY_CADDYFILE}" <<EOF
${DOMAIN} {
  reverse_proxy ${STACK_NAME}-web:80
}

EOF
    else
      cat >>"${GATEWAY_CADDYFILE}" <<EOF
http://${DOMAIN} {
  reverse_proxy ${STACK_NAME}-web:80
}

EOF
    fi
  done
}

reload_gateway() {
  ensure_public_network
  render_gateway_config
  docker compose -f "${GATEWAY_COMPOSE_FILE}" up -d --remove-orphans
}

print_instance_summary() {
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

部署提醒：
- 脚本会自动创建实例 .env、实例辅助脚本和 Caddy 域名网关配置。
- 你必须手动把域名 A 记录指向 VPS 公网 IP。
- 你必须放行 VPS 的 ${HTTP_PROXY_PORT}/${HTTPS_PROXY_PORT} 端口。
- 只要域名解析和 ${HTTP_PROXY_PORT}/${HTTPS_PROXY_PORT} 正常，使用域名加端口即可直接访问前端。
- 如果 80/443 已被别的服务占用，Caddy 的自动 HTTPS 证书大概率无法签发；这时优先使用 http://域名:${HTTP_PROXY_PORT}，或让上游代理处理 HTTPS。
- 数据库不会随着容器停止、重建、docker compose down 而消失。
EOF
}

collect_instance_config() {
  local mode="$1"

  if [[ "${mode}" == "new" ]]; then
    local raw_name
    raw_name="$(prompt_required "请输入实例名称（例如 prod、demo、client-a）")"
    INSTANCE_NAME="$(sanitize_instance_name "${raw_name}")"
    if [[ -z "${INSTANCE_NAME}" ]]; then
      echo "实例名称无效。"
      exit 1
    fi

    STACK_NAME="eigp-${INSTANCE_NAME}"
    DOMAIN="$(prompt_required "请输入要绑定的域名")"
    if prompt_yes_no "是否启用 HTTPS 自动证书" "y"; then
      ENABLE_HTTPS="true"
    else
      ENABLE_HTTPS="false"
    fi
    FRONTEND_URL="$(build_frontend_url "${DOMAIN}" "${ENABLE_HTTPS}")"
    POSTGRES_DB="$(prompt_required "请输入 PostgreSQL 数据库名" "eigp")"
    POSTGRES_USER="$(prompt_required "请输入 PostgreSQL 用户名" "postgres")"

    local db_password_input
    db_password_input="$(prompt_optional "请输入 PostgreSQL 密码（留空自动生成）")"
    POSTGRES_PASSWORD="${db_password_input:-$(random_secret)}"

    local jwt_input
    jwt_input="$(prompt_optional "请输入 JWT_SECRET（留空自动生成）")"
    JWT_SECRET="${jwt_input:-$(random_secret)}"

    local enc_input
    enc_input="$(prompt_optional "请输入 APP_ENCRYPTION_KEY（留空自动生成）")"
    APP_ENCRYPTION_KEY="${enc_input:-$(random_secret)}"

    RESEND_API_KEY="$(prompt_optional "请输入 RESEND_API_KEY（选填）")"
    RESEND_FROM_EMAIL="$(prompt_required "请输入发件邮箱标识" "EIGP <onboarding@resend.dev>")"
    MAIL_DEBUG="$(prompt_required "是否启用 MAIL_DEBUG（true/false）" "false")"
    VERIFICATION_CODE_EXPIRES_MINUTES="$(prompt_required "验证码有效期（分钟）" "10")"
    return
  fi

  DOMAIN="$(prompt_required "域名" "${DOMAIN}")"
  if prompt_yes_no "是否启用 HTTPS 自动证书" "$( [[ "${ENABLE_HTTPS}" == "true" ]] && printf 'y' || printf 'n' )"; then
    ENABLE_HTTPS="true"
  else
    ENABLE_HTTPS="false"
  fi
  FRONTEND_URL="$(build_frontend_url "${DOMAIN}" "${ENABLE_HTTPS}")"
  RESEND_API_KEY="$(prompt_optional "RESEND_API_KEY（选填）" "${RESEND_API_KEY}")"
  RESEND_FROM_EMAIL="$(prompt_required "发件邮箱标识" "${RESEND_FROM_EMAIL}")"
  MAIL_DEBUG="$(prompt_required "MAIL_DEBUG（true/false）" "${MAIL_DEBUG}")"
  VERIFICATION_CODE_EXPIRES_MINUTES="$(prompt_required "验证码有效期（分钟）" "${VERIFICATION_CODE_EXPIRES_MINUTES}")"
}

create_new_instance() {
  collect_instance_config "new"
  local env_file
  env_file="$(instance_env_file "${INSTANCE_NAME}")"

  if [[ -f "${env_file}" ]]; then
    echo "实例 ${INSTANCE_NAME} 已存在。"
    return
  fi

  print_instance_summary
  if ! prompt_yes_no "确认创建并启动该实例？" "y"; then
    echo "已取消。"
    return
  fi

  write_instance_env "${env_file}"
  write_helper_scripts "${INSTANCE_NAME}" "${env_file}"
  ensure_public_network
  compose_instance "${env_file}" "${STACK_NAME}" up -d --build --remove-orphans
  reload_gateway
  echo "实例 ${INSTANCE_NAME} 已创建并启动。"
  echo "已自动创建目录：$(instance_dir "${INSTANCE_NAME}")"
}

pick_existing_instance() {
  mapfile -t env_files < <(find "${INSTANCES_DIR}" -maxdepth 1 -type f -name '*.env' | sort)
  if [[ ${#env_files[@]} -eq 0 ]]; then
    echo "当前没有已配置实例。"
    return 1
  fi

  echo
  echo "可管理实例："
  local index=1
  local file
  for file in "${env_files[@]}"; do
    load_env_file "${file}"
    printf '%s) %s [%s] -> %s\n' "${index}" "${INSTANCE_NAME}" "$(instance_status "${STACK_NAME}")" "${DOMAIN}"
    index=$((index + 1))
  done
  echo "0) 返回"

  local choice
  while true; do
    read -r -p "请选择实例: " choice
    choice="$(trim "${choice}")"
    if [[ "${choice}" == "0" ]]; then
      return 1
    fi

    if [[ "${choice}" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#env_files[@]} )); then
      SELECTED_ENV_FILE="${env_files[$((choice - 1))]}"
      load_env_file "${SELECTED_ENV_FILE}"
      write_helper_scripts "${INSTANCE_NAME}" "${SELECTED_ENV_FILE}"
      return 0
    fi

    echo "输入无效，请重新选择。"
  done
}

rebuild_instance() {
  local env_file="$1"
  local project_name="$2"
  compose_instance "${env_file}" "${project_name}" up -d --build --remove-orphans
  reload_gateway
  echo "实例 ${INSTANCE_NAME} 已完成重建。"
}

pull_latest_code() {
  if ! git -C "${REPO_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "当前目录不是 Git 仓库，无法执行 git pull。"
    return 1
  fi

  git -C "${REPO_ROOT}" pull --ff-only
}

manage_existing_instance() {
  if ! pick_existing_instance; then
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

    local action
    read -r -p "请选择操作: " action
    action="$(trim "${action}")"

    case "${action}" in
      1)
        print_instance_summary
        ;;
      2)
        collect_instance_config "edit"
        print_instance_summary
        if prompt_yes_no "确认保存配置并更新该实例？" "y"; then
          write_instance_env "${SELECTED_ENV_FILE}"
          write_helper_scripts "${INSTANCE_NAME}" "${SELECTED_ENV_FILE}"
          rebuild_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      3)
        rebuild_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        ;;
      4)
        if prompt_yes_no "确认先 git pull 再更新该实例？" "y"; then
          pull_latest_code
          rebuild_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      5)
        compose_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" stop
        echo "实例已停止。"
        ;;
      6)
        compose_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" up -d
        reload_gateway
        echo "实例已启动。"
        ;;
      7)
        if prompt_yes_no "确认删除实例容器但保留数据库卷？" "n"; then
          compose_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" down --remove-orphans
          reload_gateway
          echo "实例容器已删除，数据库卷仍然保留。"
        fi
        ;;
      8)
        if prompt_yes_no "确认删除实例容器和数据库卷？此操作不可恢复。" "n"; then
          compose_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" down -v --remove-orphans
          if prompt_yes_no "是否同时删除该实例配置文件和实例目录？" "n"; then
            rm -f "${SELECTED_ENV_FILE}"
            rm -rf "$(instance_dir "${INSTANCE_NAME}")"
            echo "实例配置文件和实例目录已删除。"
          fi
          reload_gateway
          echo "实例及数据库卷已删除。"
          return
        fi
        ;;
      9)
        reload_gateway
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

main_menu() {
  while true; do
    echo
    echo "=============================="
    echo " EIGP VPS 容器管理脚本"
    echo "=============================="
    echo "1) 管理已有实例"
    echo "2) 新建实例并启动"
    echo "0) 退出"

    local choice
    read -r -p "请选择操作: " choice
    choice="$(trim "${choice}")"

    case "${choice}" in
      1) manage_existing_instance ;;
      2) create_new_instance ;;
      0) exit 0 ;;
      *) echo "输入无效，请重新选择。" ;;
    esac
  done
}

main_menu
