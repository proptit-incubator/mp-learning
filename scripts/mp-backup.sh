#!/usr/bin/env bash
#
# MP Learning backup and restore for the Docker Compose stack in this checkout.
#
#   scripts/mp-backup.sh backup             # dump Postgres + archive object storage into backups/mp-<time>/
#   scripts/mp-backup.sh verify <dir>       # restore the dump into a scratch database and check it
#   scripts/mp-backup.sh restore <dir> --yes  # replace the live database and files with a backup
#
# Environment:
#   BACKUP_DIR        where backups are written (default: ./backups)
#   BACKUP_KEEP_DAYS  local backups older than this are removed after a backup (default: 14)
#   BACKUP_REMOTE     rsync destination for an off-machine copy, e.g. backup@nas:/srv/mp-learning

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
POSTGRES_CONTAINER="cio-postgres"
STORAGE_CONTAINER="cio-storage"
APP_CONTAINERS=(cio-api cio-jobs cio-dashboard)

env_value() {
  [[ -f "${ENV_FILE}" ]] || return 0
  grep -E "^$1=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

DB_USER="$(env_value POSTGRES_USER)"
DB_USER="${DB_USER:-postgres}"
DB_NAME="$(env_value POSTGRES_DB)"
DB_NAME="${DB_NAME:-classroomio}"

fail() {
  echo "Lỗi: $*" >&2
  exit 1
}

container_running() {
  [[ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" == "true" ]]
}

storage_volume() {
  docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "${STORAGE_CONTAINER}" 2>/dev/null || true
}

host_path() {
  cygpath -w "$1" 2>/dev/null || printf '%s' "$1"
}

psql_admin() {
  docker exec -i -e PGOPTIONS=--client-min-messages=warning "${POSTGRES_CONTAINER}" psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d postgres -tAc "$1"
}

cmd_backup() {
  container_running "${POSTGRES_CONTAINER}" || fail "${POSTGRES_CONTAINER} không chạy. Khởi động stack trước."

  local target
  target="${BACKUP_DIR}/mp-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "${target}"

  echo "Sao lưu cơ sở dữ liệu '${DB_NAME}'..."
  if ! docker exec "${POSTGRES_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc > "${target}/db.dump"; then
    rm -rf "${target}"
    fail "pg_dump thất bại."
  fi

  local volume
  volume="$(storage_volume)"
  if [[ -n "${volume}" ]]; then
    echo "Sao lưu kho file (volume ${volume})..."
    docker pause "${STORAGE_CONTAINER}" >/dev/null
    local status=0
    MSYS_NO_PATHCONV=1 docker run --rm -v "${volume}:/data:ro" -v "$(host_path "${target}"):/backup" \
      alpine:3.22 tar czf /backup/storage.tar.gz -C /data . || status=$?
    docker unpause "${STORAGE_CONTAINER}" >/dev/null
    [[ ${status} -eq 0 ]] || { rm -rf "${target}"; fail "Không lưu được kho file."; }
  else
    echo "Không có kho file đi kèm (${STORAGE_CONTAINER}); bỏ qua. Nếu dùng S3 bên ngoài, sao lưu bằng công cụ của nhà cung cấp."
  fi

  {
    echo "created_at=$(date -Iseconds)"
    echo "database=${DB_NAME}"
    echo "git_commit=$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo unknown)"
    echo "migrations_applied=$(docker exec "${POSTGRES_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAc 'select count(*) from drizzle.__drizzle_migrations' 2>/dev/null || echo unknown)"
    echo "storage=$([[ -n "${volume}" ]] && echo included || echo none)"
  } > "${target}/manifest.txt"

  echo "Đã sao lưu: ${target}"

  if [[ -n "${BACKUP_REMOTE:-}" ]]; then
    echo "Chép ra ${BACKUP_REMOTE}..."
    rsync -a "${target}" "${BACKUP_REMOTE}/" || fail "Không chép được ra máy khác. Bản sao cục bộ vẫn còn: ${target}"
  else
    echo "Chưa đặt BACKUP_REMOTE: bản sao lưu chỉ nằm trên máy này."
  fi

  find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name 'mp-*' -mtime "+${BACKUP_KEEP_DAYS}" -exec rm -rf {} +
}

backup_path() {
  local dir="${1:-}"
  [[ -n "${dir}" ]] || fail "Thiếu thư mục bản sao lưu."
  [[ -f "${dir}/db.dump" ]] || fail "${dir} không có db.dump."
  (cd -- "${dir}" && pwd)
}

cmd_verify() {
  local dir scratch
  dir="$(backup_path "${1:-}")"
  scratch="mp_restore_check"
  container_running "${POSTGRES_CONTAINER}" || fail "${POSTGRES_CONTAINER} không chạy."

  echo "Khôi phục thử vào cơ sở dữ liệu tạm '${scratch}'..."
  psql_admin "drop database if exists ${scratch} with (force)" >/dev/null
  psql_admin "create database ${scratch}" >/dev/null
  local status=0
  docker exec -i "${POSTGRES_CONTAINER}" pg_restore -U "${DB_USER}" -d "${scratch}" --no-owner --exit-on-error \
    < "${dir}/db.dump" || status=$?
  if [[ ${status} -eq 0 ]]; then
    docker exec "${POSTGRES_CONTAINER}" psql -U "${DB_USER}" -d "${scratch}" -c \
      "select (select count(*) from profile) as profiles, (select count(*) from course) as courses, (select count(*) from submission) as submissions"
  fi
  psql_admin "drop database if exists ${scratch} with (force)" >/dev/null
  [[ ${status} -eq 0 ]] || fail "Bản dump không khôi phục được."

  if [[ -f "${dir}/storage.tar.gz" ]]; then
    gzip -t "${dir}/storage.tar.gz" || fail "storage.tar.gz bị hỏng."
    echo "Kho file: $(tar tzf "${dir}/storage.tar.gz" | wc -l) mục, nén hợp lệ."
  fi
  echo "Bản sao lưu dùng được: ${dir}"
}

cmd_restore() {
  local dir
  dir="$(backup_path "${1:-}")"
  [[ "${2:-}" == "--yes" ]] || fail "Khôi phục sẽ GHI ĐÈ dữ liệu hiện tại. Chạy lại với --yes nếu chắc chắn."
  container_running "${POSTGRES_CONTAINER}" || fail "${POSTGRES_CONTAINER} không chạy."

  echo "Dừng ứng dụng..."
  docker stop "${APP_CONTAINERS[@]}" >/dev/null 2>&1 || true

  echo "Khôi phục cơ sở dữ liệu '${DB_NAME}'..."
  psql_admin "drop database if exists ${DB_NAME} with (force)" >/dev/null
  psql_admin "create database ${DB_NAME}" >/dev/null
  docker exec -i "${POSTGRES_CONTAINER}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" --no-owner --exit-on-error \
    < "${dir}/db.dump" || fail "pg_restore thất bại; ứng dụng vẫn đang dừng."

  if [[ -f "${dir}/storage.tar.gz" ]]; then
    local volume
    volume="$(storage_volume)"
    [[ -n "${volume}" ]] || fail "Không tìm thấy volume của ${STORAGE_CONTAINER} để khôi phục kho file."
    echo "Khôi phục kho file (volume ${volume})..."
    docker stop "${STORAGE_CONTAINER}" >/dev/null
    MSYS_NO_PATHCONV=1 docker run --rm -v "${volume}:/data" -v "$(host_path "${dir}"):/backup:ro" alpine:3.22 \
      sh -c 'find /data -mindepth 1 -delete && tar xzf /backup/storage.tar.gz -C /data' \
      || fail "Không khôi phục được kho file; ứng dụng vẫn đang dừng."
    docker start "${STORAGE_CONTAINER}" >/dev/null
  fi

  echo "Khởi động lại ứng dụng..."
  docker start "${APP_CONTAINERS[@]}" >/dev/null
  echo "Đã khôi phục từ ${dir}. Kiểm tra đăng nhập, một khoá học và một chứng chỉ trước khi mở lại cho người dùng."
}

case "${1:-}" in
  backup) cmd_backup ;;
  verify) cmd_verify "${2:-}" ;;
  restore) cmd_restore "${2:-}" "${3:-}" ;;
  *)
    sed -n '3,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
