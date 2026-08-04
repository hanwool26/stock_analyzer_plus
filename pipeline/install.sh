#!/usr/bin/env bash
# 라즈베리파이에서 1회 실행하는 설치 스크립트.
# venv 생성 + 의존성 설치 + systemd service/timer 등록 → 이후 재부팅해도 스케줄이 유지된다.
#
# 사용법:
#   cd pipeline
#   chmod +x install.sh
#   ./install.sh
set -euo pipefail

PIPELINE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_USER="$(whoami)"
SYSTEMD_DIR="/etc/systemd/system"

echo "==> pipeline 디렉터리: $PIPELINE_DIR"
echo "==> 서비스 실행 사용자: $SERVICE_USER"

if [ ! -f "$PIPELINE_DIR/.env" ]; then
  echo "==> .env 가 없어 .env.example 을 복사합니다. 반드시 값을 채워 넣으세요."
  cp "$PIPELINE_DIR/.env.example" "$PIPELINE_DIR/.env"
fi

echo "==> Python venv 생성"
python3 -m venv "$PIPELINE_DIR/venv"

echo "==> 의존성 설치"
"$PIPELINE_DIR/venv/bin/pip" install --upgrade pip
"$PIPELINE_DIR/venv/bin/pip" install -r "$PIPELINE_DIR/requirements.txt"

# claude CLI가 npm 전역 설치 등으로 PATH 상에 있으면 그 디렉터리를 systemd 서비스의
# PATH에도 포함시킨다 (systemd는 기본 PATH가 짧아 사용자 쉘의 PATH를 상속하지 않음).
CLAUDE_BIN="$(command -v claude || true)"
if [ -n "$CLAUDE_BIN" ]; then
  EXTRA_PATH="$(dirname "$CLAUDE_BIN")"
  echo "==> claude CLI 발견: $CLAUDE_BIN (systemd PATH에 추가)"
else
  EXTRA_PATH="$HOME/.npm-global/bin"
  echo "==> claude CLI를 아직 못 찾았습니다. AI_BACKEND=cli 를 쓰려면 설치 후 이 스크립트를 다시 실행하세요."
fi

echo "==> systemd 유닛 생성 (${SYSTEMD_DIR})"
sed \
  -e "s|__PIPELINE_DIR__|$PIPELINE_DIR|g" \
  -e "s|__USER__|$SERVICE_USER|g" \
  -e "s|__EXTRA_PATH__|$EXTRA_PATH|g" \
  "$PIPELINE_DIR/systemd/stock-analyzer.service" | sudo tee "$SYSTEMD_DIR/stock-analyzer.service" > /dev/null

sudo cp "$PIPELINE_DIR/systemd/stock-analyzer.timer" "$SYSTEMD_DIR/stock-analyzer.timer"

echo "==> systemd 등록 및 타이머 활성화"
sudo systemctl daemon-reload
sudo systemctl enable --now stock-analyzer.timer

echo ""
echo "==> 완료. 확인 명령어:"
echo "    systemctl status stock-analyzer.timer"
echo "    systemctl list-timers | grep stock-analyzer"
echo "    sudo systemctl start stock-analyzer.service   # 지금 바로 1회 수동 실행"
echo "    journalctl -u stock-analyzer.service -f        # 실시간 로그"
echo ""
echo "==> $PIPELINE_DIR/.env 에 MONGODB_URI, NAVER_*, MARKETAUX_API_KEY, ANTHROPIC_API_KEY 를 채워 넣었는지 확인하세요."
