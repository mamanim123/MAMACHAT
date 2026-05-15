# Mamabot Project Index

이 파일은 에이전트가 전체 파일을 무작정 읽지 않도록 돕는 라우터 인덱스이다.

## 핵심 실행 파일

### app/api/agent/run/route.js
- 역할: 에이전트 실행 API의 핵심 라우터
- 관련 기능:
  - Hermes 실행
  - Claude Code / Codex CLI / Gemini CLI 인증형 실행
  - workspaceRoot 처리
  - 실행 결과 저장
  - 권한/토큰/프로필 처리

### app/components/WorkbenchChatPanel.jsx
- 역할: 대시보드 채팅 UI
- 관련 기능:
  - 인증방식 선택
  - 모델 선택
  - workspace 선택
  - 실행 요청
  - 실행 결과 표시
  - workspace index 갱신 버튼

### app/components/AgentPanel.jsx
- 역할: 기존 Agent 실행 패널
- 관련 기능:
  - provider/model 선택
  - 실행 요청
  - CLI 모델 선택기 일부

### config/model-badges.json
- 역할: 인증형 CLI 모델 목록
- 관련 기능:
  - Claude Code 모델 목록
  - Codex CLI 모델 목록
  - Gemini CLI 모델 목록

### app/lib/modelBadges.js
- 역할: model-badges.json 로더

### app/api/model-badges/route.js
- 역할: 모델 목록 API

### app/lib/workspaceIndex.js
- 역할: workspace 인덱스 생성/검색

### app/api/workspace/index/route.js
- 역할: workspace index 생성 API

### app/api/workspace/index/search/route.js
- 역할: workspace index 검색 API

## 문서 파일

### plan.md
- 현재 목표와 다음 작업만 짧게 유지한다.

### .mamabot/ACTIVE_PLAN.md
- 현재 진행 중인 작업만 기록한다.

### .mamabot/CHECKLIST.md
- 완료/미완료 상태를 관리한다.

### .mamabot/DECISIONS.md
- 확정된 설계 결정을 기록한다.

### .mamabot/WORKLOG.md
- 긴 작업 기록을 보관한다.
- 에이전트는 사용자가 명시적으로 요청하지 않는 한 자동으로 읽지 않는다.

## 작업 원칙
1. 먼저 이 PROJECT_INDEX.md를 확인한다.
2. 관련 파일 위치를 찾는다.
3. 필요한 파일만 부분적으로 읽는다.
4. 수정 전 백업한다.
5. 수정 후 git diff와 테스트 결과만 확인한다.


## Agent router files

### CLAUDE.md
- Loaded by Claude Code.
- Keep short.
- Router only.

### AGENTS.md
- Loaded by Codex CLI.
- Keep short.
- Router only.

### GEMINI.md
- Loaded by Gemini CLI for project/coding mode.
- Quick Chat should avoid project context.

## Token-saving policy
- Do not read .mamabot/WORKLOG.md unless explicitly requested.
- Do not read backups, runtime logs, run history, node_modules, or .next unless the task specifically requires it.
- Prefer targeted file ranges and index search.
