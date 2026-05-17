# Mamabot Portable UI & Runtime 재정립 계획서

작성일: 2026-05-17  
작업 루트: `F:\\mamabot`  
문서 목적: Hermes Agent 기반 Mamabot을 **포터블 개인 에이전트 작업대**로 안정화하기 위한 UI 구조, 실행 엔진, Hermes 기능 매핑, 포터블 복구 전략을 정리한다.

---

## 0. 핵심 결론

Mamabot은 단순 채팅 UI가 아니라, 다음 목표를 가진 **포터블 에이전트 작업환경**이다.

```txt
폴더 하나를 들고 다닌다.
start-mamabot.bat를 실행한다.
자동 점검과 복구를 진행한다.
localhost:3200에서 Mamabot 작업대를 연다.
작업 폴더를 선택한다.
실행 엔진과 모델을 선택한다.
에이전트에게 작업을 요청한다.
실행 결과와 로그를 저장한다.
코드 수정은 패치 승인 후 안전하게 적용한다.
```

현재 문제는 Hermes Web UI를 쓰지 않아서 생긴 문제가 아니라, **Hermes Web UI가 내부적으로 처리하던 기능과 규칙을 Mamabot 새 UI에 아직 완전히 재배치하지 못해서 생긴 문제**다.

따라서 앞으로의 방향은 다음과 같다.

```txt
1. 메뉴 구조를 다시 정리한다.
2. 실행 엔진을 명확히 분리한다.
3. Quick / Agent / Coding / Review / Automation 모드의 실행 경로를 고정한다.
4. Hermes Web UI 기능을 Mamabot 메뉴에 정확히 매핑한다.
5. 포터블 센터를 만들어 새 PC에서도 바로 점검/복구할 수 있게 한다.
```

---

## 1. 현재 프로젝트 기준 상태

### 1-1. 기본 경로

```txt
Mamabot Root        : F:\\mamabot
WSL Root            : /mnt/f/mamabot
Mamabot Web UI      : http://localhost:3200
Hermes Dashboard    : http://127.0.0.1:9119
Hermes Home         : F:\\mamabot\\runtime\\hermes\\home
Hermes Agent        : F:\\mamabot\\runtime\\hermes\\home\\hermes-agent
Hermes Config       : F:\\mamabot\\runtime\\hermes\\home\\config.yaml
Hermes Env          : F:\\mamabot\\runtime\\hermes\\home\.env
CLI Runtime         : F:\\mamabot\\runtime\\cli
Claude Local Home   : F:\\mamabot\\runtime\\claude-home
External Backup     : F:\\\_mamabot\_backups
```

### 1-2. 현재 확인된 Hermes 상태

```txt
Hermes Dashboard /api/status        : 정상
Mamabot Hermes Native Proxy         : 정상
현재 Hermes Provider                : openrouter
현재 Hermes Model                   : nvidia/nemotron-3-super-120b-a12b:free
auto\_context\_length                  : 262144
effective\_context\_length             : 64000
```

### 1-3. 현재 확인된 CLI 상태

`runtime\\cli\\package.json`에는 Claude / Codex / Gemini CLI 의존성이 들어 있지만, 실제 `node\_modules`가 없거나 설치가 깨져 있을 수 있다.

예시 상태:

```txt
@anthropic-ai/claude-code : missing
@openai/codex             : missing
@google/gemini-cli        : missing
```

Claude status가 아래처럼 나오면 주의해야 한다.

```txt
connected: true
installed: false
```

의미:

```txt
인증 파일은 존재한다.
하지만 실행할 Claude CLI 바이너리는 없다.
따라서 CLI Agent 실행은 불가능하다.
```

---

## 2. Mamabot의 최종 정체성

Mamabot은 다음 세 가지를 합친 도구다.

```txt
1. Hermes Agent 작업대
2. Direct API 모델 실행기
3. CLI Agent 포터블 런처
```

즉, UI는 단순히 “채팅창”이 아니라 다음을 관리해야 한다.

```txt
작업 폴더
실행 엔진
모델
인증
스킬
권한
세션
실행 이력
로그
패치 승인
포터블 복구
```

---

## 3. Hermes Web UI를 대체하는 구조에 대한 판단

### 3-1. Hermes Web UI를 안 쓰는 것이 문제인가?

아니다.

문제의 본질은 다음과 같다.

```txt
Hermes 기본 Web UI는 내부적으로 status, session, skills, config, env, token, cron, logs 등을 관리한다.
Mamabot은 이 기능들을 자체 UI로 다시 배치하고 있다.
아직 메뉴 구조와 실행 경로가 명확히 정리되지 않아 사용자가 헷갈리는 상태다.
```

따라서 목표는 Hermes Web UI를 다시 쓰는 것이 아니라, **Hermes Web UI의 기능을 Mamabot 작업 흐름에 맞게 재배치하는 것**이다.

### 3-2. Hermes 원본 Dashboard의 위치

Hermes 원본 Dashboard는 평소 사용하는 메인 화면이 아니라, 비상 확인용으로 남기는 것이 좋다.

추천 위치:

```txt
Hermes 관리 > 원본 대시보드
```

역할:

```txt
Mamabot UI가 이상할 때 원본 Hermes 상태 확인
Hermes API 응답 확인
Hermes 자체 Dashboard와 Mamabot Proxy 비교
```

---

## 4. 실행 엔진 재정립

앞으로 UI의 기준은 “Provider”보다 **실행 엔진**이어야 한다.

### 4-1. 실행 엔진 종류

```txt
1. Direct API Engine
2. Hermes Agent Engine
3. CLI Agent Engine
4. Local Engine
```

---

### 4-2. Direct API Engine

목적:

```txt
짧은 대화
간단한 질문
요약
가벼운 응답
무료 API 모델 테스트
```

대상:

```txt
OpenRouter API
Gemini API
OpenAI API
Anthropic API
DeepSeek API
Groq API
NVIDIA NIM API
Cloudflare Workers AI
```

특징:

```txt
Hermes skills 사용 안 함
Hermes memory 사용 안 함
Hermes session context 사용 안 함
가볍고 빠름
Quick 응답 모드와 잘 맞음
```

UI 표시 예시:

```txt
현재 실행 경로: Direct API
Provider: OpenRouter
Model: nvidia/nemotron-3-super-120b-a12b:free
Mode: Quick
Skills: Off
Memory: Off
Session: Off
```

---

### 4-3. Hermes Agent Engine

목적:

```txt
프로젝트 분석
작업 계획
코드 구조 이해
파일 기반 에이전트 작업
스킬 기반 실행
자동화 기반 실행
```

대상:

```txt
Hermes Agent
hermes -z oneshot
Hermes Dashboard API
Hermes skills
Hermes sessions
Hermes memory
Hermes cron
```

필수 조건:

```txt
64K 이상 context 모델 필요
OpenRouter API Key 또는 지원 Provider 인증 필요
Hermes runtime 정상 필요
workspace 경로 필요
.hermes-workspace 생성 필요
```

UI 표시 예시:

```txt
현재 실행 경로: Hermes Agent
Provider: OpenRouter
Model: nvidia/nemotron-3-super-120b-a12b:free
Mode: Agent
Skills: hermes-agent
Memory: On
Session: On
Context: 64K 이상 필요
```

---

### 4-4. CLI Agent Engine

목적:

```txt
Claude Code CLI 실행
OpenAI Codex CLI 실행
Gemini CLI 실행
OpenClaude CLI 실행
인증형 CLI 기반 작업
```

대상:

```txt
Claude Code CLI
Codex CLI
Gemini CLI
OpenClaude CLI
```

필수 조건:

```txt
runtime/cli 안에 CLI 설치 필요
각 CLI 인증 필요
전역 설정 사용 금지
Mamabot local home 사용
작업 cwd는 선택된 workspace
```

UI 표시 예시:

```txt
현재 실행 경로: CLI Agent
CLI: Claude Code
Installed: true/false
Logged in: true/false
Runtime: F:\\mamabot\\runtime\\cli
Home: F:\\mamabot\\runtime\\claude-home
```

---

### 4-5. Local Engine

목적:

```txt
Ollama
LM Studio
llama.cpp server
vLLM
로컬 endpoint 기반 실행
```

필수 조건:

```txt
로컬 서버 실행 중
endpoint 연결 가능
모델 로드 완료
```

UI 표시 예시:

```txt
현재 실행 경로: Local Model
Endpoint: http://localhost:11434
Model: selected local model
Status: connected / disconnected
```

---

## 5. 응답 모드 재정립

### 5-1. Quick

```txt
실행 엔진: Direct API
목적: 짧은 대화, 간단한 질문
skills: 사용 안 함
memory: 사용 안 함
session: 사용 안 함
권장 모델: 무료/저가 API 모델
```

주의:

```txt
Quick을 Hermes Agent로 보내면 불필요한 context가 붙어 토큰이 과하게 증가할 수 있다.
따라서 Quick은 기본적으로 Direct API로 보내야 한다.
```

---

### 5-2. Agent

```txt
실행 엔진: Hermes Agent
목적: 프로젝트 분석, 다음 작업 제안, 구조 파악
skills: hermes-agent 중심
memory: 선택적 사용
session: 사용 가능
권장 모델: 64K 이상 context 모델
```

---

### 5-3. Coding

```txt
실행 엔진: Hermes Agent + Patch Approval
목적: 코드 수정, 오류 해결, 리팩터링
skills: software-development, debugging 계열
권한: 즉시 수정 금지
흐름: 분석 → 계획 → diff preview → 승인 → 백업 → 적용 → 검증
```

---

### 5-4. Review

```txt
실행 엔진: Hermes Agent 또는 CLI Agent
목적: 코드 리뷰, 아키텍처 점검, PR 전 검토
권한: 파일 수정 금지
결과: 문제점 / 개선안 / 위험도 중심
```

---

### 5-5. Automation

```txt
실행 엔진: Hermes Agent
목적: cron, workflow, gateway, scheduled run
권한: 제한적으로 허용
실행 전 로그와 이력 저장 필수
```

---

## 6. 메뉴 구조 재정립

현재 메뉴는 기능이 늘어나면서 중복이 생겼다.

현재 문제:

```txt
대시보드와 작업 채팅이 비슷하다.
Hermes 설정과 Hermes 대시보드가 분리되어 헷갈린다.
워크플로우와 자동화/Cron이 겹친다.
모델/인증 안에 Hermes 모델, API 모델, CLI 인증이 섞여 있다.
```

---

## 7. 최종 사이드바 구조 제안

추천 구조:

```txt
🏠 작업대
🕘 실행 이력
🧵 세션
🧩 패치 승인

🤖 모델 / 인증
🛠 스킬 / 플러그인
⏱ 자동화
📜 로그

🧬 Hermes 관리
🧳 포터블 센터
⚙️ 설정
```

---

## 8. 메뉴별 역할 정의

### 8-1. 작업대

기존 `대시보드`와 `작업 채팅`을 합친 메인 화면이다.

포함 기능:

```txt
작업 폴더 선택
실행 엔진 선택
응답 모드 선택
모델 선택
권한 모드 선택
스킬 선택
프롬프트 입력
Dry-run
실제 실행
결과 출력
현재 실행 로그
최근 실행 미리보기
```

작업대에서 반드시 보여야 하는 실행 경로 배지:

```txt
현재 실행 경로
Provider
Model
Mode
Skills 사용 여부
Memory 사용 여부
Session 사용 여부
Workspace
```

---

### 8-2. 실행 이력

역할:

```txt
runId별 실행 기록
성공/실패 필터
provider/model/mode 확인
prompt/output 다시 보기
실패 원인 확인
결과 복사
이전 실행 불러오기
```

저장 위치:

```txt
runtime/hermes/runs
```

---

### 8-3. 세션

역할:

```txt
Hermes session 목록
작업 세션 목록
세션별 대화 흐름
세션별 실행 기록 연결
세션 삭제/정리
```

연결 API:

```txt
/api/hermes/native/sessions
/api/agent/sessions
```

---

### 8-4. 패치 승인

역할:

```txt
에이전트가 제안한 diff 보기
변경 파일 목록 보기
수정 전 자동 백업
승인 후 적용
적용 후 git diff 확인
롤백
```

정책:

```txt
Coding Mode에서는 바로 파일 수정 금지
항상 Patch Approval을 거쳐야 함
수정 전 외부 백업 생성
위험 명령 차단
민감 파일 출력 차단
```

백업 위치:

```txt
F:\\\_mamabot\_backups
```

---

### 8-5. 모델 / 인증

내부 섹션:

```txt
A. Hermes 기본 모델
B. Direct API 모델
C. CLI Agent 인증
D. Local Model endpoint
```

표시 항목:

```txt
Provider
Model
Context length
Free/Paid
API Key 상태
OAuth 상태
CLI 설치 상태
CLI 로그인 상태
Hermes 호환 여부
64K 미만 경고
```

특히 Claude/Codex/Gemini CLI는 다음을 분리해서 보여야 한다.

```txt
installed: true/false
connected: true/false
credential path
binary path
local home path
global config 사용 여부
```

---

### 8-6. 스킬 / 플러그인

역할:

```txt
Hermes skills 목록
skill 설명
선택 가능한 skill 관리
plugin 목록
plugin enabled/disabled 상태
tool capability 확인
```

연결 API:

```txt
/api/hermes/native/skills
/api/hermes/native/plugins
```

---

### 8-7. 자동화

기존 워크플로우와 자동화/Cron을 합친다.

내부 탭:

```txt
Cron Jobs
Workflow
Gateway
Scheduled Runs
```

연결 API:

```txt
/api/hermes/native/cron/jobs
gateway status
workflow routes
```

---

### 8-8. 로그

로그 종류를 분리한다.

```txt
Mamabot 실행 로그
Hermes Agent 로그
Hermes Dashboard 로그
Native Proxy 로그
CLI Agent 로그
실패 로그
```

기능:

```txt
최근 로그 보기
자동 갱신
실패만 보기
runId로 필터
로그 복사
로그 파일 열기
```

---

### 8-9. Hermes 관리

기존 `Hermes 설정`과 `Hermes 대시보드`를 합친다.

내부 탭:

```txt
상태
원본 대시보드
Config
Env
Native API
Doctor
Gateway
```

역할:

```txt
Mamabot이 Hermes Web UI를 대체하지만,
문제가 생겼을 때 원본 Hermes Dashboard를 확인할 수 있는 관리 화면이다.
```

원본 Dashboard는 메인 메뉴가 아니라 이 안에 넣는다.

```txt
Hermes 관리 > 원본 대시보드
```

---

### 8-10. 포터블 센터

포터블 실행 상태를 한눈에 보는 메뉴다.

표시 항목:

```txt
Mamabot Root
WSL Root
WSL Distro
Node
npm
Git
Python 3.11
Hermes Home
Hermes venv
Hermes Dashboard
Hermes model
OpenRouter Key
runtime/cli node\_modules
Claude CLI
Codex CLI
Gemini CLI
작업 폴더 접근
백업 위치
```

버튼:

```txt
전체 점검
자동 복구
Hermes 재시작
CLI 설치
npm install
포터블 ZIP 만들기
설정 내보내기
설정 가져오기
로그 열기
```

---

### 8-11. 설정

Mamabot 자체 설정이다.

포함:

```txt
테마
사이드바 표시
기본 작업 폴더
기본 실행 엔진
기본 응답 모드
백업 위치
위험 명령 차단 규칙
민감 파일 차단 규칙
UI 표시 옵션
```

Hermes config와 Mamabot 설정은 분리한다.

---

## 9. Hermes Web UI 기능 매핑표

|Hermes 기능|Mamabot 위치|
|-|-|
|status|Hermes 관리 > 상태|
|dashboard home|Hermes 관리 > 원본 대시보드|
|logs|로그|
|sessions|세션|
|skills|스킬 / 플러그인|
|cron jobs|자동화|
|model info|모델 / 인증 > Hermes 기본 모델|
|model options|모델 / 인증 > Hermes 기본 모델|
|env|모델 / 인증 또는 Hermes 관리 > Env|
|config raw|Hermes 관리 > Config|
|config schema|Hermes 관리 > Config|
|plugins|스킬 / 플러그인|
|gateway|자동화 또는 Hermes 관리|
|agent oneshot|작업대|
|run result|실행 이력|
|patch/diff|패치 승인|

---

## 10. 포터블 정책

### 10-1. 목표

최종 목표:

```txt
폴더 하나를 들고 다닌다.
새 PC에서 start-mamabot.bat를 실행한다.
필요한 점검과 복구가 자동으로 진행된다.
브라우저에서 http://localhost:3200이 열린다.
작업 폴더를 선택하고 바로 작업한다.
```

---

### 10-2. 포터블 내부에 둬야 하는 것

```txt
runtime/hermes/home
runtime/cli
runtime/cache
runtime/logs
runtime/runs
config
scripts
docs
workspaces
```

---

### 10-3. 포터블에서 조심해야 하는 것

```txt
Python venv는 경로가 박혀서 이동 시 깨질 수 있음
OAuth CLI 인증은 PC 환경에 따라 재로그인이 필요할 수 있음
WSL distro 이름은 PC마다 다를 수 있음
드라이브 문자는 PC마다 바뀔 수 있음
node\_modules는 이동 후 손상될 수 있음
secrets는 개인 백업에만 포함해야 함
```

---

### 10-4. 프로젝트 내부에 두면 안 되는 것

큰 백업은 프로젝트 루트 안에 두지 않는다.

나쁜 예:

```txt
F:\\mamabot\\backups\\broken-venv
F:\\mamabot\\backups\\full-runtime-copy
F:\\mamabot\\backups\\node\_modules-copy
```

좋은 예:

```txt
F:\\\_mamabot\_backups
```

이유:

```txt
Next.js build가 프로젝트 루트의 큰 백업 폴더를 스캔하다가 깨질 수 있음
Git ignore와 별개로 빌드/파일 추적 단계에서 문제가 생길 수 있음
```

---

## 11. start-mamabot.bat 최종 역할

`start-mamabot.bat`는 최종적으로 다음을 수행해야 한다.

```txt
1. 현재 Mamabot root 자동 감지
2. WSL 설치 여부 확인
3. WSL distro 자동 선택
4. Windows 경로를 WSL 경로로 변환
5. WSL에서 /mnt/<drive>/mamabot 접근 확인
6. Node/npm/Git 확인
7. node\_modules 없으면 npm install
8. Python 3.11 확인
9. Hermes venv 유효성 확인
10. 필요 시 Hermes venv 재생성
11. Hermes Dashboard 9119 실행 또는 기존 실행 재사용
12. Mamabot 3200 실행
13. 브라우저 열기
```

---

## 12. doctor-mamabot.ps1 최종 역할

doctor는 점검과 복구를 담당한다.

점검 항목:

```txt
Mamabot root
WSL distro
WSL mount
Node
npm
Git
Python 3.11
Hermes home
Hermes agent folder
Hermes venv path
Hermes binary
Dashboard API
OpenRouter key
runtime/cli package
runtime/cli node\_modules
Claude CLI
Codex CLI
Gemini CLI
```

복구 항목:

```txt
WSL mount 복구
Python 3.11 설치 안내 또는 설치
Hermes venv 재생성
Dashboard dependencies 재설치
npm install
CLI dependency install
Dashboard 재시작
```

---

## 13. CLI 설치 정책

CLI는 절대 작업 폴더에 설치하지 않는다.

올바른 위치:

```txt
F:\\mamabot\\runtime\\cli
```

설치 대상:

```txt
@anthropic-ai/claude-code
@openai/codex
@google/gemini-cli
```

설치 명령은 다음 위치에서만 실행한다.

```powershell
cd F:\\mamabot\\runtime\\cli
npm install
```

작업 폴더에는 다음이 생기면 안 된다.

```txt
node\_modules
package-lock.json
.claude
.auth
```

작업 폴더에는 원칙적으로 이것만 허용한다.

```txt
.hermes-workspace
```

---

## 14. Workspace 정책

사용자가 선택한 작업 폴더는 실제 작업 대상이다.

원칙:

```txt
Mamabot runtime은 F:\\mamabot 내부
작업 cwd는 사용자가 선택한 workspace
workspace에는 .hermes-workspace만 생성
CLI 설치는 runtime/cli
백업은 F:\\\_mamabot\_backups
```

---

## 15. 권한 모드 정책

### 15-1. Suggest

```txt
읽기 중심
파일 수정 금지
명령 실행 금지
분석과 제안만 허용
기본 안전 모드
```

### 15-2. Edit

```txt
변경안 생성 가능
실제 적용 전 diff preview 필요
사용자 승인 후 적용
적용 전 백업 필수
```

### 15-3. Auto

```txt
초기에는 잠금 유지
나중에 허용 명령 목록 기반으로 제한적 사용
위험 명령 차단
백업 필수
로그 저장 필수
```

---

## 16. 위험 명령 차단

기본 차단 명령:

```txt
rm -rf
del /s
format
git reset --hard
git clean -fd
Remove-Item -Recurse -Force
rmdir /s
shutdown
diskpart
```

민감 파일 차단:

```txt
.env
.env.local
credentials.json
vault.json.enc
id\_rsa
id\_ed25519
.claude/.credentials.json
secrets/\*
```

---

## 17. 실행 결과 저장 정책

모든 실행은 runId 기준으로 저장한다.

저장 위치:

```txt
runtime/hermes/runs
```

저장 필드:

```txt
runId
createdAt
status
ok
provider
model
engine
executionProfile
contextPolicy
mode
skills
workspaceRoot
workspaceWsl
prompt
output
stderr
error
durationMs
memorySync
sessionContextUsed
memorySyncUsed
usage
```

목적:

```txt
이전 실행 다시 보기
실패 원인 분석
모델별 품질 비교
작업 복원
세션 연결
```

---

## 18. 모델 선택 정책

Hermes Agent 실행 모델은 최소 64K context 이상이어야 한다.

기본 추천:

```txt
nvidia/nemotron-3-super-120b-a12b:free
```

주의 모델:

```txt
openrouter/free
openai/gpt-4o-mini
context 64K 미만 모델
router가 실제 어떤 모델을 고를지 불명확한 모델
```

UI 표시:

```txt
무료/유료
context length
Hermes 호환 여부
Direct API 적합 여부
Coding 적합 여부
즐겨찾기 여부
```

---

## 19. 포터블 패키지 종류

### 19-1. 개인용 전체 백업

포함:

```txt
app
config
runtime/hermes
runtime/cli
runtime/cache
scripts
docs
workspaces
package.json
package-lock.json
plan.md
start scripts
secrets
```

주의:

```txt
개인 보관용으로만 사용
공유 금지
API Key 포함 가능성 있음
OAuth 토큰 포함 가능성 있음
```

---

### 19-2. 공유용 깨끗한 패키지

포함:

```txt
app
config 기본값
scripts
docs
package.json
package-lock.json
.env.example
start scripts
README
```

제외:

```txt
secrets
memory
runs
logs
OAuth tokens
.env.local
claude credentials
OpenRouter API Key
runtime/cache
runtime/logs
```

---

## 20. 구현 우선순위

### 1단계: 메뉴 구조 정리

목표:

```txt
대시보드 + 작업 채팅 → 작업대
Hermes 설정 + Hermes 대시보드 → Hermes 관리
워크플로우 + 자동화/Cron → 자동화
포터블 센터 메뉴 추가
```

대상 파일 후보:

```txt
app/components/Sidebar.jsx
app/components/AppShell.jsx
app/components/DashboardPanel.jsx
app/components/WorkbenchPanel.jsx
app/components/WorkbenchChatPanel.jsx
```

---

### 2단계: 실행 경로 배지 추가

목표:

```txt
사용자가 현재 실행이 Direct API인지 Hermes Agent인지 CLI Agent인지 즉시 알 수 있게 한다.
```

표시 예시:

```txt
현재 실행 경로: Direct API
Mode: Quick
Skills: Off
Memory: Off
Session: Off
```

또는:

```txt
현재 실행 경로: Hermes Agent
Mode: Agent
Skills: hermes-agent
Memory: On
Session: On
Context: 64K required
```

---

### 3단계: Quick / Agent / Coding 분기 UI 명확화

목표:

```txt
Quick은 Direct API
Agent는 Hermes Agent
Coding은 Hermes Agent + Patch Approval
Review는 Hermes/CLI Review
Automation은 Hermes Cron/Workflow
```

---

### 4단계: 포터블 센터 추가

목표:

```txt
doctor-mamabot.ps1 결과를 UI에서 확인
문제 항목을 버튼으로 복구
CLI 설치 상태 확인
Dashboard 상태 확인
```

신규 API 후보:

```txt
app/api/portable/status/route.js
app/api/portable/doctor/route.js
app/api/portable/repair/route.js
app/api/portable/install-cli/route.js
```

신규 컴포넌트 후보:

```txt
app/components/PortableCenterPanel.jsx
```

---

### 5단계: CLI 설치 복구

목표:

```txt
runtime/cli npm install
Claude/Codex/Gemini CLI installed 상태 정상화
설치/로그인 상태 분리 표시
```

---

### 6단계: Hermes 관리 화면 정리

목표:

```txt
Hermes status
model info
logs
config
env
native API
원본 dashboard
doctor
를 한 화면 안에서 관리
```

---

### 7단계: Patch Approval 강화

목표:

```txt
Coding Mode에서 즉시 수정 금지
diff preview
승인 후 백업
적용 후 git diff
롤백
```

---

### 8단계: Export Portable 추가

목표:

```txt
개인용 전체 백업 ZIP
공유용 클린 ZIP
두 종류를 선택해서 생성
```

신규 스크립트 후보:

```txt
scripts/portable/export-portable.ps1
scripts/portable/backup-mamabot.ps1
```

---

## 21. 작업 절차 규칙

모든 코드 수정은 아래 순서로 진행한다.

```txt
1. 현재 파일 확인
2. 외부 백업 생성
3. 최소 수정
4. 변경 라인 확인
5. API 테스트
6. UI 테스트
7. git diff 확인
8. plan.md 또는 이 문서에 진행 기록 추가
```

백업 위치:

```txt
F:\\\_mamabot\_backups
```

금지:

```txt
프로젝트 루트에 큰 백업 생성 금지
작업 폴더에 npm install 금지
Set-Content -Encoding UTF8 사용 금지
위험 명령 자동 실행 금지
민감 파일 출력 금지
```

---

## 22. 바로 다음 작업

다음 작업은 아래 순서로 진행한다.

```txt
1. Sidebar.jsx 구조 확인
2. AppShell.jsx 라우팅 구조 확인
3. DashboardPanel / WorkbenchPanel 역할 확인
4. 메뉴명 1차 정리
5. 작업대 메뉴로 대시보드/작업채팅 병합
6. Hermes 관리 메뉴로 Hermes 설정/Hermes 대시보드 병합
7. 포터블 센터 메뉴 추가
8. 실행 경로 배지 추가
```

---

## 23. 성공 기준

### 23-1. 1차 성공 기준

```txt
사이드바에서 중복 메뉴가 사라진다.
작업대가 메인 실행 화면이 된다.
Hermes 관리가 런타임 관리 화면이 된다.
포터블 센터에서 실행환경 상태를 볼 수 있다.
Quick/Agent/Coding 실행 경로가 화면에 명확히 표시된다.
Hermes Dashboard를 몰라도 Mamabot UI에서 대부분의 기능을 사용할 수 있다.
원본 Hermes Dashboard는 비상 확인용으로만 남는다.
```

### 23-2. 최종 성공 기준

```txt
Mamabot 폴더를 다른 PC로 옮긴다.
start-mamabot.bat를 실행한다.
doctor가 자동 점검한다.
깨진 venv/CLI/runtime을 복구한다.
localhost:3200이 열린다.
작업 폴더를 선택한다.
모델과 실행 엔진을 선택한다.
에이전트 작업을 바로 시작한다.
실행 결과와 로그가 저장된다.
코드 수정은 패치 승인 후 안전하게 적용된다.
```

---

## 24. 한 줄 기준

앞으로 모든 설계 판단은 이 기준으로 한다.

```txt
작업대는 실제 일을 하는 곳,
Hermes 관리는 Hermes 런타임을 점검하는 곳,
포터블 센터는 새 PC에서 바로 쓰기 위한 복구 센터,
설정은 Mamabot 자체 설정을 관리하는 곳이다.
```


---

## 25. ?? ?? - 2026-05-17 1? ?? ???

### ?? ??

- ?????? `????`? `?? ??` ??? ???? `???`? ????.
- `Hermes ??`? `Hermes ????`? `Hermes ??`? ????.
- `?????`? `??? / Cron`? `???`? ????.
- `??? ??` ??? ????.
- `WorkbenchPanel` ?? ??? `????`?? `???`? ????.
- `HermesManagementPanel.jsx`, `AutomationPanel.jsx`, `PortableCenterPanel.jsx`? ????.

### ?? ??

- app/components/Sidebar.jsx
- app/components/AppShell.jsx
- app/components/WorkbenchPanel.jsx
- app/components/HermesManagementPanel.jsx
- app/components/AutomationPanel.jsx
- app/components/PortableCenterPanel.jsx

### ?? ?? ??

1. ????? `???`, `Hermes ??`, `??? ??`? ???? ????.
2. `???` ?? ? ?? Workbench ??? ?? ????? ????.
3. `Hermes ??`?? ?? / Config / ?? ???? ?? ????? ????.
4. `???`?? Cron? Workflow ?? ????? ????.
5. `??? ??`?? Hermes / OpenRouter / Claude CLI ??? ????? ????.


---

## 27. ?? ?? - 2026-05-17 WSL ??? ???? ?? ??

### ??

?? ???? `wsl -d Ubuntu`? ????? ?? PC?? `Ubuntu`?? ??? ???? ?? ??? ????.

### ??

Hermes Dashboard? Mamabot native proxy? ?? ?????? Hermes ??? ?? ?? ??? WSL ??? ?? ???? ???.

### ??

??? ?? ??? ????? WSL ??? ??? ???? ???.

1. `wsl -l -q`? ??? ???.
2. `Ubuntu` ??? ??? ?? ????.
3. ??? ? ?? ???? ????.
4. ??? ??? WSL ?? ??? ????.

### ?? ??

- scripts/portable/wsl-distro-helper.ps1

### ?? ??

1. start-mamabot.ps1?? helper? ????? ????.
2. doctor-mamabot.ps1?? helper? ????? ????.
3. ??? ???? ??? WSL distro ??? ????.
