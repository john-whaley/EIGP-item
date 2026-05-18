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
    echo "Missing command: ${cmd}"
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
    echo "This field is required."
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
      *) echo "Please enter y or n." ;;
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

write_instance_support_files() {
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
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${COMPOSE_FILE}" up -d --build --remove-orphans
EOF

  cat >"${dir}/update.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

git -C "${REPO_ROOT}" pull --ff-only

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${COMPOSE_FILE}" up -d --build --remove-orphans
EOF

  cat >"${dir}/start.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${COMPOSE_FILE}" up -d
EOF

  cat >"${dir}/stop.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${COMPOSE_FILE}" stop
EOF

  cat >"${dir}/remove-keep-db.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${COMPOSE_FILE}" down --remove-orphans
EOF

  cat >"${dir}/logs.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

set -a
source "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" --project-name "${STACK_NAME}" -f "${COMPOSE_FILE}" logs -f
EOF

  cat >"${dir}/README.txt" <<EOF
Instance name: ${INSTANCE_NAME}
Compose project: ${STACK_NAME}
Access URL: ${FRONTEND_URL}
VPS bind address: ${WEB_BIND_ADDRESS}
VPS port: ${WEB_PORT}
Database volume: ${STACK_NAME}_postgres_data

Files created automatically:
- ${dir}/.env
- ${dir}/up.sh
- ${dir}/update.sh
- ${dir}/start.sh
- ${dir}/stop.sh
- ${dir}/remove-keep-db.sh
- ${dir}/logs.sh

Important notes:
1. You must point your domain A record to the VPS IP yourself.
2. If WEB_PORT is not 80 or 443, you must access the site with :PORT.
3. VPS firewall and cloud security group must allow WEB_PORT.
4. Database data survives stop, restart, rebuild, and docker compose down.
5. Database is deleted only if you remove the volume or run down -v.
EOF

  chmod +x \
    "${dir}/up.sh" \
    "${dir}/update.sh" \
    "${dir}/start.sh" \
    "${dir}/stop.sh" \
    "${dir}/remove-keep-db.sh" \
    "${dir}/logs.sh"
}

sync_instance_artifacts() {
  local instance_name="$1"
  local env_file="$2"
  write_instance_support_files "${instance_name}" "${env_file}"
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

Instance name: ${INSTANCE_NAME}
Compose project: ${STACK_NAME}
Domain or IP: ${PUBLIC_HOST}
Scheme: ${PUBLIC_SCHEME}
VPS public port: ${WEB_PORT}
Frontend URL: ${FRONTEND_URL}
Database name: ${POSTGRES_DB}
Database user: ${POSTGRES_USER}
Database volume: ${STACK_NAME}_postgres_data
Resend Key: $( [[ -n "${RESEND_API_KEY}" ]] && printf 'configured' || printf 'empty' )
MAIL_DEBUG: ${MAIL_DEBUG}

Reminders:
- JWT_SECRET, APP_ENCRYPTION_KEY, and POSTGRES_PASSWORD should be strong random values.
- DNS A record is not created by this script; point your domain to the VPS IP manually.
- If WEB_PORT is not 80/443, the browser must access the site with the port.
- VPS firewall and cloud security group must allow WEB_PORT.
- Database data survives stop, rebuild, and docker compose down.
- Only down -v or manual volume removal will delete the database.
- After pulling new code, rebuild the instance so prisma migrate deploy runs.
EOF
}

collect_instance_config() {
  local mode="$1"

  if [[ "${mode}" == "new" ]]; then
    local raw_name
    raw_name="$(prompt_default "Enter instance name (for example prod, demo, client-a)")"
    INSTANCE_NAME="$(sanitize_instance_name "${raw_name}")"
    if [[ -z "${INSTANCE_NAME}" ]]; then
      echo "Invalid instance name."
      exit 1
    fi

    STACK_NAME="eigp-${INSTANCE_NAME}"
    PUBLIC_HOST="$(prompt_default "Enter domain or public IP")"
    PUBLIC_SCHEME="$(prompt_default "Enter access scheme (http or https)" "http")"
    WEB_BIND_ADDRESS="$(prompt_default "Enter bind address" "0.0.0.0")"
    WEB_PORT="$(prompt_default "Enter VPS public access port" "80")"
    POSTGRES_DB="$(prompt_default "Enter PostgreSQL database name" "eigp")"
    POSTGRES_USER="$(prompt_default "Enter PostgreSQL username" "postgres")"

    local db_password_input
    db_password_input="$(prompt_optional "Enter PostgreSQL password (leave blank to auto-generate)")"
    POSTGRES_PASSWORD="${db_password_input:-$(random_secret)}"

    local jwt_input
    jwt_input="$(prompt_optional "Enter JWT_SECRET (leave blank to auto-generate)")"
    JWT_SECRET="${jwt_input:-$(random_secret)}"

    local enc_input
    enc_input="$(prompt_optional "Enter APP_ENCRYPTION_KEY (leave blank to auto-generate)")"
    APP_ENCRYPTION_KEY="${enc_input:-$(random_secret)}"

    RESEND_API_KEY="$(prompt_optional "Enter RESEND_API_KEY (optional)")"
    RESEND_FROM_EMAIL="$(prompt_default "Enter sender label" "EIGP <onboarding@resend.dev>")"
    MAIL_DEBUG="$(prompt_default "Enable MAIL_DEBUG (true/false)" "false")"
    VERIFICATION_CODE_EXPIRES_MINUTES="$(prompt_default "Verification code expiry minutes" "10")"
    FRONTEND_URL="$(build_frontend_url "${PUBLIC_SCHEME}" "${PUBLIC_HOST}" "${WEB_PORT}")"
    return
  fi

  PUBLIC_HOST="$(prompt_default "Domain or public IP" "${PUBLIC_HOST}")"
  PUBLIC_SCHEME="$(prompt_default "Access scheme (http or https)" "${PUBLIC_SCHEME}")"
  WEB_BIND_ADDRESS="$(prompt_default "Bind address" "${WEB_BIND_ADDRESS}")"
  WEB_PORT="$(prompt_default "VPS public access port" "${WEB_PORT}")"
  RESEND_API_KEY="$(prompt_optional "RESEND_API_KEY (optional)" "${RESEND_API_KEY}")"
  RESEND_FROM_EMAIL="$(prompt_default "Sender label" "${RESEND_FROM_EMAIL}")"
  MAIL_DEBUG="$(prompt_default "MAIL_DEBUG (true/false)" "${MAIL_DEBUG}")"
  VERIFICATION_CODE_EXPIRES_MINUTES="$(prompt_default "Verification code expiry minutes" "${VERIFICATION_CODE_EXPIRES_MINUTES}")"
  FRONTEND_URL="$(build_frontend_url "${PUBLIC_SCHEME}" "${PUBLIC_HOST}" "${WEB_PORT}")"
}

create_new_instance() {
  collect_instance_config "new"
  local env_file
  env_file="$(instance_env_file "${INSTANCE_NAME}")"

  if [[ -f "${env_file}" ]]; then
    echo "Instance ${INSTANCE_NAME} already exists."
    return
  fi

  print_instance_summary
  if ! prompt_yes_no "Create and start this instance now?" "y"; then
    echo "Cancelled."
    return
  fi

  write_instance_env "${env_file}"
  sync_instance_artifacts "${INSTANCE_NAME}" "${env_file}"
  compose_for_instance "${env_file}" "${STACK_NAME}" up -d --build --remove-orphans
  echo "Instance ${INSTANCE_NAME} created and started."
  echo "Generated files: $(instance_dir "${INSTANCE_NAME}")"
}

pick_existing_instance() {
  mapfile -t env_files < <(find "${INSTANCES_DIR}" -maxdepth 1 -type f -name '*.env' | sort)
  if [[ ${#env_files[@]} -eq 0 ]]; then
    echo "No configured instances found."
    return 1
  fi

  echo
  echo "Available instances:"
  local index=1
  local file
  for file in "${env_files[@]}"; do
    load_env_file "${file}"
    local status
    status="$(instance_status "${STACK_NAME}")"
    printf '%s) %s [%s] -> %s (%s)\n' "${index}" "${INSTANCE_NAME}" "${status}" "${PUBLIC_HOST}" "${WEB_PORT}"
    index=$((index + 1))
  done
  echo "0) Back"

  local choice
  while true; do
    read -r -p "Choose an instance: " choice
    choice="$(trim "${choice}")"
    if [[ "${choice}" == "0" ]]; then
      return 1
    fi

    if [[ "${choice}" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#env_files[@]} )); then
      SELECTED_ENV_FILE="${env_files[$((choice - 1))]}"
      load_env_file "${SELECTED_ENV_FILE}"
      sync_instance_artifacts "${INSTANCE_NAME}" "${SELECTED_ENV_FILE}"
      return 0
    fi

    echo "Invalid choice, try again."
  done
}

update_instance_from_current_code() {
  local env_file="$1"
  local stack_name="$2"
  compose_for_instance "${env_file}" "${stack_name}" up -d --build --remove-orphans
  echo "Instance ${INSTANCE_NAME} rebuilt from current code."
}

pull_latest_code() {
  if ! git -C "${REPO_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Current directory is not a Git repository; cannot run git pull."
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
    echo "Current instance: ${INSTANCE_NAME} (${STACK_NAME})"
    echo "1) Show config summary"
    echo "2) Edit config and rebuild"
    echo "3) Rebuild/restart with current config"
    echo "4) Git pull and rebuild"
    echo "5) Stop instance"
    echo "6) Start instance"
    echo "7) Remove containers but keep database"
    echo "8) Remove containers and database (danger)"
    echo "0) Back to main menu"

    local action
    read -r -p "Choose an action: " action
    action="$(trim "${action}")"

    case "${action}" in
      1)
        print_instance_summary
        ;;
      2)
        collect_instance_config "edit"
        print_instance_summary
        if prompt_yes_no "Save changes and rebuild this instance?" "y"; then
          write_instance_env "${SELECTED_ENV_FILE}"
          sync_instance_artifacts "${INSTANCE_NAME}" "${SELECTED_ENV_FILE}"
          update_instance_from_current_code "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      3)
        update_instance_from_current_code "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        ;;
      4)
        if prompt_yes_no "Run git pull and rebuild this instance?" "y"; then
          pull_latest_code
          update_instance_from_current_code "${SELECTED_ENV_FILE}" "${STACK_NAME}"
        fi
        ;;
      5)
        compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" stop
        echo "Instance stopped."
        ;;
      6)
        compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" up -d
        echo "Instance started."
        ;;
      7)
        if prompt_yes_no "Remove containers but keep the database volume?" "n"; then
          compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" down --remove-orphans
          echo "Containers removed, database volume preserved."
        fi
        ;;
      8)
        if prompt_yes_no "Remove containers and database volume? This cannot be undone." "n"; then
          compose_for_instance "${SELECTED_ENV_FILE}" "${STACK_NAME}" down -v --remove-orphans
          if prompt_yes_no "Delete generated instance files too?" "n"; then
            rm -f "${SELECTED_ENV_FILE}"
            rm -rf "$(instance_dir "${INSTANCE_NAME}")"
            echo "Instance files removed."
          fi
          echo "Instance and database volume removed."
          return
        fi
        ;;
      0)
        return
        ;;
      *)
        echo "Invalid choice, try again."
        ;;
    esac
  done
}

main_menu() {
  while true; do
    echo
    echo "=============================="
    echo " EIGP VPS Container Manager"
    echo "=============================="
    echo "1) Manage existing instances"
    echo "2) Create a new instance"
    echo "0) Exit"

    local choice
    read -r -p "Choose an action: " choice
    choice="$(trim "${choice}")"

    case "${choice}" in
      1) manage_existing_instance ;;
      2) create_new_instance ;;
      0) exit 0 ;;
      *) echo "Invalid choice, try again." ;;
    esac
  done
}

main_menu
