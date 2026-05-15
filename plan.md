# Mamabot Active Plan

## 현재 목표
인증형 CLI 실행 모드에서 Quick Chat과 Coding Agent를 분리하고, 에이전트 작업은 인덱스 기반으로 수행하게 만든다.

## 현재 우선순위
1. model-badges API 500 복구
2. plan.md 경량화 및 작업 기록 분리
3. .mamabot 인덱스 문서 생성
4. CLAUDE.md / AGENTS.md / GEMINI.md를 짧은 라우터 문서로 정리
5. auth-cli Agent/Coding 모드에서 PROJECT_INDEX 기반 작업 흐름 적용
6. Quick 모드는 프로젝트 파일을 읽지 않는 blank cwd로 격리

## 현재 작업 규칙
- plan.md는 현재 목표와 다음 작업만 짧게 유지한다.
- 긴 기록은 .mamabot/WORKLOG.md에 보관한다.
- 에이전트는 처음부터 전체 파일을 읽지 않는다.
- 먼저 .mamabot/PROJECT_INDEX.md에서 관련 파일 위치를 확인한다.
- 필요한 파일만 부분적으로 읽고 수정한다.
- 수정 전에는 외부 백업 폴더에 백업한다.
