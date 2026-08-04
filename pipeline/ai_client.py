"""Claude 호출 추상화.

AI_BACKEND=cli (기본값): 로컬에 설치된 `claude` CLI 를 headless(print) 모드로 호출한다.
AI_BACKEND=api: Anthropic API SDK 로 직접 호출한다.

호출 횟수는 프로세스 전역으로 추적하며 MAX_CLAUDE_CALLS 를 넘기면 예외를 던져
파이프라인이 부분 데이터로 리포트를 만들지 않고 안전하게 중단하도록 한다.
"""
from __future__ import annotations

import json
import subprocess
import time

import config

_call_count = 0
_last_call_at = 0.0


class ClaudeCallBudgetExceeded(RuntimeError):
    pass


class ClaudeCallError(RuntimeError):
    pass


def _throttle() -> None:
    global _last_call_at
    elapsed = time.monotonic() - _last_call_at
    wait = config.CLAUDE_CALL_INTERVAL_SECONDS - elapsed
    if wait > 0:
        time.sleep(wait)
    _last_call_at = time.monotonic()


def call_claude(prompt: str) -> str:
    """prompt 를 Claude 에 보내고 텍스트 응답을 반환한다."""
    global _call_count

    if _call_count >= config.MAX_CLAUDE_CALLS:
        raise ClaudeCallBudgetExceeded(
            f"Claude 호출 예산({config.MAX_CLAUDE_CALLS}회) 초과 — 파이프라인을 중단합니다."
        )

    _throttle()
    _call_count += 1

    if config.AI_BACKEND == "api":
        return _call_via_api(prompt)
    return _call_via_cli(prompt)


def _call_via_cli(prompt: str) -> str:
    cmd = ["claude", "-p", prompt, "--model", config.CLAUDE_MODEL, "--output-format", "text"]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=config.CLAUDE_TIMEOUT_SECONDS,
            encoding="utf-8",
        )
    except FileNotFoundError as exc:
        raise ClaudeCallError(
            "`claude` CLI를 찾을 수 없습니다. Pi에 Claude Code CLI가 설치·인증되어 있는지 확인하세요 "
            "(pipeline/README.md 참고), 또는 AI_BACKEND=api 로 전환하세요."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise ClaudeCallError(f"Claude CLI 호출이 {config.CLAUDE_TIMEOUT_SECONDS}초를 초과했습니다.") from exc

    if result.returncode != 0:
        raise ClaudeCallError(f"Claude CLI 호출 실패 (exit {result.returncode}): {result.stderr.strip()}")

    return result.stdout.strip()


def _call_via_api(prompt: str) -> str:
    import anthropic  # 지연 임포트: AI_BACKEND=cli 만 쓰는 경우 의존성 불필요

    if not config.ANTHROPIC_API_KEY:
        raise ClaudeCallError("AI_BACKEND=api 인데 ANTHROPIC_API_KEY 가 설정되어 있지 않습니다.")

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    try:
        message = client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        raise ClaudeCallError(f"Anthropic API 호출 실패: {exc}") from exc

    return "".join(block.text for block in message.content if block.type == "text").strip()


def call_claude_json(prompt: str):
    """Claude 응답을 JSON으로 파싱한다. 코드펜스(```json ... ```)로 감싸져 오는 경우를 처리한다."""
    raw = call_claude(prompt)
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ClaudeCallError(f"Claude 응답을 JSON으로 파싱하지 못했습니다: {exc}\n원문: {raw[:500]}") from exc


def calls_used() -> int:
    return _call_count
