#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTANCES_DIR="${SCRIPT_DIR}/instances"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.vps.yml"

mkdir -p "${INSTANCES_DIR}"
touch "${INSTANCES_DIR}/.gitkeep"

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "缺少命令: ${cmd}"
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

prompt_default() {
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

load_env_file() {
  local file="$1"
  set -a
  # shellcheck disable=SC1090
  source "${file}"
  set +a
}

build_frontend_url() {
  local scheme="$1"
  local host="$2"
  local port="$3"

  if [[ ("${scheme}" == "http" && "${port}" == "80") || ("${scheme}" == "https" && "${port}" == "443") ]]; then
    printf '%s://%s' "${scheme}" "${host}"
    return
  fi

  printf '%s://%s:%s' "${scheme}" "${host}" "${port}"
}

write_instance_env() {
  local file="$1"

  cat >"${file}" <<EOF
INSTANCE_NAME="${INSTANCE_NAME}"
STACK_NAME="${STACK_NAME}"
PUBLIC_HOST="${PUBLIC_HOST}"
PUBLIC_SCHEME="${PUBLIC_SCHEME}"
WEB_BIND_ADDRESS="${WEB_BIND_ADDRESS}"
WEB_PORT="${WEB_PORT}"
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

instance_status() {
  local stack_name="$1"
  local running
  local all

  running="$(docker ps --filter "label=com.docker.compose.project=${stack_name}" -q | wc -l | tr -d ' ')"
  if [[ "${running}" != "0" ]]; then
    printf 'running'
    return
  fi

  all="$(docker ps -a --filter "label=com.docker.compose.project=${stack_name}" -q | wc -l | tr -d ' ')"
  if [[ "${all}" != "0" ]]; then
    printf 'stopped'
    return
  fi

  printf 'configured'
}

compose_for_instance() {
  local env_file="$1"
  local stack_name="$2"
  shift 2
  docker compose --env-file "${env_file}" --project-name "${stack_name}" -f "${COMPOSE_FILE}" "$@"
}

print_instance_summary() {
  cat <<EOF

实例名称: ${INSTANCE_NAME}
Compose 项目名: ${STACK_NAME}
访问域名/IP: ${PUBLIC_HOST}
协议: ${PUBLIC_SCHEME}
VPS 访问端口: ${WEB_PORT}
前端回调地址: ${FRONTEND_URL}
数据库名: ${POSTGRES_DB}
数据库用户: ${POSTGRES_USER}
Resend Key: $( [[ -n "${RESEND_API_KEY}" ]] && printf '已填写' || printf '未填写' )
MAIL_DEBUG: ${MAIL_DEBUG}

提醒:
- JWT_SECRET、APP_ENCRYPTION_KEY、POSTGRES_PASSWORD 建议使用强随机值。
- 数据库卷不会因为容器停止、重建、docker compose down 而丢失。
- 只有手动执行 docker compose down -v 或 docker volume rm 才会删库。
- 每次拉取最新代码后，重新执行“更新实例”即可重建容器并自动执行 Prisma migrate deploy。
EOF
}

collect_instance_config() {
  local mode="$1"

  if [[ "${mode}" == "new" ]]; then
    local raw_name
    raw_name="$(prompt_default "请输入实例名称（如 prod、demo、client-a）")"
    INSTANCE_NAME="$(sanitize_instance_name "${raw_name}")"
    if [[ -z "${INSTANCE_NAME}" ]]; then
      echo "实例名称无效。"
      exit 1
    fi
    STACK_NAME="eigp-${INSTANCE_NAME}"
    PUBLIC_HOST="$(prompt_default "请输入访问域名或公网 IP")"
    PUBLIC_SCHEME="$(prompt_default "请输入访问协议（http 或 https）" "http")"
    WEB_BIND_ADDRESS="$(prompt_default "请输入绑定地址" "0.0.0.0")"
    WEB_PORT="$(prompt_default "请输入 VPS 对外访问端口" "80")"
    POSTGRES_DB="$(prompt_default "请输入 PostgreSQL 数据库名" "eigp")"
    POSTGRES_USER="$(prompt_default "请输入 PostgreSQL 用户名" "postgres")"
    local db_password_input
    db_password_input="$(prompt_optional "请输入 PostgreSQL 密码（留空将自动生成）")"
    POSTGRES_PASSWORD="${db_password_input:-$(random_secret)}"
    local jwt_input
    jwt_input="$(prompt_optional "请输入 JWT_SECRET（留空将自动生成）")"
    JWT_SECRET="${jwt_input:-$(random_secret)}"
    local enc_input
    enc_input="$(prompt_optional "请输入 APP_ENCRYPTION_KEY（留空将自动生成）")"
    APP_ENCRYPTION_KEY="${enc_input:-$(random_secret)}"
    RESEND_API_KEY="$(prompt_optional "请输入 RESEND_API_KEY（选填，可留空）")"
    RESEND_FROM_EMAIL="$(prompt_default "请输入发件邮箱标识" "EIGP <onboarding@resend.dev>")"
    MAIL_DEBUG="$(prompt_default "是否启用 MAIL_DEBUG（true/false）" "false")"
    VERIFICATION_CODE_EXPIRES_MINUTES="$(prompt_default "验证码有效期（分钟）" "10")"
    FRONTEND_URL="$(build_frontend_url "${PUBLIC_SCHEME}" "${PUBLIC_HOST}" "${WEB_PORT}")"
    return
  fi

  PUBLIC_HOST="$(prompt_default "访问域名或公网 IP" "${PUBLIC_HOST}")"
  PUBLIC_SCHEME="$(prompt_default "访问协议（http 或 https）" "${PUBLIC_SCHEME}")"
  WEB_BIND_ADDRESS="$(prompt_default "绑定地址" "${WEB_BIND_ADDRESS}")"
  WEB_PORT="$(prompt_default "VPS 对外访问端口" "${WEB_PORT}")"
  RESEND_API_KEY="$(prompt_optional "RESEND_API_KEY（选填）" "${RESEND_API_KEY}")"
  RESEND_FROM_EMAIL="$(prompt_default "发件邮箱标识" "${RESEND_FROM_EMAIL}")"
  MAIL_DEBUG="$(prompt_default "MAIL_DEBUG（true/false）" "${MAIL_DEBUG}")"
  VERIFICATION_CODE_EXPIRES_MINUTES="$(prompt_default "验证码有效期（分钟）" "${VERIFICATION_CODE_EXPIRES_MINUTES}")"
  FRONTEND_URL="$(build_frontend_url "${PUBLIC_SCHEME}" "${PUBLIC_HOST}" "${WEB_PORT}")"
}

create_new_instance() {
  collect_instance_config "new"
  local env_file
  env_file="$(instance_env_file "${INSTANCE_NAME}")"

  if [[ -f "${env_file}" ]]; then
    echo "实例 ${INSTANCE_NAME} 已存在，请换一个名称。"
    return
  fi

  print_instance_summary
  if ! prompt_yes_no "确认创建并启动该实例？" "y"; then
    echo "已取消。"
    return
  fi

  write_instance_env "${env_file}"
  compose_for_instance "${env_file}" "${STACK_NAME}" up -d --build --remove-orphans
  echo "实例 ${INSTANCE_NAME} 已创建并启动。"
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
    local status
    status="$(instance_status "${STACK_NAME}")"
    printf '%s) %s [%s] -> %s (%s)\n' "${index}" "${INSTANCE_NAME}" "${status}" "${PUBLIC_HOST}" "${WEB_PORT}"
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
      return 0
    fi

    echo "输入无效，请重新选择。"
  done
}

update_instance_from_current_code() {
  local env_file="$1"
  local stack_name="$2"
  compose_for_instance "${env_file}" "${stack_name}" up -d --build --remove-orphans
  echo "实例 ${INSTANCE_NAME} 已基于当前代码重建完成。"
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
    echo "当前实例: ${INSTANCE_NAME} (${STACK_NAME})"
    echo "1) 查看配置摘要"
    echo "2) 修改配置并重建"
    echo "3) 使用当前配置重建/重启"
    echo "4) 拉取最新代码并重建"
    echo "5) 停止实例"
    echo "6) 启动实例"
    echo "7) 删除实例容器（保留数据库）"
    echo "8) 删除实例容器和数据库（危险）"
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
        if prompt_yes_no "确认保存配置并重建实例？" "y"; then
          write_instance_env "${SELECTED_ENV_FILE}"
          update_instance_from_current_code "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      3)
        update_instance_from_current_code "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        ;;
      4)
        if prompt_yes_no "确认先 git pull 再重建实例？" "y"; then
          pull_latest_code
          update_instance_from_current_code "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      5)
        compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" stop
        echo "实例已停止。"
        ;;
      6)
        compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" up -d
        echo "实例已启动。"
        ;;
      7)
        if prompt_yes_no "确认删除实例容器但保留数据库卷？" "n"; then
          compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" down --remove-orphans
          echo "实例容器已删除，数据库卷仍然保留。"
        fi
        ;;
      8)
        if prompt_yes_no "确认删除实例容器和数据库卷？此操作不可恢复。" "n"; then
          compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" down -v --remove-orphans
          if prompt_yes_no "是否同时删除该实例配置文件？" "n"; then
            rm -f "${SELECTED_ENV_FILE}"
            echo "实例配置文件已删除。"
          fi
          echo "实例及数据库卷已删除。"
          return
        fi
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
