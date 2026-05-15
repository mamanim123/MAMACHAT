# Mamabot Portable Agent — 작업계획서

F:\test\mamabot\PLAN.md 기준으로 이어서 작업하자. 현재 Hermes 실제 실행은 nvidia/nemotron-3-super-120b-a12b:free 모델로 성공했고, 다음 작업은 실행 결과 저장 / 최근 실행 목록 기능 추가야. PowerShell 명령어부터 줘.

> 프로젝트 위치: F:\\test\\mamabot  

> 실행 포트: 3200  

> 목표: 폴더 하나로 들고 다니며, 작업폴더를 선택해서 Codex / Claude Code / OpenClaude / API 모델 / 로컬 모델을 사용할 수 있는 포터블 개인 에이전트 구축



---



## 1. 프로젝트 목표



Mamabot Portable Agent는 특정 PC에 고정되지 않고, 하나의 폴더를 이동하면서 사용할 수 있는 개인 에이전트 작업환경이다.



핵심 목표는 다음과 같다.



1. 앱 런타임은 Mamabot 폴더 내부에서 관리한다.

2. CLI는 사용자가 선택한 작업폴더가 아니라 `runtime/cli`에 설치한다.

3. 실제 작업 대상 폴더는 사용자가 UI에서 선택한다.

4. 에이전트는 선택된 작업폴더를 `cwd`로 사용한다.

5. 작업폴더에는 `.hermes-workspace`만 생성한다.

6. Codex / Claude Code / OpenClaude는 인증형 CLI Provider로 관리한다.

7. OpenRouter / OpenAI / Anthropic / Gemini / DeepSeek 등은 API Key Provider로 관리한다.

8. Ollama / LM Studio 등은 Local Provider로 관리한다.

9. 파일 수정 전에는 백업을 만든다.

10. 위험 명령과 민감 파일 접근은 차단한다.



---



## 2. 현재 완료 상태



### 완료됨



- \[x] 기본 폴더 구조 생성

- \[x] Next.js 기본 앱 실행 성공

- \[x] 포트 3200으로 변경

- \[x] `runtime/cli` 폴더 생성

- \[x] `scripts/portable/check-runtime.mjs` 생성

- \[x] `scripts/portable/ensure-runtime.mjs` 생성

- \[x] Node / npm / Git 감지 성공

- \[x] `runtime/cli/package.json` 생성 완료

- \[x] 기본 페이지 표시 성공



### 현재 확인된 상태



```txt

Node: v22.17.0

npm: 10.9.2

Git: git version 2.51.2.windows.1

Port: 3200

URL: http://localhost:3200

3. 목표 디렉토리 구조

mamabot/

│

├─ app/

│  ├─ api/

│  │  ├─ agent/

│  │  │  └─ run/

│  │  │     └─ route.js

│  │  ├─ runtime/

│  │  │  └─ route.js

│  │  ├─ status/

│  │  │  └─ route.js

│  │  └─ workspace/

│  │     └─ route.js

│  │

│  ├─ components/

│  ├─ hooks/

│  ├─ lib/

│  │  ├─ portablePaths.js

│  │  └─ workspaceManager.js

│  ├─ public/

│  ├─ layout.jsx

│  └─ page.jsx

│

├─ runtime/

│  ├─ cli/

│  │  ├─ package.json

│  │  └─ node\_modules/

│  ├─ bin/

│  └─ cache/

│

├─ config/

│  ├─ workspace.json

│  ├─ providers.json

│  ├─ permissions.json

│  ├─ runtime.json

│  └─ ui-settings.json

│

├─ secrets/

│  ├─ .env.example

│  └─ .env.local

│

├─ memory/

│  ├─ user.md

│  ├─ memory.md

│  ├─ preferences.md

│  └─ do-not-do.md

│

├─ skills/

│  ├─ code-review.md

│  ├─ fix-error.md

│  ├─ summarize-script.md

│  └─ interview-answer.md

│

├─ workspaces/

│  ├─ recent.json

│  └─ pinned.json

│

├─ backups/

│  ├─ app/

│  └─ workspaces/

│

├─ logs/

├─ scripts/

│  └─ portable/

│     ├─ check-runtime.mjs

│     ├─ ensure-runtime.mjs

│     └─ install-cli.mjs

│

├─ docs/

│  └─ PORTABLE\_PLAN.md

│

├─ plan.md

├─ package.json

├─ portable.config.json

├─ start.bat

├─ stop.bat

└─ .gitignore

4. 핵심 설계 원칙

4-1. CLI와 작업폴더 분리



잘못된 방식:



선택한 작업폴더/node\_modules

선택한 작업폴더/package-lock.json

선택한 작업폴더/.claude

선택한 작업폴더/.auth



이 방식은 실제 프로젝트를 오염시킨다.



목표 방식:



mamabot/runtime/cli

→ Codex / Claude Code / OpenClaude 설치



선택한 작업폴더

→ 실제 작업 cwd



선택한 작업폴더/.hermes-workspace

→ 프로젝트별 기억, 설정, 백업

5. Provider 구조

Auth CLI Provider

Codex

Claude Code

OpenClaude



특징:



CLI 기반 실행

인증은 각 CLI의 로그인 방식 사용

Mamabot은 CLI 실행과 작업폴더 cwd만 관리

CLI 설치 위치는 runtime/cli

API Key Provider

OpenAI

Anthropic

OpenRouter

Gemini

Groq

DeepSeek

Mistral

Cohere



특징:



secrets/.env.local 또는 암호화 vault에 API 키 저장

클라이언트 노출 금지

서버 API Route에서만 사용

Local Provider

Ollama

LM Studio

llama.cpp server

vLLM



특징:



로컬 endpoint 사용

기본 Ollama URL: http://localhost:11434

PC마다 로컬 모델 실행 여부가 다를 수 있음

6. 작업 단계

1단계 — 기본 구조 생성



상태: 완료



&#x20;폴더 구조 생성

&#x20;기본 config 생성

&#x20;memory / skills 생성

&#x20;runtime scripts 생성

&#x20;기본 Next 페이지 생성

&#x20;포트 3200 실행 확인

2단계 — Workspace Selector 구현



목표:



사용자가 웹UI에서 작업폴더를 입력 또는 선택하고, 그 폴더를 현재 workspace로 저장한다.



구현 파일:



app/components/WorkspaceSelector.jsx

app/api/workspace/route.js

app/lib/workspaceManager.js

config/workspace.json

workspaces/recent.json

workspaces/pinned.json



기능:



현재 workspace 표시

workspace 경로 입력

workspace 저장

최근 workspace 목록 표시

선택한 폴더에 .hermes-workspace 자동 생성



완료 기준:



UI에서 F:\\test\\mama-v1.2 같은 작업폴더를 지정할 수 있다.

저장 후 config/workspace.json에 반영된다.

작업폴더 안에 .hermes-workspace가 생성된다.

3단계 — Runtime Status Panel 구현



목표:



현재 실행환경 상태를 웹UI에서 보여준다.



구현 파일:



app/components/RuntimeStatusPanel.jsx

app/api/runtime/route.js

scripts/portable/check-runtime.mjs



표시 항목:



Node

npm

Git

runtime/cli/package.json

OpenClaude 설치 여부

Codex 설치 여부

Claude Code 설치 여부



완료 기준:



웹UI에서 Node/npm/Git 상태가 보인다.

CLI 설치 여부가 보인다.

설치 안 된 CLI는 Not Installed로 표시된다.

4단계 — Provider Status Panel 구현



목표:



모델 Provider 상태를 한눈에 볼 수 있게 한다.



구현 파일:



app/components/ProviderStatusPanel.jsx

config/providers.json

app/api/status/route.js



표시 항목:



OpenClaude CLI

Codex CLI

Claude Code CLI

OpenRouter API Key

Ollama Local



완료 기준:



사용 가능한 Provider와 불가능한 Provider가 구분된다.

API Key가 필요한 Provider는 키 설정 필요로 표시된다.

Local Provider는 연결 테스트 결과를 표시한다.

5단계 — Agent Runner 1차 구현



목표:



선택한 작업폴더 기준으로 에이전트를 실행할 준비를 한다.



구현 파일:



app/api/agent/run/route.js

app/lib/portablePaths.js

app/lib/workspaceManager.js



핵심 실행 원칙:



CLI 위치 = mamabot/runtime/cli

작업 위치 = 선택한 workspace

설정 위치 = workspace/.hermes-workspace



child\_process 실행 기준:



cwd = WORKSPACE\_ROOT

PATH = runtime/cli/node\_modules/.bin + 기존 PATH



완료 기준:



/api/agent/run이 현재 workspace를 읽는다.

workspace가 없으면 오류를 반환한다.

실제 CLI 실행 전까지는 dry-run 형태로 실행 계획을 반환한다.

6단계 — Agent Chat UI 구현



목표:



웹UI에서 에이전트에게 작업을 요청할 수 있게 한다.



구현 파일:



app/components/AgentPanel.jsx

app/page.jsx

app/api/agent/run/route.js



기능:



프롬프트 입력

선택 모델 표시

선택 workspace 표시

실행 버튼

응답 출력

오류 출력



완료 기준:



브라우저에서 프롬프트를 입력할 수 있다.

/api/agent/run으로 요청이 간다.

응답이 화면에 출력된다.

7단계 — CLI 설치 기능 연결



목표:



runtime/cli에 필요한 CLI를 설치할 수 있게 한다.



구현 파일:



scripts/portable/install-cli.mjs

app/api/runtime/install/route.js

app/components/RuntimeStatusPanel.jsx



설치 대상:



@gitlawb/openclaude

@openai/codex

@anthropic-ai/claude-code



주의:



설치는 runtime/cli에서만 실행한다.

작업폴더에서 npm install 금지

앱 루트 node\_modules와 CLI node\_modules 분리



완료 기준:



버튼으로 CLI 설치 가능

설치 후 Runtime Status에 반영

작업폴더는 오염되지 않음

8단계 — 권한 모드 구현



목표:



파일 수정과 명령 실행을 안전하게 제어한다.



구현 파일:



config/permissions.json

app/components/PermissionModeSelector.jsx

app/lib/permissionGuard.js



모드:



Suggest Mode

- 읽기 가능

- 수정안 제안만 가능



Edit Mode

- 파일 수정 가능

- 명령 실행은 승인 필요



Auto Mode

- 허용된 명령만 자동 실행

- 위험 명령 차단



차단 명령:



rm -rf

del /s

format

git reset --hard

git clean -fd

Remove-Item -Recurse -Force



차단 파일:



.env

.env.local

credentials.json

vault.json.enc

id\_rsa

id\_ed25519



완료 기준:



위험 명령 실행 전 차단

민감 파일 출력 차단

권한 모드를 UI에서 변경 가능

9단계 — 백업 시스템 구현



목표:



파일 수정 전 자동 백업을 만든다.



구현 파일:



app/lib/backupManager.js

backups/workspaces/



구조:



backups/workspaces/{workspaceHash}/

├─ snapshots/

├─ file-patches/

└─ metadata.json



완료 기준:



수정 전 원본 파일 백업

workspace별 백업 분리

복원 가능한 구조 생성

10단계 — 실제 CLI Provider 연결



목표:



OpenClaude / Codex / Claude Code를 Provider별로 실행한다.



구현 파일:



app/lib/providers/

app/lib/providers/openclaudeProvider.js

app/lib/providers/codexProvider.js

app/lib/providers/claudeCodeProvider.js



공통 인터페이스:



checkStatus()

run(prompt, context)



완료 기준:



Provider별 상태 확인 가능

선택한 Provider로 실행 가능

작업 cwd는 항상 workspace

CLI는 항상 runtime/cli에서 사용

11단계 — Local / API Provider 연결



목표:



API 모델과 로컬 모델을 연결한다.



구현 파일:



app/lib/providers/apiProvider.js

app/lib/providers/localProvider.js

app/api/chat/route.js



완료 기준:



OpenRouter API 호출 가능

Ollama 연결 테스트 가능

모델 선택 UI에서 API/Local Provider 구분 가능

12단계 — UI 정리



목표:



개인 에이전트 작업대 형태의 UI로 정리한다.



구성:



상단: Workspace / Model / Permission Mode / Runtime Status

왼쪽: 메뉴

중앙: Agent Chat

오른쪽: Runtime / Provider / Memory / Logs



1차 UI 구성:



WorkspaceSelector

RuntimeStatusPanel

ProviderStatusPanel

AgentPanel



완료 기준:



현재 workspace가 항상 보인다.

현재 provider가 항상 보인다.

런타임 문제를 바로 알 수 있다.

에이전트 실행 결과가 한 화면에서 보인다.

13. 테스트 시나리오

A. 기본 실행 테스트

npm run dev



확인:



http://localhost:3200

B. 런타임 확인

node scripts\\portable\\check-runtime.mjs

C. CLI 런타임 준비

node scripts\\portable\\ensure-runtime.mjs

D. Workspace 생성 테스트



UI 또는 API로 workspace 지정 후 확인:



선택한작업폴더/.hermes-workspace

E. 작업폴더 오염 방지 테스트



확인할 것:



선택한 작업폴더에 node\_modules 생성 금지

선택한 작업폴더에 package-lock.json 생성 금지

14. 당장 다음 작업



다음 순서로 진행한다.



plan.md 생성

WorkspaceSelector.jsx 생성

RuntimeStatusPanel.jsx 생성

app/page.jsx를 대시보드 형태로 수정

workspace 저장 테스트

runtime 상태 표시 테스트

Agent Runner dry-run 구현

15. 작업 규칙

파일 수정 전 실제 파일을 확인한다.

PowerShell Set-Content -Encoding UTF8 사용 금지.

파일 저장은 UTF-8 no BOM으로 한다.

작업폴더에는 CLI를 설치하지 않는다.

CLI는 반드시 runtime/cli에 설치한다.

작업폴더에는 .hermes-workspace만 생성한다.

API 키는 클라이언트에 노출하지 않는다.

민감 파일은 출력하지 않는다.

위험 명령은 차단한다.

최소 수정 원칙을 따른다.

16. 완료 기준



이 프로젝트의 1차 완성 기준은 다음과 같다.



&#x20;start.bat 실행으로 서버 시작

&#x20;http://localhost:3200 접속 가능

&#x20;Workspace 선택 가능

&#x20;.hermes-workspace 생성 가능

&#x20;Runtime 상태 확인 가능

&#x20;Provider 상태 확인 가능

&#x20;Agent Runner dry-run 가능

&#x20;CLI는 runtime/cli에서만 사용

&#x20;작업폴더 오염 없음

&#x20;포터블 폴더 이동 후 재실행 가능

17. 최종 방향



Mamabot은 단순 챗봇이 아니라 포터블 개인 작업대다.



최종 형태:



폴더 하나 들고 다님

↓

start.bat 실행

↓

localhost:3200 접속

↓

작업폴더 선택

↓

모델 선택

↓

권한 모드 선택

↓

에이전트에게 작업 요청

↓

선택한 작업폴더 안에서만 작업


---

# Mamabot × Hermes Portable 작업 기록 - 20260511-230950

## 1. 현재까지 완료된 작업

### 1-1. Portable Hermes 설치 및 실행 구조
- Mamabot 내부 
untime/hermes/home/hermes-agent 경로에 Hermes Agent 설치 완료.
- WSL 내부에서 Hermes Dashboard 실행 확인.
- Windows localhost 127.0.0.1:9119 접근이 안 되는 문제 확인.
- WSL IP fallback 방식으로 http://172.x.x.x:9119 접근 성공.
- Mamabot 3200에서 Hermes 9119 API를 프록시하는 구조 구현 완료.

### 1-2. Hermes Native API Proxy 구현
- /api/hermes/native/[...path] 생성.
- Mamabot 3200에서 Hermes 공식 API 호출 가능.
- 확인된 API:
  - /api/hermes/native/status
  - /api/hermes/native/logs
  - /api/hermes/native/sessions
  - /api/hermes/native/skills
  - /api/hermes/native/cron/jobs
  - /api/hermes/native/model/info
  - /api/hermes/native/model/options
  - /api/hermes/native/env
  - /api/hermes/native/config/raw

### 1-3. Mamabot UI 대체 작업 진행
- Hermes Dashboard Bridge 화면 구성 완료.
- Hermes Native Mirror 추가 완료.
- Logs 메뉴를 Hermes 로그 API에 연결 완료.
- Sessions 메뉴를 Hermes 세션 API에 연결 완료.
- Skills 메뉴를 Hermes 스킬 API에 연결 완료.
- Automations / Cron 메뉴를 Hermes Cron API에 연결 완료.
- Models / Auth 메뉴를 Hermes model/env/oauth API에 연결 완료.
- Settings / Config 메뉴를 Hermes config.yaml 편집 화면으로 연결 완료.
- Sidebar 메뉴 한글화 완료.
- WorkspaceSelector / TopStatusBar / AgentPanel 한글 깨짐 수정 완료.

### 1-4. Workspace 구조
- 현재 작업 폴더:
  - F:\test\mama-v1.2
- WSL 변환 경로:
  - /mnt/f/test/mama-v1.2
- 작업 폴더에는 .hermes-workspace만 생성하는 방향으로 구성.
- Mamabot 본체와 Hermes runtime은 F:\test\mamabot 내부에 유지.

### 1-5. Hermes 실행 방식 확인
- Hermes CLI에서 -z / --oneshot 지원 확인.
- 실제 실행 명령 방향:
  - hermes -z "프롬프트"
- --provider, --model, --skills 옵션 사용 가능 확인.
- Mamabot /api/agent/run에서 dry-run / real-run 분기 구현.
- AgentPanel에 Dry-run 실행 버튼과 Hermes 실제 실행 버튼 추가.
- Model / Skills 선택 UI를 드롭다운 기반으로 개선.

## 2. 백업 상태

### 전체 백업
- 전체 백업 수행 완료.
- 백업 위치:
  - F:\test\_mamabot_backups\mamabot-full-20260511-212629
- Robocopy 결과:
  - 복사 파일: 약 77,255개
  - 복사 용량: 약 1.857GB
  - 실패: 0

### 컴포넌트 백업
- 주요 컴포넌트 수정 전 백업 위치:
  - F:\test\mamabot\backups\component-backups

### route 백업
- 주요 API route 수정 전 백업 위치:
  - F:\test\mamabot\backups\route-backups

## 3. 인증 상태

### OpenRouter API Key
- .env 저장 위치:
  - F:\test\mamabot\runtime\hermes\home\.env
- hermes status 기준:
  - OpenRouter API Key 인식 성공
  - Provider: OpenRouter
  - 현재 모델: openai/gpt-4o-mini

## 4. 현재 오류 상태

### 4-1. 이전 오류: OpenRouter 크레딧 / 토큰 요청 초과
- OpenRouter 호출은 성공했으나 HTTP 402 발생.
- 원인:
  - 요청 토큰 한도가 너무 큼.
  - OpenRouter 계정 크레딧 부족 또는 max_tokens/context 설정 과다.

### 4-2. 현재 오류: Hermes 최소 context window 요구치 미달
- 현재 오류 메시지:
  - Model openai/gpt-4o-mini has a context window of 4,096 tokens, which is below the minimum 64,000 required by Hermes Agent.
- 의미:
  - OpenRouter 인증은 성공했다.
  - Hermes 실제 실행도 시작됐다.
  - 하지만 선택한 모델의 context window가 Hermes Agent 최소 요구치인 64K보다 낮아서 중단됐다.
- 현재 문제는 코드 실행 구조 문제가 아니라 모델 선택 / context 설정 문제다.

## 5. 다음 해결 방향

### 우선순위 1: 64K 이상 context 모델 선택
- Hermes Agent는 최소 64K context window를 요구한다.
- 따라서 openai/gpt-4o-mini는 현재 Hermes 기준에서 부적합하다.
- 다음 단계에서는 OpenRouter에서 사용 가능한 64K 이상 모델 중 저렴한 모델을 선택해야 한다.

### 우선순위 2: config.yaml 정리
- 현재 config.yaml은 복구 후 정상 파싱됨.
- 모델 설정은 다음과 같은 방향으로 조정 예정:
  - provider: openrouter
  - default model: 64K 이상 context 모델
  - max_tokens: 낮은 값으로 제한

### 우선순위 3: Mamabot 모델 드롭다운 개선
- 현재 드롭다운에는 Hermes API에서 읽은 모델과 fallback 모델이 섞여 있음.
- 다음 개선 필요:
  - 64K 미만 모델은 경고 표시
  - 테스트용 저가 64K+ 모델 프리셋 추가
  - 모델 선택 시 provider와 model 자동 세팅
  - 실제 실행 전 모델 context 검증

### 우선순위 4: 실제 실행 재테스트
- 조건:
  - OpenRouter Key SET
  - 64K 이상 모델 선택
  - Suggest 모드
  - 파일 수정 금지 프롬프트 유지
- 테스트 프롬프트:
  - 이 프로젝트의 폴더 구조를 간단히 분석하고, 다음으로 구현할 작업 3가지만 제안해줘. 파일은 수정하지 마.

## 6. 현재 결론

Mamabot이 Hermes UI를 대체하는 C 방식의 기반은 상당 부분 구현 완료됐다.

현재 막힌 지점은 다음 하나다.

> Hermes 실제 실행 시 사용할 OpenRouter 모델이 Hermes 최소 context window 64K 조건을 만족해야 한다.

따라서 다음 작업은 모델 후보를 정리하고, Mamabot의 모델 선택 UI에 64K 이상 모델 중심의 추천 프리셋을 넣는 것이다.


---

# Hermes 실제 실행 성공 기록 - 20260511-234301

## 성공한 실행 조건

- Provider: OpenRouter
- Model: nvidia/nemotron-3-super-120b-a12b:free
- Mode: suggest
- Skills: hermes-agent,writing-plans
- Workspace:
  - Windows: F:\test\mama-v1.2
  - WSL: /mnt/f/test/mama-v1.2

## 결과

Mamabot의 Hermes 채팅 화면에서 실제 실행 버튼을 눌렀을 때 Hermes oneshot 실행이 성공했다.

실행 흐름:

1. Mamabot /api/agent/run 호출
2. WSL 내부에서 Hermes 환경변수 설정
3. 작업 폴더 /mnt/f/test/mama-v1.2로 이동
4. .hermes-workspace 확인/생성
5. hermes -z oneshot 실행
6. OpenRouter 무료 모델 호출
7. 응답을 Mamabot 화면에 출력
8. 로그 기준 END exitCode=0 확인

## 현재 남은 문제

### 로그 한글 깨짐

- 브라우저 출력은 정상 한글로 표시된다.
- PowerShell 실시간 로그에서는 일부 한글이 깨져 보인다.
- 실행 자체 문제는 아니며, 로그 출력 인코딩 문제로 추정된다.
- 다음 작업에서 PowerShell UTF-8 출력 설정 또는 Mamabot 내부 로그 뷰어를 개선할 예정이다.

## 다음 작업 후보

1. AgentPanel 안에 실시간 실행 로그 패널 추가
2. 실행 중 상태 표시 강화
3. 실행 결과를 세션처럼 저장
4. 성공/실패 이력 목록 추가
5. 모델별 64K 이상 여부와 무료/유료 태그 개선


---

# 다음 작업 플랜 - 새 창 이어서 작업용 - 20260511-235815

## 0. 현재 프로젝트 상태 요약

Mamabot은 현재 Hermes Agent를 포터블 방식으로 실행하기 위한 컨트롤러 역할을 한다.

현재 구조:

- Mamabot 위치:
  - F:\test\mamabot
- 작업 대상 프로젝트:
  - F:\test\mama-v1.2
- WSL 작업 경로:
  - /mnt/f/test/mama-v1.2
- Hermes runtime 위치:
  - F:\test\mamabot\runtime\hermes\home
- Hermes Agent 설치 위치:
  - F:\test\mamabot\runtime\hermes\home\hermes-agent
- Mamabot Web UI:
  - http://localhost:3200
- Hermes Native Dashboard:
  - WSL IP 기반 :9119

현재 성공한 핵심 실행 흐름:

1. Mamabot 3200 실행
2. 작업 폴더 선택
3. Windows 경로를 WSL 경로로 변환
4. .hermes-workspace 생성/확인
5. /api/agent/run 호출
6. WSL 내부에서 hermes -z oneshot 실행
7. OpenRouter 무료 모델 호출
8. Mamabot 화면에 결과 출력
9. 실행 로그 패널에 진행상태 표시

성공 확인된 모델:

- Provider: openrouter
- Model: 
vidia/nemotron-3-super-120b-a12b:free
- Mode: suggest
- Skills: hermes-agent,writing-plans
- 결과:
  - END exitCode=0
  - Hermes 실제 실행 성공

## 1. 현재 완료된 기능

### 1-1. Hermes 설치 / 실행

- Hermes Agent를 Mamabot 내부 runtime에 설치 완료.
- WSL 기반 실행 성공.
- Hermes Dashboard 9119 실행 확인.
- Windows localhost 접근 문제는 WSL IP fallback 방식으로 우회.

### 1-2. Hermes Native API Proxy

Mamabot에서 Hermes API를 프록시하는 구조 구현 완료.

구현된 API:

- /api/hermes/native/status
- /api/hermes/native/logs
- /api/hermes/native/sessions
- /api/hermes/native/skills
- /api/hermes/native/cron/jobs
- /api/hermes/native/model/info
- /api/hermes/native/model/options
- /api/hermes/native/env
- /api/hermes/native/config/raw
- /api/hermes/native/config
- /api/hermes/native/config/schema

### 1-3. Mamabot UI 대체 작업

완료된 메뉴:

- 대시보드
- Hermes 설정
- Hermes 대시보드
- Hermes 채팅
- 작업 폴더
- 모델 / 인증
- 스킬
- 자동화 / Cron
- 세션
- 로그
- 설정 / Config

### 1-4. Hermes 채팅

현재 Hermes 채팅 화면 기능:

- Provider 선택
- Permission Mode 선택
- 모델 인기순위 / 회사별 드롭다운
- 스킬 검색 / 선택 / 추가
- 프리셋 버튼:
  - 프로젝트 분석 프리셋
  - 디버깅 프리셋
  - 코딩 에이전트 프리셋
- Dry-run 실행
- Hermes 실제 실행
- 실행 결과 출력
- 실행 로그 패널 표시

### 1-5. 실행 로그

구현 완료:

- /api/agent/log
- AgentRunLogPanel.jsx
- 로그 파일:
  - F:\test\mamabot\runtime\hermes\logs\mamabot-agent-run.log
- 화면 안에서 로그 확인 가능.
- 자동갱신 ON/OFF 버튼 있음.
- 화면 비우기 버튼 있음.
- 최근 실행만 보기 개선 작업 진행 중.

## 2. 현재 남은 핵심 문제

### 2-1. 로그 한글 깨짐

상태:

- 브라우저의 Hermes 응답 출력은 한글 정상.
- PowerShell 또는 로그 파일 안에서는 일부 한글이 깨져 보임.
- 실행 자체에는 영향 없음.
- 원인 추정:
  - PowerShell 출력 인코딩
  - 로그 파일 append 시 UTF-8 처리
  - WSL stdout → Node spawn → fs append 과정의 인코딩 문제

다음 작업:

- 로그 저장 시 UTF-8 고정 확인
- PowerShell 실시간 로그는 chcp 65001 적용
- 가능하면 UI 로그에서는 원본 output보다 상태 로그 위주로 보여주기

### 2-2. 모델 context 문제

발생했던 문제:

- openai/gpt-4o-mini는 Hermes에서 4,096 context로 인식되어 실패.
- openrouter/free도 Hermes에서 4,096 context로 인식되어 실패.
- Hermes Agent는 최소 64K context를 요구함.

현재 해결:

- 
vidia/nemotron-3-super-120b-a12b:free 모델로 성공.
- config.yaml에 아래 값 추가됨:

`yaml
model:
  default: "openai/gpt-4o-mini"
  provider: "openrouter"
  context_length: 64000
  max_tokens: 512

주의:

기본 모델은 아직 openai/gpt-4o-mini로 표시될 수 있음.
실제 실행에서는 Mamabot UI에서 선택한 모델이 --model로 전달되므로 UI 선택값이 우선 적용됨.
기본 추천 모델은 앞으로 nvidia/nemotron-3-super-120b-a12b:free로 바꾸는 것이 좋음.
3. 다음 작업 우선순위
1순위. 실행 로그 UI 완성

목표:

PowerShell 로그창 없이 Mamabot 화면 안에서 실행 흐름을 명확히 볼 수 있게 한다.

해야 할 작업:

최근 실행만 보기 적용 확인
자동 스크롤 확인
실행 중 상태 표시 추가:
대기 중
요청 생성
WSL 실행 시작
Hermes 실행 중
모델 응답 수신
완료
실패
실패 시 에러만 따로 보여주는 영역 추가
exitCode 표시
실행 시간 표시
로그 한글 깨짐 최소화

관련 파일:

app/api/agent/log/route.js
app/components/AgentRunLogPanel.jsx
app/api/agent/run/route.js
2순위. 실행 결과 저장 / 다시 보기

목표:

Hermes 실행 결과를 runId 기준으로 저장하고 나중에 다시 볼 수 있게 만든다.

해야 할 작업:

실행 성공/실패 결과를 JSON 파일로 저장
저장 위치 예시:
runtime/hermes/runs/run-xxxxxxxx.json
저장할 정보:
runId
createdAt
provider
model
mode
skills
workspaceRoot
workspaceWsl
prompt
output
stderr
exitCode
durationMs
UI에 최근 실행 목록 추가
이전 실행 결과 다시 보기
결과 복사 버튼 추가
실패한 실행만 보기 필터 추가

관련 파일:

app/api/agent/run/route.js
새 API 후보:
app/api/agent/runs/route.js
app/api/agent/runs/[runId]/route.js
새 컴포넌트 후보:
AgentRunHistoryPanel.jsx
3순위. 모델 선택 UI 안정화

목표:

Hermes가 실행 가능한 모델만 안전하게 선택하도록 만든다.

해야 할 작업:

기본 추천 모델을 nvidia/nemotron-3-super-120b-a12b:free로 변경
openrouter/free는 현재 Hermes에서 4096 context로 인식되므로 추천순위에서 내리거나 경고 표시
64K 미만 모델은 경고 표시
모델 드롭다운에 표시할 정보 강화:
회사
인기순위
무료/저가/유료/고가
context 길이
Hermes 실행 가능 여부
모델 선택 시 provider 자동 설정
모델 선택 시 설명 박스 표시
실제 실행 전 모델 위험도 검사

관련 파일:

app/lib/modelPresets.js
app/components/AgentPanel.jsx
4순위. 권한 모드 실제 분리

현재 상태:

Suggest 모드는 프롬프트 앞에 파일 수정 금지 문구를 붙이는 방식.
실제 파일 수정 차단 기능은 아직 강하지 않음.

목표:

모드별로 실행 정책을 명확하게 분리한다.

모드 설계:

Suggest
분석/제안만 가능
파일 수정 금지
명령 실행 금지
기본 안전 모드
Edit
변경안 생성 가능
실제 적용 전 diff preview 필요
사용자가 승인해야 파일 수정
Auto
아직 잠금 유지 권장
나중에 백업 + 승인 + 제한 명령 환경에서만 사용

관련 파일:

app/api/agent/run/route.js
app/components/AgentPanel.jsx
5순위. 파일 수정 / 패치 승인 시스템

목표:

Hermes가 제안한 코드 변경을 바로 적용하지 않고, 사용자가 보고 승인한 뒤 적용하게 한다.

필요 기능:

Hermes에게 수정안 생성 요청
diff preview 표시
변경 파일 목록 표시
적용 전 자동 백업
승인 버튼
거절 버튼
적용 후 git diff 표시
롤백 버튼

새 API 후보:

app/api/agent/patch/preview/route.js
app/api/agent/patch/apply/route.js
app/api/agent/patch/rollback/route.js

새 컴포넌트 후보:

PatchPreviewPanel.jsx
PatchApprovalPanel.jsx
6순위. 포터블 안정화

목표:

다른 PC나 다른 드라이브로 옮겨도 최대한 깨지지 않게 만든다.

해야 할 작업:

하드코딩 경로 점검
WSL 배포판 이름 자동 탐지
현재는 Ubuntu 고정 가능성 있음
WSL 없을 때 안내
Hermes runtime 자동 탐지
Mamabot root 자동 계산 확인
다른 PC에서 첫 실행 점검 화면 만들기
start script 만들기

필요 스크립트 후보:

start-mamabot.ps1
stop-mamabot.ps1
doctor-mamabot.ps1
backup-mamabot.ps1
7순위. 백업 / 복구 메뉴

현재 상태:

전체 백업은 PowerShell로 수행 완료.
컴포넌트/route 백업도 자동 생성 중.

목표:

UI에서 백업과 복구를 할 수 있게 만든다.

기능 후보:

전체 백업 만들기
최근 백업 목록 보기
컴포넌트 백업 목록 보기
route 백업 목록 보기
특정 백업으로 복구
작업 전 자동 백업 ON/OFF

새 API 후보:

app/api/backup/list/route.js
app/api/backup/create/route.js
app/api/backup/restore/route.js

새 메뉴 후보:

Settings 안에 Backup 섹션
또는 별도 Backup 메뉴
8순위. Settings / Config 안전화

현재 상태:

config.yaml raw 편집 가능.
이전에 YAML 깨짐 발생한 적 있음.

목표:

config 편집을 안전하게 만든다.

해야 할 작업:

저장 전 YAML 문법 검사
저장 전 자동 백업
config 깨졌을 때 최근 백업 복구 버튼
기본 모델/provider/max_tokens/context_length는 폼으로 수정
raw config는 고급 모드로 숨기기
저장 후 hermes status 자동 실행하여 파싱 여부 확인

관련 파일:

app/components/SettingsPanel.jsx
app/api/hermes/native/config/raw
9순위. Hermes Chat UX 개선

현재 상태:

프롬프트 실행기 형태.
아직 일반 채팅 UI는 아님.

목표:

실제 채팅처럼 사용할 수 있게 만든다.

해야 할 작업:

사용자 메시지 / 에이전트 응답 카드 분리
Markdown 렌더링
코드블록 복사 버튼
이전 대화 유지
실행 중 취소 버튼
프롬프트 템플릿 버튼
“파일 수정 금지” 자동 태그 표시
응답 길이/토큰 안내
10순위. 문서화 / 최종 패키징

목표:

새 PC에서 바로 사용할 수 있게 문서와 스크립트를 정리한다.

해야 할 작업:

README.md 작성
PLAN.md 최신화
설치 가이드 작성
실행 가이드 작성
문제 해결 가이드 작성
다른 PC 이동 시 체크리스트 작성
start/stop/backup 스크립트 작성
4. 바로 다음 작업 추천

새 창에서 바로 이어서 작업할 경우, 아래 순서로 진행한다.

Step 1

실행 로그 패널 최신 버전 적용 확인.

확인할 파일:

app/api/agent/log/route.js
app/components/AgentRunLogPanel.jsx

확인할 기능:

최근 실행만 ON/OFF
자동갱신 ON/OFF
자동 스크롤
최신 runId 표시
Step 2

실행 결과 저장 기능 추가.

구현 목표:

runtime/hermes/runs 폴더 생성
runId별 JSON 저장
성공/실패 결과 저장
최근 실행 목록 API 생성
Step 3

모델 프리셋 정리.

수정할 파일:

app/lib/modelPresets.js

즉시 수정할 점:

기본 추천 1순위:
nvidia/nemotron-3-super-120b-a12b:free
openrouter/free는 Hermes에서 4096 context로 인식되므로 주의/경고 표시
64K 미만 모델은 경고 또는 숨김
5. 새 창에서 시작할 때 첫 질문 예시

새 ChatGPT 창에서는 아래처럼 말하면 된다.

F:\test\mamabot\PLAN.md 기준으로 이어서 작업하자. 현재 Hermes 실제 실행은 nvidia/nemotron-3-super-120b-a12b:free 모델로 성공했고, 다음 작업은 실행 결과 저장 / 최근 실행 목록 기능 추가야. PowerShell 명령어부터 줘.

6. 현재 결론

Mamabot은 현재 Hermes UI 대체 C 방식의 핵심 흐름이 성공했다.

남은 작업은 다음 단계다.

실행 로그를 사용자용으로 정리
실행 결과를 저장하고 다시 보기
모델 선택을 64K 이상 중심으로 안정화
Edit/Auto 모드를 안전하게 분리
패치 승인 시스템 추가
포터블 실행 스크립트와 문서화 완료

<!-- MAMABOT_PORTABLE_RECOVERY_20260512_BEGIN -->

# Mamabot Portable Recovery and Automation Log - 20260512

## 1. Current recovered state

Mamabot was moved to the office PC and several portable execution issues were fixed.

Current baseline:

```txt
Mamabot Root: F:\mamabot
WSL Root: /mnt/f/mamabot
WSL Distro: Ubuntu
Mamabot Web UI: http://localhost:3200
Hermes Dashboard: http://127.0.0.1:9119
Hermes Home: /mnt/f/mamabot/runtime/hermes/home
Hermes Agent: /mnt/f/mamabot/runtime/hermes/home/hermes-agent
Hermes Bin: /mnt/f/mamabot/runtime/hermes/home/hermes-agent/venv/bin/hermes
```

Verified working endpoints:

```txt
Hermes Dashboard /api/status: 200 OK
Mamabot /api/hermes/native/status: 200 OK
Mamabot /api/hermes/native/logs: 200 OK
Mamabot /api/hermes/native/skills: 200 OK
memorySync: used=true, synced=4
```

## 2. Issues found during portable migration

### 2-1. WSL distro hardcoding

Some code used Ubuntu-22.04, but the office PC uses Ubuntu.

Fix:
- Replaced Ubuntu-22.04 with Ubuntu.
- Future work: auto-detect WSL distro instead of hardcoding it.

### 2-2. Drive mount mismatch

Windows could see E:\mamabot or F:\mamabot, but WSL did not always see /mnt/e or /mnt/f correctly.

Fix:
- Final location changed to F:\mamabot.
- WSL path standardized as /mnt/f/mamabot.
- Start/doctor scripts now calculate the current drive automatically.

### 2-3. Python venv is not copy-portable

The Hermes Python venv had an old shebang path from the previous machine/location.

Example failure:
```txt
bad interpreter: /mnt/f/test/mamabot/.../python3: No such file or directory
```

Fix:
- Removed old venv.
- Rebuilt venv with Python 3.11.
- Reinstalled Hermes Agent with pip install -e .

### 2-4. Python version mismatch

The office WSL had Python 3.10.12, but Hermes Agent requires Python >= 3.11.

Fix:
- Installed python3.11, python3.11-venv, python3.11-dev.
- Rebuilt venv using python3.11 -m venv venv.

### 2-5. Dashboard dependencies missing

Hermes Dashboard failed with:

```txt
No module named 'fastapi'
```

Fix:
```bash
python -m pip install fastapi 'uvicorn[standard]' python-multipart sse-starlette jinja2 aiofiles
python -m pip install -e .
```

### 2-6. Dashboard host binding

Hermes Dashboard refused to bind to 0.0.0.0 for security reasons.

Fix:
- Use 127.0.0.1 instead of 0.0.0.0.
- Do not use --insecure.

Final dashboard command:
```bash
hermes dashboard --no-open --host 127.0.0.1 --port 9119
```

### 2-7. Native proxy token issue

Mamabot /api/hermes/native/status worked, but logs and skills returned 401 Unauthorized.

Cause:
- Hermes protected APIs require x-hermes-session-token.
- The simplified localhost proxy removed the old token extraction logic.

Fix:
- app/api/hermes/native/[...path]/route.js now proxies to http://127.0.0.1:9119.
- It extracts __HERMES_SESSION_TOKEN__ from the dashboard HTML.
- It attaches x-hermes-session-token automatically.

## 3. New scripts added

### 3-1. Doctor script

Files:
```txt
scripts/portable/doctor-mamabot.ps1
doctor-mamabot.bat
```

Responsibilities:
- Auto-detect Mamabot root.
- Auto-detect WSL distro.
- Check WSL drive mount.
- Check Hermes home and agent folders.
- Check Python 3.11.
- Check Hermes venv path.
- Rebuild venv when needed.
- Check Hermes status.
- Check Dashboard API.

Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\portable\doctor-mamabot.ps1 -Repair
```

### 3-2. Start script

Files:
```txt
scripts/portable/start-mamabot.ps1
start-mamabot.bat
```

Responsibilities:
- Run doctor repair first.
- Start Hermes Dashboard.
- Reuse existing Dashboard if 127.0.0.1:9119 is already alive.
- Start Mamabot Next.js server.

Run:
```powershell
.\start-mamabot.bat
```

or:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\portable\start-mamabot.ps1
```

## 4. Start script improvement

Previous behavior:
- Killed an already working Dashboard with pkill.
- Tried to restart it.
- If restart failed, native proxy returned 500.

New behavior:
- Check http://127.0.0.1:9119/api/status first.
- If 200 OK, reuse the running Dashboard.
- Start a new Dashboard only when it is not running.
- Do not kill a healthy Dashboard.

## 5. Current execution baseline

```txt
Mamabot root: F:\mamabot
WSL root: /mnt/f/mamabot
Dashboard host: 127.0.0.1
Dashboard port: 9119
Mamabot port: 3200
Hermes Python: 3.11.x
Hermes venv: runtime/hermes/home/hermes-agent/venv
```

## 6. Next portable stabilization tasks

### 6-1. Improve start/doctor scripts

- Add WSL distro selection when multiple distros exist.
- Add confirmation before installing Python 3.11.
- Show dashboard failure log in the UI.
- Auto-test native/status, native/logs, and native/skills.
- Print cause-specific recovery messages.

### 6-2. Add portable status panel in UI

Display:
- WSL distro
- WSL path access
- Python version
- Hermes venv status
- Dashboard status
- Native proxy status
- OpenRouter key status

### 6-3. Define venv recovery rules

```txt
venv/bin/hermes missing -> rebuild venv
shebang path mismatch -> rebuild venv
python version < 3.11 -> install or guide Python 3.11
fastapi import failure -> reinstall Dashboard dependencies
```

### 6-4. Define native proxy policy

```txt
baseUrl: http://127.0.0.1:9119
status API: public
logs/skills/sessions API: attach x-hermes-session-token
WSL IP fallback: only as secondary fallback
```

## 7. Current priority

1. Final test start/doctor scripts.
2. Stabilize run result saving and recent run history.
3. Change default model to nvidia/nemotron-3-super-120b-a12b:free.
4. Add 64K context warning to model selector.
5. Separate Suggest/Edit/Auto modes safely.
6. Add patch approval system.

<!-- MAMABOT_PORTABLE_RECOVERY_20260512_END -->

<!-- MAMABOT_WORKLOG_AND_NEXT_STEPS_20260512_BEGIN -->

# Mamabot Worklog and Resume Plan - 20260512

This section is the current working map.  
If the chat context is lost, read this section first and continue from here.

## 1. Current project baseline

```txt
Mamabot root: F:\mamabot
WSL root: /mnt/f/mamabot
Web UI: http://localhost:3200
Hermes Dashboard: http://127.0.0.1:9119
Hermes Home: F:\mamabot\runtime\hermes\home
Hermes Agent: F:\mamabot\runtime\hermes\home\hermes-agent
Claude local CLI: F:\mamabot\runtime\cli
Claude local home target: F:\mamabot\runtime\claude-home
Plan file: F:\mamabot\plan.md
```

## 2. Completed work

### 2-1. Portable recovery

Completed:
- Recovered Hermes Dashboard on 127.0.0.1:9119.
- Fixed native proxy to call http://127.0.0.1:9119.
- Restored x-hermes-session-token handling for protected Dashboard APIs.
- Confirmed:
  - /api/hermes/native/status = 200
  - /api/hermes/native/logs = 200
  - /api/hermes/native/skills = 200
- Added:
  - scripts/portable/doctor-mamabot.ps1
  - scripts/portable/start-mamabot.ps1
  - doctor-mamabot.bat
  - start-mamabot.bat
- Patched start script to reuse an already-running Dashboard instead of killing it.

### 2-2. Run history stabilization

Completed:
- Improved app/lib/runStore.js.
- Added memorySync into saved run records.
- Rebuilt run index support.
- Added filtering:
  - status
  - dryRun
  - provider
  - query
- Confirmed run history UI shows recent runs and details.

Relevant files:
```txt
app/lib/runStore.js
app/api/agent/runs/route.js
app/api/agent/runs/[runId]/route.js
app/components/AgentRunHistoryPanel.jsx
```

### 2-3. Model/Auth screen cleanup

Completed:
- Reordered Models/Auth screen:
  1. Environment variables / API Key
  2. OAuth Providers
  3. CLI Agents
  4. Collapsible model info panels
- Added collapsible JSON panels for:
  - current model info
  - model options
  - auxiliary models
- Moved Claude Code out of OAuth Providers.
- Kept OpenAI Codex in OAuth Providers.
- Added Claude Code under CLI Agents.

Relevant files:
```txt
app/components/ModelsPanel.jsx
app/api/hermes/auth/start/route.js
app/api/cli/claude/status/route.js
app/api/cli/claude/start/route.js
```

### 2-4. OpenAI Codex authentication

Completed:
- OpenAI Codex device-code login succeeded.
- Current Hermes model info showed:
  - provider: openai-codex
  - model: gpt-5.5
- OAuth status API showed openai-codex logged_in: true.

Important note:
- Codex authentication is handled through Hermes provider/model setup.
- Codex belongs in OAuth Providers.

### 2-5. Claude Code local CLI installation

Completed:
- Installed Claude Code into Mamabot local runtime:
```txt
F:\mamabot\runtime\cli
```

Confirmed:
```txt
/mnt/f/mamabot/runtime/cli/node_modules/.bin/claude
Claude Code version: 2.1.139
```

Important note:
- Claude Code is not a Hermes OAuth provider in this UI.
- Treat it as a CLI Agent.
- Claude Code login/execution must use Mamabot-local runtime paths.

### 2-6. Global Claude import issue

Issue:
- Claude Code kept importing global files from:
```txt
F:\.claude
/mnt/f/.claude
```

Action completed:
- Disabled global F:\.claude\CLAUDE.md.
- Moved backup into:
```txt
F:\mamabot\backups\external-claude-global\20260512-133005
```

Current result:
- Global /mnt/f/.claude imports disappeared.
- Remaining imports are Mamabot-local:
```txt
/mnt/f/mamabot/.claude/COMMANDS.md
/mnt/f/mamabot/.claude/FLAGS.md
/mnt/f/mamabot/.claude/PRINCIPLES.md
/mnt/f/mamabot/.claude/RULES.md
/mnt/f/mamabot/.claude/MCP.md
/mnt/f/mamabot/.claude/PERSONAS.md
/mnt/f/mamabot/.claude/ORCHESTRATOR.md
/mnt/f/mamabot/.claude/MODES.md
```

This is acceptable if the current Claude Code working directory is Mamabot root.  
If it still appears as external, adjust the Claude Code working directory.

### 2-7. OpenRouter live model list and favorites

Completed:
- Added OpenRouter live models API.
- Added model favorites API.
- OpenRouter live model count confirmed:
```txt
count: 365
source: cache
```

Added:
```txt
app/api/models/openrouter/route.js
app/api/models/favorites/route.js
config/model-favorites.json
```

Partially completed:
- AgentPanel model selector now has:
  - live model search
  - refresh latest models button
  - favorites-only toggle
  - favorite add/remove button
- Favorite mark was changed from plain star to emoji star:
```txt
?
```

## 3. Current known state

### OpenRouter models API

Check:
```powershell
$models = Invoke-RestMethod "http://localhost:3200/api/models/openrouter"
$models | Select-Object ok, source, cachedAt, count
```

Expected:
```txt
ok: True
count: around 365
```

### Favorites API

Check:
```powershell
$favs = Invoke-RestMethod "http://localhost:3200/api/models/favorites"
$favs | Select-Object ok, count, favorites
```

Expected:
```txt
ok: True
count: 0 or more
```

### Codex status

Check:
```powershell
curl.exe -s http://localhost:3200/api/hermes/native/providers/oauth
curl.exe -s http://localhost:3200/api/hermes/native/model/info
```

Expected:
```txt
openai-codex status.logged_in: true
model/info provider may be openai-codex
```

### Claude Code status

Check:
```powershell
curl.exe -s http://localhost:3200/api/cli/claude/status
```

Expected:
```txt
installed: true
version: 2.1.139 or newer
connected: true/false depending on login
```

## 4. Remaining work

### Priority 1. Finish model selector UX

Need to verify:
- Select option shows:
```txt
? Model Name - tier - context N - model/id
```
- Favorite button uses:
```txt
? add/remove
```
- Favorites-only toggle filters correctly.
- Search filters by:
  - model id
  - model label
  - free/paid tier
  - coder/claude/gpt/nemotron keyword
- Refresh latest models button works without breaking selection.
- Existing hardcoded recommended model still works.

Files:
```txt
app/components/AgentPanel.jsx
app/api/models/openrouter/route.js
app/api/models/favorites/route.js
```

### Priority 2. Fix selected model detail panel

Need to confirm:
- The detail panel reads selectedModelInfo, not only selectedPreset.
- Live OpenRouter models show:
  - id
  - label/name
  - context length
  - tier
  - source=openrouter-live
  - warning if context < 64K

### Priority 3. Separate default Hermes model vs run-time selected model

Current risk:
- Running hermes model changed default provider/model to Codex.
- Mamabot UI should make it clear:
  - Hermes default model
  - selected run model
  - custom model
  are different.

Needed UI:
```txt
Current Hermes default:
provider/model from /api/hermes/native/model/info

Run override:
provider/model selected in AgentPanel
```

### Priority 4. Claude Code CLI Agent

Need to finish:
- Claude Code login status detection.
- Start Claude Code in selected workspace, not as OAuth provider.
- Avoid F:\.claude global dependency.
- Keep Mamabot-local:
```txt
F:\mamabot\runtime\cli
F:\mamabot\runtime\claude-home
F:\mamabot\.claude
F:\mamabot\CLAUDE.md
```

### Priority 5. Update plan after each patch

After each meaningful patch:
1. Make a quick backup.
2. Apply patch.
3. Run minimal tests.
4. Add result to this plan section.

## 5. How to resume work from this plan only

When continuing after losing chat context, follow this checklist.

### Step 1. Start Mamabot

```powershell
cd F:\mamabot
.\start-mamabot.bat
```

or:

```powershell
cd F:\mamabot
powershell -ExecutionPolicy Bypass -File .\scripts\portable\start-mamabot.ps1
```

### Step 2. Confirm health

```powershell
curl.exe -i http://127.0.0.1:9119/api/status
curl.exe -i http://localhost:3200/api/hermes/native/status
curl.exe -i http://localhost:3200/api/hermes/native/skills
curl.exe -i "http://localhost:3200/api/hermes/native/logs?lines=20"
```

Expected:
```txt
200
200
200
200
```

### Step 3. Check current target task

Read this section:
```txt
MAMABOT_WORKLOG_AND_NEXT_STEPS_20260512
```

Then continue from:
```txt
Remaining work -> Priority 1
```

### Step 4. Before patching

For small UI/API patches:
```powershell
cd F:\mamabot

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "backups\quick\$stamp"

New-Item -ItemType Directory -Force $backup | Out-Null
Copy-Item "app\components\AgentPanel.jsx" $backup -Force -ErrorAction SilentlyContinue
Copy-Item "app\components\ModelsPanel.jsx" $backup -Force -ErrorAction SilentlyContinue
Copy-Item "plan.md" $backup -Force -ErrorAction SilentlyContinue

Write-Host "QUICK BACKUP DONE: $backup" -ForegroundColor Green
```

For external config changes:
```txt
Use F:\mamabot\backups\external-<target>\<timestamp>
Always create BACKUP_INFO.txt.
```

### Step 5. After patching

Restart:
```powershell
cd F:\mamabot
npm run dev
```

Minimal tests:
```powershell
Invoke-RestMethod "http://localhost:3200/api/models/openrouter" | Select-Object ok, source, count
Invoke-RestMethod "http://localhost:3200/api/models/favorites" | Select-Object ok, count, favorites
curl.exe -s http://localhost:3200/api/cli/claude/status
curl.exe -s http://localhost:3200/api/hermes/native/providers/oauth
```

### Step 6. UI smoke test

Open:
```txt
http://localhost:3200
```

Check:
```txt
1. AgentPanel model selector loads live OpenRouter models.
2. Search works.
3. Favorite add/remove works.
4. Favorites-only toggle works.
5. Models/Auth shows:
   - OpenAI Codex under OAuth Providers
   - Claude Code under CLI Agents
6. Run history still loads.
```

## 6. Next exact task

Continue with:

```txt
Finish AgentPanel live model selector polish.
```

Exact items:
```txt
1. Confirm ? displays correctly in select options.
2. Confirm favorites save to config/model-favorites.json.
3. Confirm favorites-only view filters the select list.
4. Confirm selected live model detail panel does not crash.
5. Add warning for context length under 64K.
6. Add source badge: preset / openrouter-live / preset+live.
```

<!-- MAMABOT_WORKLOG_AND_NEXT_STEPS_20260512_END -->

<!-- MAMABOT_COMMAND_WORKFLOW_20260512_BEGIN -->

# Mamabot Command Writing Protocol - 20260512

This section defines how commands should be created and given when continuing Mamabot work.

## 1. Default work order

Always work in this order:

1. Inspect exact current file/state.
2. Make a small targeted backup.
3. Patch only the required files.
4. Verify by printing the exact changed lines.
5. Restart only when needed.
6. Run minimal API/UI tests.
7. Update plan.md after meaningful progress.

Do not guess file structure when a command can inspect it.
Do not give a large rewrite when a narrow patch is enough.

## 2. Inspection command style

Use focused commands that show only the needed section.

Example:

~~~powershell
cd F:\mamabot

$lines = Get-Content "app\components\AgentPanel.jsx" -Encoding UTF8
for ($i = 360; $i -le 430; $i++) {
  "{0,4}: {1}" -f $i, $lines[$i-1]
}
~~~

Avoid dumping huge files unless the raw full file is needed.

## 3. UTF-8 and search rules

Use UTF-8 when reading project files:

~~~powershell
Get-Content "plan.md" -Encoding UTF8
Select-String -Path "plan.md" -Pattern "keyword" -Encoding UTF8
~~~

Use -SimpleMatch when searching literal characters like ?, *, [, ], or emoji.

~~~powershell
Select-String -Path "app\components\AgentPanel.jsx" -Pattern "????","?","????" -SimpleMatch -Encoding UTF8
~~~

## 4. Backup rules

For normal code patches, back up only touched files:

~~~powershell
cd F:\mamabot

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "backups\quick\$stamp"

New-Item -ItemType Directory -Force $backup | Out-Null
Copy-Item "app\components\AgentPanel.jsx" $backup -Force -ErrorAction SilentlyContinue
Copy-Item "app\components\ModelsPanel.jsx" $backup -Force -ErrorAction SilentlyContinue
Copy-Item "plan.md" $backup -Force -ErrorAction SilentlyContinue

Write-Host "QUICK BACKUP DONE: $backup" -ForegroundColor Green
~~~

For external config changes, use:

F:\mamabot\backups\external-<target>\<timestamp>

External backups must include BACKUP_INFO.txt with source, destination, reason, and restore instruction.

## 5. Patch command rules

Prefer Node patch scripts for multi-line edits.

Patch script template:

~~~powershell
cd F:\mamabot

@'
const fs = require("fs");
const path = require("path");

const file = "app/components/AgentPanel.jsx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join("backups", "patch-name", stamp);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(file, path.join(backupDir, "AgentPanel.jsx.bak"));

let text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");

// patch here

fs.writeFileSync(file, text, "utf8");
console.log("patched file");
console.log("backup:", backupDir);
'@ | node
~~~

Do not use fragile Korean labels as the only anchor.
Prefer structural anchors:

- value={model}
- combinedModelOptions.map
- function buildClaudePs
- export async function GET

If an anchor is not found, inspect exact lines first.

## 6. Korean UI text rules

Korean text can break in PowerShell/Node heredoc flows.
For JSX strings, prefer Unicode escapes when the text may pass through scripts.

Examples:

~~~jsx
{"\uC778\uC99D \uC2DC\uC791"}  // ?? ??
{"\uC0C8\uB85C\uACE0\uCE68"}  // ????
{"\uC990\uACA8\uCC3E\uAE30"}  // ????
{"\u2B50"}                       // ?
~~~

After patching Korean UI text, verify in the browser.

## 7. WSL command rules

Do not run Linux commands directly in PowerShell.

Wrong:

~~~powershell
export HOME=/mnt/f/mamabot/runtime/hermes/home
cd /mnt/f/mamabot/runtime/hermes/home
~~~

Right:

~~~powershell
wsl -d Ubuntu -u root -e bash -lc "export HOME=/mnt/f/mamabot/runtime/hermes/home; cd /mnt/f/mamabot/runtime/hermes/home; pwd"
~~~

For complex UI-launched commands, generate a temporary .ps1 launcher under:

F:\mamabot\runtime\hermes\logs

Then open it with cmd.exe /c start powershell.exe.

## 8. Portable dependency rules

Do not use global installs when the project needs portability.

Use local paths:

- Claude Code CLI: F:\mamabot\runtime\cli
- Claude Code home/config: F:\mamabot\runtime\claude-home
- Hermes home: F:\mamabot\runtime\hermes\home
- Mamabot config: F:\mamabot\config

Avoid:

- F:\.claude dependency
- global npm install dependency
- hardcoded old path such as F:\test\mama-v1.2

## 9. API test rules

After creating or editing an API route, test only that route first.

~~~powershell
Invoke-RestMethod "http://localhost:3200/api/models/openrouter" | Select-Object ok, source, count
Invoke-RestMethod "http://localhost:3200/api/models/favorites" | Select-Object ok, count, favorites
curl.exe -s http://localhost:3200/api/cli/claude/status
curl.exe -s http://localhost:3200/api/hermes/native/providers/oauth
~~~

If the output is too long, summarize it before asking the user to paste it.

## 10. UI test rules

After UI patches, check only the changed area.

Example checklist:

1. Does the model select load?
2. Does search filter the list?
3. Does ? appear for favorite models?
4. Does favorites-only hide non-favorites?
5. Does selecting a live model update provider/model correctly?

Do not move to the next feature until the current UI smoke test passes.

## 11. Plan update rules

After meaningful progress, update plan.md with:

- what changed
- files changed
- test commands
- test result
- known issue
- next exact task

Use marker-based sections so updates are safe:

<!-- SECTION_NAME_BEGIN -->
...
<!-- SECTION_NAME_END -->

## 12. Current command style preference

User prefers:

- concise explanation
- then exact commands
- commands focused on current task
- no unnecessary full backups
- no huge dumps unless needed
- quick verification after each patch
- portable-first structure

<!-- MAMABOT_COMMAND_WORKFLOW_20260512_END -->

<!-- MAMABOT_GIT_BACKUP_POLICY_20260513_BEGIN -->

# Git / ZIP Backup Policy - 2026-05-13

## 1. Current project root

The active Mamabot project root is:

~~~txt
F:\mamabot
~~~

All PowerShell work should begin with:

~~~powershell
cd F:\mamabot
~~~

## 2. Git and ZIP have different roles

Mamabot is a portable project, but Git and ZIP should not be used for the same purpose.

Git is for source-code version control and safe recovery during development.

ZIP is for portable runtime backup and moving the working folder to another PC.

## 3. What Git should track

Git should track source and reproducible project files:

- app/
- config/ shared config files
- scripts/
- skills/
- docs/
- package.json
- package-lock.json
- next.config.js
- portable.config.json
- README.md
- CLAUDE.md
- plan.md
- checklist documents
- start / stop / doctor scripts

Git should not track local runtime data:

- runtime/
- backups/
- node_modules/
- .next/
- logs/
- runs/
- workspaces/
- secrets/
- memory/
- .hermes-workspace/
- .claude/
- local reference materials

Important rule:

- Root runtime/ is kept inside the portable folder, but is not tracked by Git.
- Source folders such as app/api/runtime, app/api/logs, app/api/memory, and app/api/agent/runs must be tracked by Git.
- Secrets and memory are local/private data and must not be tracked.

## 4. ZIP backup policy

There are two backup types.

### Source ZIP

Used for lightweight source backup.

Include:

- app/
- config/
- scripts/
- skills/
- docs/
- package.json
- package-lock.json
- README.md
- plan.md
- start / stop / doctor scripts

Exclude:

- runtime/
- node_modules/
- .next/
- backups/
- logs/
- runs/
- secrets/
- memory/

### Portable Runtime ZIP

Used for moving the working portable app to another PC.

Include:

- app/
- config/
- scripts/
- skills/
- docs/
- runtime/
- package.json
- package-lock.json
- start / stop / doctor scripts

Exclude:

- backups/
- .next/
- logs/
- runs/
- node_modules/ unless intentionally preserving installed dependencies
- secrets/ unless this is a private personal backup only

## 5. Work procedure

Before changing code:

1. Run git status --short.
2. Back up target files to backups/manual/.
3. Record the task goal and target files in plan.md.
4. Make the smallest safe change.

After changing code:

1. Run a syntax/build check when possible.
2. Test in the browser.
3. Review git diff.
4. Commit meaningful units.
5. Create a ZIP backup only when needed.

## 6. Current next task

ConversationSidebar already handles sessions and run history.

Current flow:

1. User clicks a run in ConversationSidebar.
2. ConversationSidebar calls onSelectRun(runId).
3. AppShell stores activeRunId.
4. AppShell switches to dashboard.
5. DashboardPanel passes activeRunId to WorkbenchPanel.
6. WorkbenchPanel passes activeRunId to WorkbenchChatPanel.
7. WorkbenchChatPanel loads /api/agent/runs/{runId}.

Next work should not create a new sidebar. It should verify and improve the existing Workbench restoration flow.

Priority:

1. Track app/api/hermes/auth/start/route.js because it is a real source route.
2. Keep the removed root route.js out of Git because it was a broken stray file.
3. Keep local reference materials out of Git.
4. Browser-test whether clicking a run restores prompt, model, skills, mode, and output in Workbench.
5. If restoration is incomplete, patch only WorkbenchChatPanel.loadRun().
6. Commit the verified source changes.
7. Add ZIP backup scripts later.

<!-- MAMABOT_GIT_BACKUP_POLICY_20260513_END -->

<!-- MAMABOT_STATUS_FIX_20260513_BEGIN -->

# 실행 상태 판정 보정 기록 - 2026-05-13

## 문제

Hermes oneshot 실행이 exitCode 0으로 종료되더라도 실제 output 안에 Provider/API 실패 메시지가 들어가는 경우가 있었다.

확인된 예시:

- HTTP 402
- Prompt tokens limit exceeded
- API call failed after 3 retries

이 경우 기존 로직은 exitCode 0만 보고 status를 success로 저장했다.  
그 결과 UI에서는 실제 실패인데도 "작업 완료" 토스트가 표시되었다.

## 수정 내용

수정 파일:

- app/api/agent/run/route.js

추가한 처리:

- getLogicalHermesError(output, stderr) 함수 추가
- output/stderr 안에서 다음 패턴을 감지
  - API call failed
  - HTTP 402
  - Prompt tokens limit exceeded
  - tokens limit exceeded
  - credit
  - rate limit
  - context window
  - minimum 64000
- exitCode가 0이어도 logicalError가 있으면 status를 failed로 저장
- error 필드에 실제 Provider/API 실패 메시지를 저장

## 기존 이력 보정

기존 문제 run도 수동 보정했다.

- runId: run-1778670172921
- 기존 status: success
- 수정 status: failed
- 기존 ok: true
- 수정 ok: false
- error: API call failed after 3 retries: HTTP 402: Prompt tokens limit exceeded

단, runtime/hermes/runs 안의 실행 이력은 Git에 포함하지 않는다.  
Git에는 소스 수정만 커밋한다.

## 다음 작업

1. 브라우저에서 같은 실패 상황이 다시 "작업 실패"로 표시되는지 확인한다.
2. RunCompletionToast가 failed status를 제대로 보여주는지 확인한다.
3. 그 다음 토큰 초과 자체를 줄이기 위해 짧은 응답 모드 / 스킬 최소화 / memory context 축소 작업을 진행한다.

<!-- MAMABOT_STATUS_FIX_20260513_END -->

<!-- MAMABOT_BACKUP_LOCATION_FIX_20260513_BEGIN -->

# Backup Location Fix - 2026-05-13

## Problem

Next.js build scanned the project-root backups/ folder and failed with EACCES while trying to access a broken Hermes Python venv backup.

Example failure path:

~~~txt
F:\mamabot\backups\broken-hermes-venv-20260512-184729\venv.broken\bin\python
~~~

## Decision

Large backup folders must not stay inside the Next.js project root.

New rule:

- Project root: F:\mamabot
- Large/manual backup root: F:\_mamabot_backups
- Git repository tracks source only.
- ZIP backups are created outside the project root.
- Project-root backups/ may exist only as a small temporary folder, but large runtime/venv/project backups must be moved outside.

## Why

.gitignore prevents Git tracking, but it does not prevent Next.js build from scanning folders during build/file tracing.

Therefore, large backup folders inside F:\mamabot can still break builds even if ignored by Git.

## Updated work rule

Before risky edits:

1. Create backup under F:\_mamabot_backups.
2. Keep only source files inside F:\mamabot.
3. Do not store copied venv, node_modules, runtime snapshots, or full project backups inside F:\mamabot.
4. Run next build only after large backup folders are outside the project root.

<!-- MAMABOT_BACKUP_LOCATION_FIX_20260513_END -->

<!-- MAMABOT_HERMES_USAGE_STRATEGY_20260513_BEGIN -->

# Mamabot Hermes Usage Strategy - 2026-05-13

## 1. 핵심 결론

Mamabot은 Hermes를 단순 채팅 모델처럼 호출하면 안 된다.

Hermes는 skills, memory, session, tool context, dashboard/gateway 기능이 강력한 대신, 짧은 요청에도 불필요한 컨텍스트가 붙으면 input token이 크게 증가한다.

따라서 Mamabot은 모든 요청을 같은 방식으로 실행하지 않고, 요청 목적에 따라 Execution Profile을 분리한다.

## 2. Execution Profile 설계

### 2-1. Quick Mode

목적:

- 인사
- 짧은 질문
- 단순 확인
- 짧은 답변 요청

정책:

- skills 기본값 비움
- toolsets 비움
- session prompt 생략
- memory sync 생략 또는 최소화
- responseStyle short 기본
- run JSON에 executionProfile: quick 저장
- contextPolicy: minimal 저장

사용 예:

- 안녕
- 오늘 상태 어때?
- 이거 한 줄로 정리해줘
- 지금 뭐부터 하면 돼?

### 2-2. Agent Mode

목적:

- 작업 계획
- 프로젝트 분석
- 문제 원인 파악
- 다음 작업 정리

정책:

- 기본 skills는 hermes-agent 정도만 허용
- writing-plans는 사용자가 명시적으로 선택할 때만 사용
- session prompt는 제한적으로 사용
- memory는 필요할 때만 사용
- responseStyle normal 기본
- executionProfile: agent 저장
- contextPolicy: balanced 저장

### 2-3. Coding Mode

목적:

- 코드 수정
- 오류 해결
- 파일 패치
- 리팩터링

정책:

- software-development, debugging 계열 skills를 명시적으로 선택
- 계획 → 승인 → 수정 → 검증 순서 강제
- 파일 수정 전 백업
- 위험 명령 차단
- tool output 제한
- emergency brake 활성화
- executionProfile: coding 저장
- contextPolicy: full 저장

### 2-4. Review Mode

목적:

- 코드 리뷰
- 다른 모델 관점의 교차 검토
- 아키텍처 검토
- PR 전 점검

정책:

- 파일 수정 금지
- 읽기 중심
- 결과는 지적/개선안 위주
- Codex/Claude 교차 리뷰를 나중에 연결
- executionProfile: review 저장
- contextPolicy: review-only 저장

### 2-5. Automation Mode

목적:

- cron 작업
- MCP 연동
- Telegram / gateway 자동화
- 정기 리서치
- 보고서 자동 생성

정책:

- 항상 승인 기반
- 외부 제어는 기본 차단
- always allow 금지
- needs approval 기본
- 예약 작업은 실행보드에서 확인 가능해야 함
- executionProfile: automation 저장
- contextPolicy: approved-task 저장

## 3. Hermes 절약 설정 방향

Hermes Dashboard / config.yaml에서 나중에 관리할 최적화 후보:

- max_turns: 90보다 낮은 값, 우선 60 기준
- reasoning_effort: medium 기준
- file_read_max_chars: 100k보다 낮게, 우선 50k 기준
- tool_output_max_bytes 축소
- tool_output_max_lines 축소
- tool_output_max_line_length 축소
- emergency_brakes ON
- 반복 실패 hard stop
- cache_ttl: 5분보다 길게, 우선 1시간 후보

단, 이 값들은 바로 하드코딩하지 않는다. 먼저 현재 Hermes config 구조를 확인하고, Settings / Config 화면에서 안전하게 편집할 수 있게 만든다.

## 4. Skills 운영 원칙

기본 skills는 비워둔다.

스킬은 많이 켜는 것이 아니라, 작업 목적에 맞는 것만 명시적으로 선택한다.

운영 원칙:

- GitHub star 수만 보고 설치하지 않는다.
- 검증되지 않은 skills/plugin은 기본 활성화하지 않는다.
- prompt injection 가능성이 있는 README / install script를 조심한다.
- 매일 쓰는 검증된 스킬만 추천 목록에 올린다.
- skills 자동 적용 금지
- 사용자가 직접 선택하거나, Execution Profile이 명확할 때만 제안한다.

우선 추천 흐름:

- Quick: no skills
- Agent: hermes-agent
- Coding: hermes-agent + software-development 또는 debugging
- Review: code-review / architecture-review 성격
- Automation: cron/gateway 관련 skill만 승인 후 사용

## 5. Dashboard / 실행보드 방향

Mamabot 실행보드는 Hermes Dashboard의 핵심을 흡수한다.

반영할 항목:

- Sessions
- Analytics
- Logs
- Cron
- Skills
- Profiles
- Config
- Usage tracking
- Model usage
- Token usage
- Top skills
- Failure runs

실행보드는 단순 로그 뷰어가 아니라, 어떤 프로필이 얼마나 토큰을 쓰는지 확인하고 조정하는 관리 화면이 되어야 한다.

## 6. MCP / 외부 제어 정책

Claude / MCP / Telegram / gateway 연동은 장기적으로 유용하지만, 기본값은 차단한다.

정책:

- 외부 제어 always allow 금지
- needs approval 기본
- cron 생성, 파일 수정, 명령 실행은 승인 필요
- 승인 대기 작업을 실행보드에 표시
- 승인 기록을 run JSON 또는 별도 approval log에 저장
- 외부 요청은 executionProfile: automation으로 분류

## 7. 현재 바로 적용할 작업

현재 이미 적용한 1차 패치:

- WorkbenchChatPanel 기본 skills를 비움
- shouldUseLightweightPrompt() 추가
- short/light 모드 + 짧은 요청 + skills/toolsets 없음이면 session prompt 생략
- output/stderr 안의 Provider/API 실패를 failed로 판정

다음 작업:

1. lightweightPrompt 임시 로직을 executionProfile 정식 구조로 승격한다.
2. Workbench UI에 Quick / Agent / Coding / Review / Automation 선택 UI를 추가한다.
3. /api/agent/run 요청 body에 executionProfile을 추가한다.
4. run JSON에 executionProfile, contextPolicy, sessionContextUsed, memorySyncUsed를 저장한다.
5. Quick Mode에서는 memorySync와 buildSessionPrompt를 생략한다.
6. Agent/Coding Mode에서만 session/memory/skills를 사용한다.
7. 브라우저에서 "안녕" 테스트로 토큰 초과가 줄어드는지 확인한다.
8. 실패해도 status failed로 저장되는지 다시 확인한다.

## 8. 장기 구조

Mamabot의 최종 방향:

Mamabot = Hermes를 예쁘게 감싼 채팅창이 아니다.

Mamabot = Hermes 실행보드 + 안전한 작업 프로필 관리자 + 포터블 개인 작업대다.

<!-- MAMABOT_HERMES_USAGE_STRATEGY_20260513_END -->

<!-- MAMABOT_REFERENCE_FEATURE_BACKLOG_20260513_BEGIN -->

# Mamabot Reference Feature Backlog - 2026-05-13

이 섹션은 Hermes / Claude MCP / Claude Code 참고 자료에서 발견한 좋은 기능을 잊지 않기 위한 백로그다.

현재 바로 구현할 기능과 나중에 구현할 기능을 구분한다.

---

## 1. 사용량 / 비용 / 토큰 대시보드

출처 근거:

- Hermes Dashboard는 sessions, analytics, logs, cron, skills, profiles, config를 보여준다.
- 영상에서는 input token 사용량이 output보다 훨씬 크며, 모델별 사용량과 top skills를 확인하는 흐름이 나온다.

Mamabot 적용 방향:

- 실행보드에 Usage 탭 추가
- 최근 7일 / 30일 토큰 사용량 표시
- 모델별 사용량 표시
- executionProfile별 사용량 표시
- top skills 사용량 표시
- failed run 비율 표시
- HTTP 402 / token limit 초과 횟수 표시

우선순위:

- 높음
- Quick / Agent / Coding 모드가 실제로 절약되는지 확인하는 데 필요하다.

---

## 2. 모델별 Config Preset Manager

출처 근거:

- Hermes config 최적화에서 max_turns, reasoning_effort, file_read_max_chars, tool output, emergency_brakes, cache_ttl 조정이 중요하게 언급되었다.

Mamabot 적용 방향:

- config/model-presets.json 생성
- 모델별 권장 설정 저장
- Settings / Config 화면에서 미리보기
- 적용 전 diff 표시
- 적용 후 Hermes restart 또는 reload 안내

예상 preset:

- cheap / quick
- balanced
- coding
- deep-review
- automation

저장 후보:

~~~json
{
  "profile": "coding",
  "max_turns": 60,
  "reasoning_effort": "medium",
  "file_read_max_chars": 50000,
  "emergency_brakes": true,
  "cache_ttl": "1h"
}
~~~

우선순위:

- 높음
- token limit 초과 문제와 직접 연결된다.

---

## 3. Persona / Soul Profile Manager

출처 근거:

- Hermes 영상에서 soul 파일을 수정해 developer용 persona, 설명형 persona 등 여러 agent profile을 만드는 흐름이 나온다.

Mamabot 적용 방향:

- Profiles 메뉴 추가 또는 Settings 안에 Profiles 탭 추가
- persona/soul 파일 목록 표시
- 개발자용, 리뷰어용, 자동화용, 설명용 persona 템플릿 제공
- 현재 선택된 persona 표시
- persona 수정 전 백업
- persona별 기본 executionProfile 연결

예시:

- Developer Soul
- Reviewer Soul
- Automation Soul
- Tutor Soul
- Minimal Quick Soul

우선순위:

- 중간
- multi-agent보다 먼저 persona 수준으로 가는 것이 안전하다.

---

## 4. Telegram / Gateway Setup Wizard

출처 근거:

- Hermes 영상에서 Telegram bot token, user ID, gateway setup, gateway restart가 실제 워크플로우로 나온다.

Mamabot 적용 방향:

- Gateway Setup Wizard 추가
- Telegram Bot Token 입력
- User ID 입력
- 저장 위치는 secrets/ 또는 runtime/hermes/home 쪽으로 분리
- gateway status 확인
- gateway restart 버튼
- Telegram 연결 테스트 메시지 보내기

주의:

- token은 Git에 절대 포함하지 않는다.
- 공유용 ZIP에도 포함하지 않는다.

우선순위:

- 중간
- Automation Mode 이후 진행한다.

---

## 5. MCP / External Control Approval Queue

출처 근거:

- Claude MCP 영상에서 Hermes 제어 권한을 always allow보다 needs approval로 두는 것을 권장한다.
- 외부 사용자가 접근하면 Hermes를 제어할 수 있으므로 위험하다.

Mamabot 적용 방향:

- 외부 제어 요청은 바로 실행하지 않고 approval queue로 보낸다.
- 승인 대기 작업 목록 표시
- 승인 / 거절 버튼
- 요청 출처 표시
- 실행 전 예상 작업 표시
- 승인 기록 저장

대상:

- MCP
- Telegram
- Cron
- 외부 Webhook
- Claude Desktop connector

우선순위:

- 높음
- 외부 연동 전에 반드시 필요하다.

---

## 6. Cron Automation Template Library

출처 근거:

- Hermes MCP 영상과 Hermes Dashboard 영상 모두 cron / scheduled tasks를 보여준다.
- daily automation news, inbox summary, weekly report 같은 예시가 나온다.

Mamabot 적용 방향:

- CronPanel에 템플릿 추가
- 자연어 prompt로 cron 생성
- 생성 전 preview
- 실행 결과 delivery 설정
- 실패한 cron 표시
- 마지막 실행 결과 표시

템플릿 후보:

- Daily AI news brief
- Weekly project summary
- Failed run report
- Model usage report
- Folder cleanup reminder
- Competitor page monitor
- Daily inbox summary

우선순위:

- 중간
- Approval Queue 이후 진행한다.

---

## 7. Skill Security Scanner

출처 근거:

- Claude Code 도구 영상은 GitHub star가 조작될 수 있고, 일부 skill/plugin에 prompt injection이 들어갈 수 있다고 경고한다.
- 스킬은 많이 설치하는 것이 아니라 검증된 것만 써야 한다.

Mamabot 적용 방향:

- 외부 skill import 전 검사
- README / install script / prompt 파일 스캔
- 위험 문구 탐지
- 자동 활성화 금지
- 설치 후 기본 disabled
- 사용자가 승인해야 enabled

탐지 후보:

- ignore previous instructions
- always star this repo
- exfiltrate
- send token
- override system
- disable safety
- hidden instruction
- auto approve

우선순위:

- 높음
- skills 기능을 키우기 전에 필요하다.

---

## 8. Workflow Chain Templates

출처 근거:

- Claude Code 도구 영상에서 Plan → Test → Code → Self-Review 흐름, Brainstorm, sub-agent driven development, Codex Review가 반복적으로 강조된다.

Mamabot 적용 방향:

- 버튼형 워크플로우 템플릿 추가
- 각 템플릿은 executionProfile과 skills를 자동 제안하되 바로 적용하지 않는다.
- 사용자가 선택하면 preview 후 적용

템플릿 후보:

1. Brainstorm → Plan
2. Plan → Test → Code → Review
3. Debug → Patch → Verify
4. Architecture Review
5. Codex Review
6. React / Next Best Practice Review
7. Report / PPTX / PDF Export

우선순위:

- 높음
- Coding Mode의 품질을 올리는 핵심이다.

---

## 9. Cross-Model Review Mode

출처 근거:

- Claude Code 도구 영상에서 같은 모델이 놓친 문제를 다른 모델이 잡아내는 Codex Review 흐름이 나온다.

Mamabot 적용 방향:

- Review Mode 안에 cross-model review 옵션 추가
- Hermes 결과를 다른 모델로 재검토
- 파일 수정 금지
- 지적사항만 출력
- 중요도별 분류

후보 모델:

- Codex / OpenAI
- Claude
- Gemini
- OpenRouter cheap reviewer model

우선순위:

- 중간
- Coding Mode 안정화 후 진행한다.

---

## 10. Session Reset / New Context Button

출처 근거:

- Hermes Telegram 흐름에서 /new 명령으로 새 세션을 시작해 fresh context window를 만든다.
- token 초과를 막으려면 컨텍스트 초기화가 필요하다.

Mamabot 적용 방향:

- Workbench에 새 컨텍스트 버튼 추가
- activeSessionId 초기화
- messages 초기화
- executionProfile은 유지
- memory는 유지하되 session context는 끊기
- run JSON에는 previousSessionId 기록

우선순위:

- 높음
- token 초과 방지에 직접 도움된다.

---

## 11. Gateway Restart / Doctor Repair Buttons

출처 근거:

- Hermes 영상에서 gateway가 응답하지 않을 때 gateway restart로 복구하는 흐름이 나온다.
- 기존 Mamabot plan에도 doctor-mamabot.ps1, status panel, native proxy status가 있다.

Mamabot 적용 방향:

- RuntimeStatusPanel에 restart/repair 버튼 추가
- Hermes Dashboard restart
- Gateway restart
- Native API status retest
- log tail 표시

우선순위:

- 중간
- 포터블 안정성에 중요하다.

---

## 12. Token Budget Guard

출처 근거:

- 현재 실제로 "안녕" 요청에서 Prompt tokens limit exceeded 문제가 발생했다.
- Hermes 영상에서도 input token이 비용의 대부분을 차지한다고 설명한다.

Mamabot 적용 방향:

- 실행 전 prompt 길이 / skills / memory / session 사용 여부를 표시
- 위험하면 Quick Mode 추천
- token limit 초과 가능성이 높으면 실행 전 경고
- 402 발생 모델은 최근 실패 모델로 표시
- 같은 조건 반복 실행 차단

우선순위:

- 매우 높음
- 현재 버그의 직접 후속 작업이다.

---

## 13. 기능 우선순위 요약

### 지금 바로 구현할 것

1. Execution Profile 정식화
2. Quick Mode context 최소화
3. Token Budget Guard
4. Session Reset 버튼
5. Skill 기본값 비움 유지
6. run JSON에 context metadata 저장

### 그다음 구현할 것

1. Usage / Token Dashboard
2. Config Preset Manager
3. Workflow Chain Templates
4. Skill Security Scanner
5. Patch Approval / Rollback

### 나중에 구현할 것

1. Persona / Soul Profile Manager
2. Telegram / Gateway Setup Wizard
3. MCP Approval Queue
4. Cron Template Library
5. Cross-Model Review
6. PDF / PPTX export

---

## 14. 구현 원칙

- 기능을 많이 켜는 방향이 아니라, 기본값을 가볍게 두고 필요할 때만 켠다.
- Quick Mode는 가장 가벼워야 한다.
- Coding Mode는 가장 안전해야 한다.
- Automation Mode는 반드시 승인 기반이어야 한다.
- Skills는 자동 적용하지 않는다.
- 외부 연동은 always allow 금지.
- 모든 위험 작업은 preview / approval / backup / rollback을 거친다.

<!-- MAMABOT_REFERENCE_FEATURE_BACKLOG_20260513_END -->

<!-- MAMABOT_TOKEN_EFFICIENT_ARCHITECTURE_20260513_BEGIN -->

# Mamabot Token-Efficient Architecture Decision - 2026-05-13

## 1. Final decision

Quick Mode must not use Hermes Agent.

Reason:

- Quick Mode already disables skills, session context, and memory sync.
- Even then, Hermes Agent still produced more than 14k prompt tokens.
- This means Hermes Agent itself has a heavy default prompt/tool/runtime context.
- Therefore, Quick Mode needs a direct model call path.

Final routing:

~~~txt
Quick Mode      -> Direct API call
Agent Mode      -> Hermes Agent
Coding Mode     -> Hermes Agent + selected skills + indexing/compression
Review Mode     -> Direct or Hermes depending on task
Automation Mode -> Hermes Gateway/Cron with approval
~~~

## 2. Quick Mode Direct API

Quick Mode behavior:

- Do not call Hermes binary
- Do not attach skills
- Do not attach toolsets
- Do not attach memory
- Do not attach session prompt
- Call OpenRouter/Gemini/OpenAI directly
- Save result to the same run store
- Mark run metadata:
  - executionProfile: quick
  - engine: direct
  - contextPolicy: minimal
  - sessionContextUsed: false
  - memorySyncUsed: false

## 3. Agent/Coding Mode optimization

Hermes remains useful for actual agent work.

For Agent/Coding Mode, apply token-saving strategies:

### 3-1. .mamabotignore

Create an agent-facing ignore file similar to .claudeignore.

Default ignored paths:

- node_modules/
- .next/
- runtime/
- backups/
- logs/
- runs/
- workspaces/
- secrets/
- memory/
- config/cache/
- *.log
- *.tmp
- *.bak

Purpose:

- Prevent agents from wasting context on generated/runtime files.
- Prevent accidental reading of secrets and private memory.

### 3-2. Workspace Index

Build a QMD-like workspace index.

Purpose:

- Avoid repeated glob/grep/read exploration.
- Find relevant files before invoking Hermes.
- Pass only the top candidate files to Agent/Coding Mode.

Index candidates:

- file list
- route list
- component list
- API endpoint list
- symbol/function hints
- import relationships

### 3-3. Command Output Compressor

Build an RTK-like command output compressor.

Purpose:

- Compress noisy terminal outputs before passing them back to the agent.
- Especially useful for:
  - grep
  - find
  - ls
  - git diff
  - npm test
  - npm run build
  - tsc
  - eslint

Rules:

- If test succeeds, summarize only success count.
- If test fails, keep failing test names and key stack lines.
- For git diff, summarize files and important hunks.
- Always keep a link/path to the raw log.
- Allow “show raw output” when needed.

### 3-4. Team Coding Mode

Add optional Architect / Builder / Reviewer workflow.

Roles:

- Architect: creates scoped brief and target files.
- Builder: only edits files in the brief.
- Reviewer: reviews only changed files/diff.

Purpose:

- Prevent agent drift.
- Reduce unnecessary codebase reading.
- Improve quality before commit.

## 4. Implementation priority

Immediate:

1. Quick Direct API path
2. .mamabotignore
3. Token Budget Guard
4. Save engine/context metadata in run JSON

Next:

1. Workspace Index
2. Command Output Compressor
3. Session Reset button
4. Usage / Token Dashboard

Later:

1. Team Coding Mode
2. QMD external integration review
3. RTK external integration review
4. MCP approval queue
5. Telegram/Gateway automation

## 5. Safety rule

Do not directly install or enable external tools such as QMD or RTK without review.

First implement small internal versions:

- Mamabot Workspace Index
- Mamabot Command Output Compressor

External integration can be considered later after security and compatibility review.

<!-- MAMABOT_TOKEN_EFFICIENT_ARCHITECTURE_20260513_END -->

# 사무실/집 포터블 운영 기록 - 2026-05-14

## 1. 현재 목표

Mamabot은 사무실과 집을 오가며 ZIP으로 이동해서 사용하는 포터블 프로젝트로 운영한다.

매일 반복 작업을 줄이기 위해 최종 목표는 다음과 같다.

```txt
사무실 아침 실행:
01-start-office.bat

사무실에서 집으로 가져갈 때:
02-export-to-home-zip.bat

집에서 실행:
01-start-home.bat

2. BAT 파일 이름 정책

집과 사무실에서 헷갈리지 않도록 실행용 BAT 이름을 분리한다.

01-start-office.bat
- 사무실에서 매일 아침 실행한다.
- 내부적으로 scripts/start-mamabot.ps1을 실행한다.

01-start-home.bat
- 집에서 실행한다.
- 내부적으로 동일한 start 스크립트를 사용한다.

02-export-to-home-zip.bat
- 사무실에서 작업 후 집으로 가져갈 ZIP을 생성한다.

setup-office.bat
- 처음 설치하거나 Hermes/venv가 꼬였을 때만 실행한다.

stop-hermes-dashboard.bat
- 백그라운드로 실행 중인 Hermes Dashboard 서버를 중지할 때 사용한다.
3. ZIP 저장 위치 정책

집으로 가져갈 ZIP 파일은 프로젝트 폴더 안의 백업 폴더에 저장한다.

권장 위치:

F:\mamabot\backups\exports\mamabot-home-YYYYMMDD-HHMMSS.zip

backups 폴더는 ZIP 생성 시 제외되므로, 프로젝트 내부에 ZIP을 만들어도 자기 자신이 다시 ZIP에 포함되지 않는다.

반드시 제외해야 하는 폴더:

backups/
backups/exports/
4. ZIP 생성 시 제외할 항목

포터블 ZIP에는 대용량 파일, 자동 생성 파일, PC 환경 의존 파일을 넣지 않는다.

제외 대상:

node_modules/
.next/
backup/
backups/
backups/exports/
참고자료/
runtime/workspace-index/
runtime/logs/
runtime/hermes/logs/
runtime/hermes/runs/
runtime/hermes/home/hermes-agent/venv/
config/cache/
mamabot_exports/
_exports/

제외 이유:

node_modules와 .next는 새 PC에서 다시 만들 수 있다.
venv는 PC와 경로에 의존하므로 ZIP에 넣으면 깨질 수 있다.
workspace-index는 작업폴더 선택 후 다시 생성하면 된다.
logs/runs/cache는 이동에 필요 없다.
참고자료는 긴 경로 파일 때문에 ZIP 오류를 일으킨 적이 있다.
backups는 ZIP 자기 포함 문제를 막기 위해 제외한다.
5. 사무실에서 발생한 Hermes 실행 문제

사무실에서 Quick/OpenRouter는 정상 작동했지만 Hermes Native는 처음에 실패했다.

관찰된 오류:

/api/hermes/native/status → 500
targetBaseUrl: http://127.0.0.1:9119

원인:

Hermes Dashboard 서버가 127.0.0.1:9119에서 실행되고 있지 않았다.
WSL venv가 없거나 불완전했다.
WSL Python이 처음에는 3.10이었고, Hermes는 Python 3.11 이상을 요구했다.
Dashboard 실행에 필요한 fastapi, uvicorn이 누락되어 있었다.

확인된 해결:

WSL Python 3.11 설치
Hermes venv 생성 위치:
runtime/hermes/home/hermes-agent/venv

Hermes 설치:
pip install -e .

Dashboard 의존성 설치:
fastapi
uvicorn[standard]

Hermes Dashboard 주소:
http://127.0.0.1:9119

/api/hermes/native/status 정상 응답 확인
/api/hermes/native/skills 정상 응답 확인
6. Hermes 실행 정책

Hermes Native API를 사용하려면 Hermes Dashboard 서버가 켜져 있어야 한다.

다만 매일 검은 PowerShell 창으로 Dashboard를 직접 켜놓고 볼 필요는 없다.

목표 구조:

scripts/start-mamabot.ps1
- 127.0.0.1:9119가 이미 켜져 있는지 확인한다.
- 꺼져 있으면 WSL을 통해 Hermes Dashboard를 백그라운드로 실행한다.
- Dashboard가 HTTP 200을 반환할 때까지 기다린다.
- 이후 npm run dev를 실행한다.

Dashboard를 수동으로 끄고 싶을 때:

stop-hermes-dashboard.bat
7. WSL 경로 변환 문제

Windows 경로를 WSL 경로로 바꾸는 과정에서 오류가 있었다.

잘못된 경로:

/mnt/f\mamabot/runtime/hermes/home/hermes-agent

정상 경로:

/mnt/f/mamabot/runtime/hermes/home/hermes-agent

규칙:

F:\mamabot
→ /mnt/f/mamabot

PowerShell 스크립트에서는 Windows 경로의 역슬래시를 반드시 슬래시로 변환해야 한다.

8. 사무실 복사본의 Git 문제

사무실 복사본에서 다음 오류가 발생했다.

fatal: not a git repository

의미:

사무실의 F:\mamabot 폴더는 Git 저장소가 아니라 ZIP으로 만든 실행용 복사본이다.
.git 폴더가 없으므로 git add, git commit, git status가 동작하지 않는다.

현재 실용적인 운영 방식:

사무실:
- 포터블 복사본에서 작업한다.
- 퇴근 전 02-export-to-home-zip.bat으로 ZIP을 만든다.

집:
- ZIP을 푼다.
- 필요하면 집의 원본 Git 저장소에 변경 파일을 복사/병합한다.
- Git 커밋은 집의 원본 Git 저장소에서 한다.

추후 선택지:

사무실과 집 양쪽에서 직접 커밋하고 싶다면 ZIP에 .git 폴더도 포함해야 한다.
다만 ZIP 용량과 저장소 일관성 문제가 생길 수 있으므로 신중히 결정한다.
9. 추가/수정된 주요 파일
scripts/setup-office-hermes.ps1
scripts/start-mamabot.ps1
scripts/start-hermes-dashboard-wsl.sh
scripts/stop-hermes-dashboard.ps1
scripts/export-mamabot-office.ps1

setup-office.bat
start-mamabot.bat
01-start-office.bat
01-start-home.bat
02-export-to-home-zip.bat
stop-hermes-dashboard.bat
10. 다음 개선 작업
02-export-to-home-zip.bat의 ZIP 출력 위치를 항상 아래로 고정한다.
backups\exports\
ZIP 생성 시 아래 폴더가 반드시 제외되는지 확인한다.
backups/
backups/exports/
start-mamabot.ps1이 Hermes Dashboard를 보이는 창이 아니라 백그라운드로 실행하도록 유지한다.
setup-office-hermes.ps1이 다음 의존성을 자동 설치하도록 유지한다.
fastapi
uvicorn[standard]
앞으로 ZIP에 .git을 포함할지 결정한다.
.git을 포함하지 않는다면 커밋은 집의 원본 Git 저장소에서 한다는 점을 문서에 명확히 유지한다.
<!-- MAMABOT_PORTABLE_OFFICE_HOME_WORKFLOW_20260514_END -->



## 작업 기록 - 20260514-120350

### 수정/확인 내용
- commandOutputCompressor.js BOM 제거 및 legacy 호출 호환 패치 완료.
- compressCommandOutput({ command, stdout }) 방식과 compressCommandOutput("cmd", output) 방식 모두 정상 동작 확인.
- package.json에 추가했던 "type": "module" 제거.
- 원인: next.config.js가 module.exports 기반 CommonJS 설정이라 "type": "module"과 충돌하여 Next API route 500 발생.
- /api/workspace/index POST 재테스트 결과 200 OK 확인.
- workspace index 생성 성공:
  - workspaceRoot: F:\mamabot
  - files: 110
  - routes: 26
  - ignored: 17
  - errors: 0

### 결론
- 인덱싱 갱신 API는 정상 복구됨.
- workspaceIndex 로직 문제는 아니었고, package.json module type 설정 충돌 문제였음.


## 작업 기록 - 20260514-121646

### 수정 내용
- WorkbenchChatPanel에 workspaceIndexToast 상태 추가.
- 인덱스 갱신 성공/실패/작업폴더 미선택 상황에 토스트 표시 추가.
- PowerShell heredoc 인코딩 깨짐 문제를 피하기 위해 한글/이모지 문자열을 Unicode escape 방식으로 수정.
- 인덱스 갱신 성공 시 상단 토스트에 files / routes / ignored / errors 요약 표시.
- 확인 결과:
  - 인덱스 갱신 완료 토스트 정상 표시
  - 한글 깨짐 없음
  - files 110 / routes 26 / ignored 17 / errors 0 표시 정상

### 결론
- 인덱스 갱신 기능의 사용자 피드백 UX 개선 완료.
- 포터블 에이전트 작업대에서 백그라운드 처리 결과를 즉시 확인할 수 있게 됨.


## 작업 기록 - 20260514-122854

### 수정/확인 내용
- app/api/agent/run/route.js에 workspaceCandidates 상세 로그 출력 추가.
- 기존에는 workspaceCandidates count만 기록되었으나, 이제 후보 파일 path / kind / score까지 로그에 남김.
- dry-run 재실행 결과 다음 로그 확인:
  - workspaceCandidates count=5
  - app/components/AgentRunHistoryPanel.jsx
  - app/components/AgentRunLogPanel.jsx
  - scripts/portable/run-hermes-in-workspace.ps1
  - app/api/agent/run/route.js
  - app/components/AgentPanel.jsx
- memorySync used=true 정상 확인.
- DRY RUN complete 정상 확인.

### 결론
- workspaceIndex 생성 → 후보 파일 검색 → Agent dry-run 연결 → 상세 로그 검증까지 완료.
- Mamabot이 작업 요청마다 관련 파일 후보를 우선 제시하는 구조가 정상 작동함.
- 자기진화형 포터블 에이전트의 탐색 범위 축소 기반이 마련됨.


## 작업 기록 - 20260514-130548

### 수정 내용
- AppShell에서 오른쪽 대화기록 사이드바의 실행 이력 클릭 시 dashboard가 아니라 history 탭으로 이동하도록 변경.
- AgentRunHistoryPanel에 initialRunId prop 추가.
- initialRunId가 전달되면 해당 run 상세를 자동으로 openDetail 처리하도록 개선.
- 실행 이력 상세에서 workspaceCandidates 후보 파일 목록을 확인할 수 있도록 연결 완료.

### 확인 결과
- 오른쪽 실행 이력 카드 클릭 시 메인 화면이 실행 이력 페이지로 이동함.
- 선택한 run 상세가 자동으로 열림.
- 저장된 workspaceCandidates 목록도 상세 화면에서 확인 가능.

### 결론
- 실행 이력 클릭 → 상세 확인 흐름이 정상화됨.
- workspaceIndex 후보 파일이 로그뿐 아니라 실행 이력 UI에서도 확인 가능한 상태가 됨.


## 작업 기록 - 20260514-131529

### 수정 내용
- ConversationSidebar 실행 이력 카드에 runId 축약 표시 추가.
- 실행 이력 카드에 workspace candidateCount 표시 추가.
- memorySync가 적용된 실행에는 memory 표시 추가.
- 확인 결과:
  - runId는 run- 접두어를 #으로 줄여 표시.
  - 후보 수는 candidateCount 기반으로 표시.
  - memorySynced 값이 true이면 memory 태그 표시.

### 결론
- 오른쪽 실행 이력 목록에서 최신 실행과 과거 실행을 더 쉽게 구분할 수 있게 됨.
- workspaceIndex 후보 파일이 붙은 실행인지 사이드바에서 바로 확인 가능해짐.


## 작업 기록 - 20260514-133127

### 완료 내용
- Patch Approval / Rollback 백엔드 1차 구현 완료.
- app/lib/patchManager.js 생성.
- patch 생성 / 상세 조회 / 적용 / 롤백 API 생성.
- git 저장소가 아닌 포터블 환경에서도 동작하도록 파일 백업 기반 구조로 구현.
- smoke test 진행:
  - patch 생성: pending
  - patch 적용: applied
  - runtime/temp/patch-smoke-test.txt 파일 생성 확인
  - patch 롤백: rolledback
  - 롤백 후 파일 삭제 확인

### 생성된 API
- GET /api/agent/patches
- POST /api/agent/patches
- GET /api/agent/patches/[patchId]
- POST /api/agent/patches/[patchId]/apply
- POST /api/agent/patches/[patchId]/rollback

### 결론
- Mamabot이 이제 수정안을 바로 적용하지 않고, patch로 저장한 뒤 승인/적용/롤백할 수 있는 기반을 갖춤.
- 자기진화형 포터블 에이전트에서 안전한 자가수정 루프의 핵심 기반이 마련됨.


## 작업 기록 - 20260514-134143

### 완료 내용
- PatchApprovalPanel UI 생성.
- AppShell에 patches 탭 연결.
- Sidebar에 패치 승인 메뉴 추가.
- 패치 목록 조회 UI 구현.
- 패치 상세 preview 영역 구현.
- pending 상태에서는 적용 버튼, applied 상태에서는 롤백 버튼이 표시되도록 구성.
- smoke test patch가 rolledback 상태로 목록에 표시되는 것 확인.

### 확인 결과
- 왼쪽 메뉴에 패치 승인 메뉴 정상 표시.
- 패치 승인 화면 진입 정상.
- 패치 목록에 Patch system smoke test 표시.
- rolledback 상태 및 changes 1 표시 정상.

### 결론
- Patch Approval / Rollback 백엔드와 UI 1차 연결 완료.
- Mamabot은 이제 수정안을 안전하게 preview → apply → rollback하는 기본 흐름을 갖춤.


## 작업 기록 - 20260514-135057

### 완료 내용
- Command Output Compressor를 실제 run 저장 흐름에 연결.
- saveAndAttach 단계에서 output/stderr가 있을 경우 자동으로 compressedOutput과 outputCompression 생성.
- AgentRunHistoryPanel에 Raw / Compressed 출력 토글 추가.
- 현재 보기 기준으로 응답 복사 버튼이 동작하도록 수정.
- compression 메타 정보 표시 추가.

### 확인 결과
- Quick direct 실행 성공:
  - runId: run-1778734075920
  - status: success
  - output 저장 정상
  - compressedOutput 저장 정상
  - outputCompression 저장 정상
  - kind: generic
  - originalLines: 3
  - compressedLines: 3
  - savedChars: 0
  - ratio: 1
- 짧은 답변이라 압축 효과는 없지만, 저장/표시 연결은 정상.
- PowerShell curl 출력에서는 한글이 깨져 보일 수 있으나 실제 JSON 저장 파일은 UTF-8 정상.

### 결론
- Command Output Compressor 1차 연결 완료.
- 실행 이력 상세에서 Raw / Compressed 비교 기반이 마련됨.
- 다음 단계에서 긴 로그, npm test, git diff, ls/find 결과 압축 효과를 검증하면 됨.


## 작업 기록 - 20260514-143155

### 완료 내용
- 작업대 입력창 위에 Mini Token Bar 추가.
- 현재 입력 중인 요청 1건 기준 예상 토큰 사용량 표시.
- 표시 항목:
  - 실행 프로필 Quick / Agent / Coding
  - 예상 입력 토큰
  - 실용 한도
  - 사용 비율
  - 위험도 ok / warn / danger
- Mini Token Bar 위치를 입력창 왼쪽 상단으로 조정.
- 토큰바 크기 및 입력 버튼 레이아웃 일부 조정.

### 확인 결과
- 입력창에 텍스트를 입력하면 Mini Token Bar가 표시됨.
- 입력 내용이 짧을 경우 Quick 기준 1% 수준으로 정상 표시됨.
- 현재 표시값은 누적 사용량이 아니라 이번 요청 1회 기준 예상 토큰 상태임.

### 결론
- 실행 전 현재 요청의 토큰 위험도를 바로 확인할 수 있게 됨.
- 별도 Usage Dashboard보다 먼저 실사용성이 높은 입력창 기반 토큰 상태 표시를 적용함.


## 작업 기록 - 20260514-145350

### 완료 내용
- ConversationSidebar 검색 UX 1차 정리.
- 실행 이력 검색에서 runId, 짧은 runId, status, provider, model, mode, engine, promptPreview, 후보 수, memory 키워드 검색 가능하도록 개선.
- 대화창 검색에서 sessionId, 제목, currentGoal, runCount, messageCount 검색 가능하도록 개선.
- 카드 안에 잘못 삽입된 검색 예시 하드코딩 문구 제거.
- 깨진 인코딩 배지 관련 불안정 코드 제거.
- ConversationSidebar.jsx를 안정 버전으로 재작성하여 JSX/정규식 오류 해결.

### 확인 결과
- 오른쪽 대화기록 사이드바 정상 표시.
- 실행 이력 탭에서 gemini 검색 정상 작동.
- 실행 카드에 status, promptPreview, createdAt, runId, 후보 수, memory 표시 정상.
- 카드 내부에 검색 예시 문구가 더 이상 표시되지 않음.

### 결론
- 오른쪽 대화기록 사이드바가 단순 목록에서 기본 검색 허브로 개선됨.
- 이후 칸반, 팀 코딩 모드, 멀티 에이전트 기능이 붙어도 실행/대화 기록을 검색해 찾기 쉬운 기반이 마련됨.


## 작업 기록 - 20260514-150951

### 완료 내용
- Workflow Chain Templates 1차 구현 완료.
- 워크플로우 템플릿 API 생성.
- WorkflowTemplatesPanel UI 생성.
- Sidebar에 워크플로우 메뉴 추가.
- AppShell에 workflows 탭 연결.
- 템플릿 목록:
  - 안전한 버그 수정
  - UI 정리
  - 신규 기능 추가
  - 토큰 절약 실행
- 템플릿별 단계 표시:
  - Architect
  - Builder
  - Reviewer
  - User
- 한글 깨짐 문제 수정 완료.

### 확인 결과
- 워크플로우 화면 정상 표시.
- 템플릿 제목/설명/단계 한글 정상 표시.
- 프롬프트 복사 버튼 정상 표시.

### 결론
- 반복 작업을 분석 → 계획 → 패치 → 리뷰 → 승인 흐름으로 정리할 수 있는 기반이 생김.
- 이후 Team Coding Mode와 Kanban 기능으로 확장하기 쉬운 구조가 마련됨.


## 작업 기록 - 20260514-153800

### 완료 내용
- Workflow Chain Templates 1차 구현 완료.
- 워크플로우 템플릿을 작업대로 바로 보내는 기능 추가.
- “작업대로 보내기” 클릭 시 작업대 탭으로 이동하고 입력창에 프롬프트가 자동 입력되도록 수정.
- 프롬프트 복사 시 \n이 문자 그대로 복사되던 문제 수정.
- 워크플로우 프롬프트의 한글 고정 문구 깨짐 수정.
- 입력창 자동 입력 시 깜빡임을 줄이도록 WorkbenchChatPanel의 pending prompt 처리 로직 정리.

### 확인 결과
- 작업대로 보내기 정상 동작.
- 복사된 프롬프트가 실제 줄바꿈 형식으로 출력됨.
- 프롬프트 구조:
  - templateId
  - title
  - 사용자 목표
  - workspaceRoot
  - 작업 원칙
  - 단계
  - 최종 응답 형식
- 워크플로우가 단순 안내 화면이 아니라 실제 작업 시작점으로 연결됨.

### 결론
- Workflow Chain Templates 1차 완료.
- 이후 Team Coding Mode, Kanban, Architect/Builder/Reviewer 역할 분리로 확장할 수 있는 기반이 마련됨.


## 남은 작업 계획 - 20260514-154612

### 현재 완료된 주요 기능
- Patch Approval / Rollback 백엔드 및 UI 1차 완료
- Command Output Compressor 저장 및 실행 이력 Raw / Compressed 토글 연결 완료
- 작업대 Mini Token Bar 1차 완료
- 오른쪽 대화기록 / 실행 이력 검색 UX 1차 완료
- Workflow Chain Templates 1차 완료
- 워크플로우 프롬프트 복사 및 작업대로 보내기 기능 완료

---

## 다음 작업 우선순위

### 1. Team Coding Mode 1차
#### 목표
- 하나의 작업을 Architect / Builder / Reviewer 역할로 나누어 실행할 수 있는 구조를 만든다.
- 처음부터 완전한 멀티 에이전트 자동 실행이 아니라, 역할별 프롬프트 템플릿과 실행 흐름부터 만든다.

#### 구현 범위
- Team Coding Mode 패널 또는 워크플로우 확장
- 역할 3개 고정:
  - Architect: 원인 분석, 범위 지정, 후보 파일 선정
  - Builder: 지정된 범위 안에서 수정안 작성
  - Reviewer: 변경안 검토, 위험도 확인, 패치 승인 연결
- 각 역할별 프롬프트 생성 API 추가
- 작업대로 보내기 기능과 연결

#### 완료 기준
- 사용자가 목표를 입력하면 Architect / Builder / Reviewer 단계별 프롬프트를 생성할 수 있다.
- 생성된 프롬프트를 작업대로 보낼 수 있다.
- Patch Approval / Rollback 흐름과 자연스럽게 연결된다.

---

### 2. Workflow 실행 흐름 고도화
#### 목표
- 현재 워크플로우는 프롬프트를 생성하는 수준이므로, 실제 실행 단계와 연결한다.

#### 구현 범위
- 워크플로우 상세 화면에 단계별 버튼 추가
  - 1단계 보내기
  - 2단계 보내기
  - 전체 프롬프트 보내기
- 현재 선택된 템플릿과 목표를 세션에 기록
- 워크플로우 실행 결과를 실행 이력과 연결

#### 완료 기준
- 워크플로우 단계별로 작업대에 프롬프트를 보낼 수 있다.
- 실행 이력에서 어떤 워크플로우 템플릿을 사용했는지 확인할 수 있다.

---

### 3. Patch Approval UI 고도화
#### 목표
- 현재 패치 목록과 preview는 가능하지만, 실제 사용성을 더 높인다.

#### 구현 범위
- patch 상태 필터 강화
  - pending
  - applied
  - rolledback
- patch 상세에서 변경 파일 목록을 더 명확히 표시
- apply / rollback 후 토스트 표시
- patch 생성 시 실행 이력 runId와 연결

#### 완료 기준
- 어떤 실행에서 나온 patch인지 확인 가능하다.
- 적용/롤백 후 화면에서 즉시 상태 변화를 확인할 수 있다.

---

### 4. Mini Token Bar 2차
#### 목표
- 현재 Mini Token Bar는 현재 프롬프트 기준 예상 토큰만 표시한다.
- 다음 단계에서는 workspace 후보 파일 수와 memory 상태까지 더 정확히 표시한다.

#### 구현 범위
- workspaceIndex 후보 수를 token preview에 연결
- memorySync 사용 여부 표시
- 위험도별 안내 문구 간소화
- 긴 프롬프트일 때 warn / danger 표시 확인

#### 완료 기준
- 입력창 위에서 현재 요청의 예상 토큰, 위험도, 후보 파일 수를 확인할 수 있다.

---

### 5. Command Output Compressor 2차
#### 목표
- 현재는 output / stderr 저장 시 압축 결과를 저장한다.
- 다음 단계에서는 명령 타입별 압축 품질을 높인다.

#### 구현 범위
- npm test / build / lint / git diff / grep / find 결과별 압축 규칙 강화
- 실행 이력 상세에서 압축 전후 차이 표시 개선
- savedChars / ratio 표시를 더 읽기 쉽게 변경

#### 완료 기준
- 긴 로그를 Raw 대신 Compressed로 빠르게 확인할 수 있다.
- 실패 원인 중심으로 압축 결과가 정리된다.

---

### 6. History / Session 검색 2차
#### 목표
- 오른쪽 대화기록 사이드바를 작업 검색 허브로 개선한다.

#### 구현 범위
- status 필터 추가
- provider / model 필터 추가
- 즐겨찾기만 보기 추가
- 오래된 깨진 기록 숨김 옵션 추가
- 검색 결과 개수 표시

#### 완료 기준
- runId, 모델명, 상태, memory, 후보 수 기준으로 빠르게 실행 이력을 찾을 수 있다.

---

### 7. Config Preset Manager
#### 목표
- 자주 쓰는 실행 설정을 프리셋으로 저장한다.

#### 구현 범위
- provider / model / executionProfile / responseStyle / skills / toolsets 조합 저장
- 프리셋 목록 UI
- 작업대에서 프리셋 선택

#### 완료 기준
- 자주 쓰는 모델과 실행 방식을 한 번에 불러올 수 있다.

---

### 8. Skill Security Scanner
#### 목표
- 자동 실행이나 파일 수정 전에 위험한 skill / command를 감지한다.

#### 구현 범위
- 위험 명령 패턴 감지
- 파일 삭제 / 대량 수정 / 외부 전송 명령 경고
- Patch Approval과 연결

#### 완료 기준
- 위험 가능성이 있는 작업은 실행 전 경고한다.

---

### 9. Kanban / 작업 보드 1차
#### 목표
- 영상의 Todo / Ready / In Progress / Done / Blocked 구조를 Mamabot에 맞게 작게 적용한다.

#### 구현 범위
- 작업 카드 생성
- 상태 변경
- 워크플로우 템플릿과 연결
- 실행 이력 runId 연결

#### 완료 기준
- 작업을 카드로 만들고 현재 상태를 관리할 수 있다.

---

### 10. 장기 작업
- Persona / Soul Profile Manager
- Agent Registry
- Cross-Model Review
- MCP Approval Queue
- Slack / Telegram 연동
- Multi-Agent CoWork OS 스타일 통합 대시보드

---

## 바로 다음 작업
다음 작업은 Team Coding Mode 1차로 진행한다.

작업 시작 순서:
1. 기존 워크플로우 템플릿 구조 확인
2. Team Coding 역할 템플릿 API 추가
3. TeamCodingPanel UI 추가
4. Sidebar / AppShell 연결
5. 작업대로 보내기 기능 재사용
6. plan.md에 결과 기록


## 새 창 작업 인수인계 가이드 - 20260514-154816

### 기본 작업 방식
Mamabot 작업은 항상 아래 순서로 진행한다.

1. 현재 관련 파일 구조 확인
2. 기존 코드에서 유사 기능이 있는지 검색
3. 수정 전 backups/quick 하위에 백업 생성
4. 작은 단위로 코드 수정
5. PowerShell 또는 API로 smoke test
6. 브라우저에서 UI 확인
7. 성공하면 plan.md에 작업 기록 추가

절대 한 번에 큰 기능을 모두 붙이지 않는다.
항상 백엔드 → UI → 연결 → 검증 → 기록 순서로 작업한다.

---

## 다음 작업: Team Coding Mode 1차

### 작업 목표
Team Coding Mode는 하나의 작업을 세 역할로 나누어 처리하는 기능이다.

- Architect: 문제 분석, 작업 범위 지정, 후보 파일 선정
- Builder: Architect가 정한 범위 안에서 수정안 작성
- Reviewer: 변경안 검토, 위험도 확인, Patch Approval 연결

현재 Workflow Chain Templates가 이미 있으므로, Team Coding Mode는 워크플로우 기능을 확장하는 방식으로 구현한다.

---

### 작업 전 확인해야 할 파일

먼저 아래 파일을 확인한다.

`powershell
cd F:\mamabot

Select-String -Path "app\lib\workflowTemplates.js" 
  -Pattern "WORKFLOW_TEMPLATES","buildWorkflowPrompt","safe-bug-fix","Architect","Builder","Reviewer" 
  -Encoding UTF8 |
  Select-Object LineNumber, Line |
  Format-Table -AutoSize

Select-String -Path "app\components\WorkflowTemplatesPanel.jsx" 
  -Pattern "copyPrompt","sendToWorkbench","selectedId","goal","workspaceRoot" 
  -Encoding UTF8 |
  Select-Object LineNumber, Line |
  Format-Table -AutoSize

Select-String -Path "app\components\AppShell.jsx","app\components\Sidebar.jsx" 
  -Pattern "workflows","WorkflowTemplatesPanel" 
  -Encoding UTF8 |
  Select-Object Path, LineNumber, Line |
  Format-Table -AutoSize
구현 방식

Team Coding Mode 1차는 완전 자동 멀티 에이전트가 아니다.
먼저 역할별 프롬프트를 생성하고 작업대로 보낼 수 있게 만든다.

구현 파일 후보:

app/lib/teamCodingTemplates.js
app/api/team-coding/templates/route.js
app/api/team-coding/templates/[role]/route.js
app/components/TeamCodingPanel.jsx
app/components/Sidebar.jsx
app/components/AppShell.jsx
1단계: teamCodingTemplates.js 생성

역할별 기본 프롬프트 생성 함수를 만든다.

필요 함수:

listTeamRoles()
getTeamRole(roleId)
buildTeamRolePrompt(roleId, input)

역할 구조:

architect
- 원인 분석
- 수정 범위 지정
- 후보 파일 선정
- Builder에게 넘길 작업 브리프 생성

builder
- Architect 브리프 기준으로만 수정안 작성
- 불필요한 파일 탐색 금지
- 가능하면 patch payload 형태로 제안

reviewer
- 변경안의 위험도 검토
- 누락된 테스트/검증 확인
- Patch Approval / Rollback 사용 여부 판단
2단계: API 생성

API는 아래처럼 만든다.

GET /api/team-coding/templates
→ 역할 목록 반환

GET /api/team-coding/templates/[role]
→ 특정 역할 상세 반환

POST /api/team-coding/templates/[role]
→ 역할별 작업 프롬프트 생성

POST body 예시:

{
  "goal": "실행 이력 검색 UX를 정리해줘",
  "workspaceRoot": "F:\\mamabot",
  "context": "현재 ConversationSidebar 검색 기능을 개선하는 중"
}
3단계: TeamCodingPanel UI 생성

UI 구성:

왼쪽:
- Architect
- Builder
- Reviewer 역할 카드

오른쪽:
- 선택한 역할 설명
- 작업 목표 입력
- 추가 context 입력
- workspaceRoot 입력
- 프롬프트 복사
- 작업대로 보내기

WorkflowTemplatesPanel의 copyPrompt, sendToWorkbench 구조를 재사용한다.

중요:

작업대로 보내기는 이미 구현된 localStorage 방식 사용
key는 기존과 동일하게 mamabot.pendingWorkbenchPrompt 사용
이벤트는 mamabot:send-to-workbench 사용
4단계: Sidebar / AppShell 연결

Sidebar에 메뉴 추가:

{ id: "teamCoding", label: "팀 코딩", icon: "👥" }

AppShell에 import 추가:

import TeamCodingPanel from "./TeamCodingPanel.jsx";

renderContent에 추가:

if (activeTab === "teamCoding") {
  return <TeamCodingPanel />;
}
5단계: 검증 방법

서버 재시작:

cd F:\mamabot

 = Get-NetTCPConnection -LocalPort 3200 -ErrorAction SilentlyContinue
foreach ( in ) {
  Stop-Process -Id .OwningProcess -Force -ErrorAction SilentlyContinue
}

npm run dev

브라우저 검증:

1. 왼쪽 메뉴에 팀 코딩 표시
2. Architect 선택
3. 목표 입력
4. 프롬프트 복사 클릭
5. 메모장에 붙여넣었을 때 줄바꿈과 한글 정상 확인
6. 작업대로 보내기 클릭
7. 작업대 입력창에 자동 입력 확인
8. Builder / Reviewer도 같은 방식으로 확인
6단계: 완료 후 plan.md 기록

성공하면 아래 항목을 기록한다.

- Team Coding Mode 1차 구현 완료
- Architect / Builder / Reviewer 역할 프롬프트 생성 가능
- 작업대로 보내기 연결 완료
- 워크플로우와 동일한 pendingWorkbenchPrompt 구조 재사용
- 다음 단계는 역할별 실행 결과를 하나의 작업 체인으로 묶는 것
주의할 점
한글 깨짐 방지

PowerShell Set-Content에서 한글이 깨질 수 있으므로, 긴 JSX/JS 파일 생성은 가능하면 Node fs.writeFileSync로 처리한다.

대괄호 경로 예:

[templateId]
[role]

이런 폴더는 PowerShell에서 와일드카드처럼 해석될 수 있으므로 -LiteralPath를 쓰거나 Node로 생성한다.

JSX Hook 위치 주의

React Hook은 반드시 컴포넌트 최상단 레벨에 둔다.
함수 내부, 조건문 내부, return 직전 잘못된 위치에 넣지 않는다.

자동 입력 방식

워크플로우에서 작업대로 보내기는 현재 아래 구조를 사용한다.

localStorage["mamabot.pendingWorkbenchPrompt"] = prompt
window.dispatchEvent("mamabot:send-to-workbench")
AppShell이 dashboard로 이동
WorkbenchChatPanel이 pendingWorkbenchPrompt를 읽어 setPrompt

Team Coding Mode도 이 구조를 그대로 재사용한다.

<!-- MAMABOT_DASHBOARD_HISTORY_NAME_FIX_20260514_BEGIN -->

# Dashboard / History Naming and Restore Flow Fix - 2026-05-14

## 변경 내용

- Sidebar의 dashboard 표시명을 "작업대"에서 "대시보드"로 정리했다.
- Sidebar에 "실행 이력" 메뉴를 추가했다.
- unicode escape 문자열이 화면에 그대로 보이던 설명 문구를 JSX expression 방식으로 보정했다.
- AppShell에서 ConversationSidebar의 run 클릭 시 activeTab을 history가 아니라 dashboard로 이동하도록 수정했다.
- dashboard 내부는 기존처럼 DashboardPanel -> WorkbenchPanel -> WorkbenchChatPanel 흐름을 유지한다.
- WorkbenchPanel 화면 제목도 "대시보드"로 통일했다.

## 유지한 구조

- 내부 탭 id는 변경하지 않았다.
- dashboard = 대시보드 / Workbench 실행 화면
- chat = 작업 채팅 / 기존 AgentPanel
- history = 실행 이력
- workflows = 워크플로우 템플릿

## 수정 파일

- app/components/Sidebar.jsx
- app/components/AppShell.jsx
- app/components/WorkbenchPanel.jsx
- plan.md

## 다음 확인 사항

1. 사이드바 첫 메뉴가 "대시보드"로 보이는지 확인한다.
2. "실행 이력" 메뉴가 보이는지 확인한다.
3. 실행 이력 run 클릭 시 대시보드에 prompt/output이 복원되는지 확인한다.
4. 워크플로우 메뉴가 템플릿 화면으로 분리되어 있는지 확인한다.

<!-- MAMABOT_DASHBOARD_HISTORY_NAME_FIX_20260514_END -->

<!-- MAMABOT_AGENT_REGISTRY_PROVIDER_SPLIT_20260514_BEGIN -->

# Agent Registry / Provider Split - 2026-05-14

## 결정

Mamabot은 모델 목록 중심이 아니라 실행 대상 Agent 중심으로 구조를 분리한다.

## 분리 기준

- Claude Code / Codex CLI / Gemini CLI / OpenCode는 auth-cli Agent로 관리한다.
- OpenRouter / OpenAI API / Anthropic API / Gemini API는 api-model Provider로 관리한다.
- Ollama는 local Provider로 관리한다.
- 무료 모델은 OpenRouter API Provider 안에서 많이 사용할 수 있게 유지한다.
- OAuth/구독형 CLI Agent 실행 시 API Key 환경변수를 scrub하여 인증 충돌을 막는다.

## 추가 파일

- config/agents.json
- app/lib/agentRegistry.js
- app/lib/agentEnv.js
- app/api/agents/route.js

## 다음 작업

1. /api/agents API 응답 확인
2. AgentPanel 상단 선택기를 "모델 선택" 중심에서 "실행 대상 선택" 중심으로 변경
3. 실행 대상이 openrouter/hermes일 때만 OpenRouter 무료 모델 선택 UI 노출
4. Claude Code / Codex / Gemini CLI 선택 시 OAuth 상태와 CLI 상태만 표시
5. /api/agent/run에서 agentId/backendKind/envPolicy를 저장하고 env scrubber 적용

<!-- MAMABOT_AGENT_REGISTRY_PROVIDER_SPLIT_20260514_END -->

<!-- MAMABOT_AUTH_UI_SINGLE_OWNER_20260514_BEGIN -->

# Auth UI Single Owner - 2026-05-14

## 결정

인증/로그인/토큰 갱신 UI는 모델 / 인증 화면으로 통일한다.

## 역할 분리

- 대시보드: 작업 실행과 설정된 모델 사용에 집중한다.
- 작업 채팅: 실행 대상 Agent 선택과 실행에 집중한다.
- 모델 / 인증: API Key, OAuth Provider, CLI Agent 로그인/갱신을 전담한다.

## 변경 내용

- AgentPanel의 중복 OAuth 로그인 / 갱신 버튼을 제거했다.
- AgentPanel에는 OAuth CLI Agent 안내 문구만 남겼다.
- WorkbenchChatPanel에는 로그인 UI를 넣지 않는다.

## 다음 작업

1. 모델 / 인증 화면의 CLI Agents 섹션을 Claude Code / Codex CLI / Gemini CLI 중심으로 정리한다.
2. 각 CLI Agent에 로그인/갱신 버튼과 상태 확인 버튼을 연결한다.
3. 대시보드와 작업 채팅은 인증 버튼 없이 실행 대상과 모델 선택만 표시한다.

<!-- MAMABOT_AUTH_UI_SINGLE_OWNER_20260514_END -->

<!-- MAMABOT_MODELS_PANEL_CLI_MODEL_BADGES_20260514_BEGIN -->

# ModelsPanel CLI Agent Model Badges - 2026-05-14

## 변경 내용

- 모델 / 인증 화면의 CLI Agents 영역을 Claude Code / Codex CLI / Gemini CLI 카드 구조로 확장했다.
- 각 CLI Agent 카드에 Login / Refresh / 상태 Badge를 표시한다.
- /api/model-badges 기반으로 사용 가능 모델을 최신순으로 표시한다.
- 모델별 최신 / 추천 / 안정 / 빠름 / 코딩 / 추론 / 구독 / CLI Badge를 표시한다.

## 유지 원칙

- 로그인/토큰 갱신은 모델 / 인증 화면에서만 관리한다.
- 대시보드와 작업 채팅에는 중복 로그인 버튼을 추가하지 않는다.
- 대시보드는 설정된 모델과 즐겨찾기 모델 중심으로 유지한다.

## 다음 작업

1. 브라우저에서 CLI Agents 카드 3개 표시 확인
2. 각 카드의 사용 가능 모델 뱃지 확인
3. 대시보드 무료 모델 드롭다운에 FREE / 인기 / 최신 / 64K+ 뱃지 연결
4. Codex CLI / Gemini CLI status route 추가

<!-- MAMABOT_MODELS_PANEL_CLI_MODEL_BADGES_20260514_END -->

<!-- MAMABOT_MODELS_PANEL_CLI_LABEL_CLEANUP_20260514_BEGIN -->

# ModelsPanel CLI Label Cleanup - 2026-05-14

## 변경 내용

- 모델 / 인증 화면의 OAuth Providers 섹션명을 CLI 인증 에이전트로 변경했다.
- Claude Code가 connected 상태일 때 Not installed로 보이던 설명을 Connected로 표시하도록 수정했다.

<!-- MAMABOT_MODELS_PANEL_CLI_LABEL_CLEANUP_20260514_END -->

<!-- MAMABOT_MODEL_HEALTH_CHECK_UI_20260514_BEGIN -->

# Model Health Check UI - 2026-05-14

## 변경 내용

- 모델 / 인증 화면에 모델 생존 확인 섹션을 추가했다.
- OpenRouter 모델은 최신 모델 목록에 존재하는지 기준으로 ALIVE / MISSING을 표시한다.
- 즐겨찾기 모델에는 FREE / 64K+ / 대용량 badge를 함께 표시한다.
- Claude Code / Codex CLI / Gemini CLI 모델 카탈로그는 /api/model-badges 기준으로 CATALOG OK / ERROR를 표시한다.

## 주의

- 이 단계의 생존 확인은 저비용 안전 확인이다.
- 실제 모델 호출 ping은 비용/쿼터를 쓰므로 다음 단계에서 선택 모델 대상으로만 추가한다.

<!-- MAMABOT_MODEL_HEALTH_CHECK_UI_20260514_END -->

<!-- MAMABOT_CLI_AGENT_COMPACT_HEALTH_UI_20260514_BEGIN -->

# CLI Agent Compact Health UI - 2026-05-14

## 변경 내용

- 모델 / 인증 화면의 CLI 인증 에이전트 헤더에 모델 생존 확인 버튼을 배치했다.
- Claude Code / Codex CLI / Gemini CLI의 사용 가능 모델 목록을 기본 접힘 상태로 변경했다.
- 각 Agent 카드에서 펼치기 / 접기 버튼으로 모델 목록을 확장할 수 있게 했다.
- 섹션 제목을 OAuth Providers에서 CLI 인증 에이전트로 정리했다.

<!-- MAMABOT_CLI_AGENT_COMPACT_HEALTH_UI_20260514_END -->

<!-- MAMABOT_DASHBOARD_AUTH_MODELS_AND_STAR_BADGES_20260514_BEGIN -->

# Dashboard Auth Models and Star Badges - 2026-05-14

## 변경 내용

- 대시보드 모델 드롭다운에 Claude Code / Codex CLI / Gemini CLI 인증방식 모델 optgroup을 추가했다.
- 인증방식 모델 선택 시 provider는 해당 CLI Agent로, model은 실제 모델 id로 분리해 전송한다.
- 검정 별 문자(★)를 컬러감 있는 별(🌟)로 변경했다.
- 로그인/인증 버튼은 대시보드에 추가하지 않고 모델 / 인증 화면에서만 관리한다.

## 다음 작업

1. 대시보드 모델 드롭다운에서 인증방식 모델 optgroup 표시 확인
2. 별 아이콘이 컬러 별로 보이는지 확인
3. auth-cli provider 실행은 아직 runner가 없으므로 안전 차단 메시지가 뜨는지 확인
4. 다음 단계에서 auth-cli 전용 runner 연결

<!-- MAMABOT_DASHBOARD_AUTH_MODELS_AND_STAR_BADGES_20260514_END -->

<!-- MAMABOT_DASHBOARD_AUTH_MODELS_FALLBACK_20260514_BEGIN -->

# Dashboard Auth CLI Model Fallback - 2026-05-14

## 변경 내용

- 대시보드 모델 드롭다운의 인증방식 모델 그룹에 fallback 데이터를 추가했다.
- /api/model-badges 로딩 전이나 실패 시에도 Claude Code / Codex CLI / Gemini CLI 모델이 보이도록 했다.
- cliModelGroups 초기값을 fallback으로 설정했다.
- loadCliModelGroups 호출을 초기 로딩 단계에서 보장했다.

<!-- MAMABOT_DASHBOARD_AUTH_MODELS_FALLBACK_20260514_END -->

<!-- MAMABOT_AUTHCLI_OPENROUTER_LEAK_GUARD_20260514_BEGIN -->

# Auth CLI OpenRouter Leak Guard - 2026-05-14

## 문제

대시보드에서 Claude Code / Codex CLI / Gemini CLI 인증방식 모델을 선택해도 /api/agent/run의 Quick direct 분기가 먼저 OpenRouter direct 실행으로 빠지는 문제가 있었다.

## 변경 내용

- /api/agent/run에 isAuthCliProvider helper를 추가했다.
- Claude Code / Codex CLI / Gemini CLI / OpenCode provider는 OpenRouter direct 분기 전에 early guard로 차단한다.
- auth-cli 전용 runner가 붙기 전까지는 명확한 안내 메시지를 반환한다.

## 다음 작업

1. auth-cli 전용 runner 구현
2. Claude Code 실행: claude CLI 기반
3. Codex 실행: codex CLI 기반
4. Gemini 실행: gemini CLI 기반
5. 실행 결과를 기존 run history/session store에 저장

<!-- MAMABOT_AUTHCLI_OPENROUTER_LEAK_GUARD_20260514_END -->

<!-- MAMABOT_AUTH_CLI_RUNNER_V1_20260514_BEGIN -->

# Auth CLI Runner V1 - 2026-05-14

## 변경 내용

- Claude Code / Codex CLI / Gemini CLI 모델 선택 시 OpenRouter direct 호출로 빠지지 않고 공식 CLI 명령으로 실행하도록 auth-cli runner를 추가했다.
- Claude Code는 claude -p 프롬프트 --model 모델 형태로 실행한다.
- Codex CLI는 codex exec 프롬프트 -m 모델 -C 작업폴더 형태로 실행한다.
- Gemini CLI는 gemini -p 프롬프트 -m 모델 --skip-trust 형태로 실행한다.
- OAuth/구독형 CLI 실행 시 관련 API Key 환경변수를 scrub한다.

## 제한

- V1은 결과를 즉시 화면에 반환하는 실행 경로다.
- 기존 run history/session store 완전 저장 연동은 다음 단계에서 보강한다.
- 긴 실행/스트리밍은 다음 단계에서 분리한다.

<!-- MAMABOT_AUTH_CLI_RUNNER_V1_20260514_END -->

<!-- MAMABOT_AUTHCLI_WORKSPACE_ROOT_FIX_20260514_BEGIN -->

# Auth CLI Workspace Root Fix - 2026-05-14

## 문제

대시보드에는 workspace가 표시되지만 auth-cli runner가 workspaceRoot 계산 전에 실행되어 "workspace is not selected" 오류가 발생했다.

## 변경 내용

- WorkbenchChatPanel의 /api/agent/run payload에 workspaceRoot와 workspace를 명시적으로 포함했다.
- /api/agent/run에서 auth-cli runner/guard 실행 전에 body.workspaceRoot/body.workspace 값을 workspaceRoot에 조기 바인딩하도록 수정했다.

<!-- MAMABOT_AUTHCLI_WORKSPACE_ROOT_FIX_20260514_END -->

<!-- MAMABOT_AUTH_CLI_RUNNER_ENV_QUOTING_FIX_20260514_BEGIN -->

# Auth CLI Runner Env / Quoting Fix - 2026-05-14

## 문제

- Claude CLI는 직접 실행 시 로그인 상태였지만 Mamabot route에서는 Not logged in이 발생했다.
- 원인은 auth-cli runner가 HOME/USERPROFILE/CLAUDE_CONFIG_DIR을 runtime 폴더로 강제 변경했기 때문이다.
- Gemini CLI는 직접 실행 시 성공했지만 Mamabot route에서는 --prompt와 positional prompt가 동시에 들어갔다는 오류가 발생했다.
- 원인은 shell:true 실행 중 prompt 인자 quoting이 깨진 것이다.
- Codex CLI는 --skip-git-repo-check가 필요했다.

## 변경 내용

- auth-cli runner에서 HOME/USERPROFILE 강제 변경을 제거했다.
- Claude Code runner에서 CLAUDE_CONFIG_DIR 강제 주입을 제거했다.
- Windows에서는 PowerShell 명시 호출과 단일 인자 quoting으로 CLI를 실행하도록 수정했다.
- Codex runner에 --skip-git-repo-check 옵션을 보장했다.

## 다음 확인

1. Claude route ping
2. Gemini route ping
3. Codex는 CLI 업데이트 또는 지원 모델 확인 후 재테스트

<!-- MAMABOT_AUTH_CLI_RUNNER_ENV_QUOTING_FIX_20260514_END -->

<!-- MAMABOT_CODEX_MODEL_COMPATIBILITY_BADGES_20260514_BEGIN -->

# Codex Model Compatibility Badges - 2026-05-14

## 변경 내용

- Codex CLI 모델 목록에 현재 환경 기준 호환성 경고 badge를 추가했다.
- gpt-5.5는 최신 모델이지만 현재 Codex CLI/계정 조합에서 업데이트 필요 오류가 발생할 수 있어 "업데이트 필요" badge를 표시한다.
- gpt-5는 ChatGPT 로그인 방식에서 미지원 오류가 발생할 수 있어 "계정 미지원 가능" badge를 표시한다.
- codex-default 후보를 추가해 모델명 지정 없이 Codex 기본 설정으로 테스트할 수 있게 했다.

## 참고

- Codex CLI 공식 문서는 ChatGPT 로그인 기반 사용을 지원한다.
- 다만 GitHub 이슈상 gpt-5.5 / gpt-5.4 / gpt-5 모델은 CLI 버전과 계정 조건에 따라 오류가 발생할 수 있다.

<!-- MAMABOT_CODEX_MODEL_COMPATIBILITY_BADGES_20260514_END -->

