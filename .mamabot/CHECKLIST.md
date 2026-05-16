# Mamabot Checklist

## 복구
- [ ] config/model-badges.json JSON 문법 확인
- [ ] /api/model-badges?agentId=claude-code 정상 확인
- [ ] /api/model-badges?agentId=codex-cli 정상 확인
- [ ] /api/model-badges?agentId=gemini-cli 정상 확인

## 문서 구조
- [x] 기존 plan.md 내용을 WORKLOG로 분리
- [x] plan.md를 짧은 현재 계획으로 축소
- [ ] PROJECT_INDEX.md 상세화
- [ ] CLAUDE.md 라우터화
- [ ] AGENTS.md 생성 및 라우터화
- [ ] GEMINI.md 생성 및 라우터화

## 실행 구조
- [ ] Quick 모드 blank cwd 격리 확인
- [ ] Coding/Agent 모드 workspace 접근 확인
- [ ] Agent 작업 시 PROJECT_INDEX 우선 참조 확인

- [x] CLAUDE.md 라우터화
- [x] AGENTS.md 생성 및 라우터화
- [x] GEMINI.md 생성 및 라우터화
- [ ] Agent/Coding 모드에서 PROJECT_INDEX 우선 참조 확인
- [ ] Quick Chat이 프로젝트 컨텍스트를 읽지 않는지 확인

## 2026-05-16 13:23:17 인증형 CLI / Codex 체크리스트
- [x] 인증형 CLI 실행 결과를 대화창 세션에 저장
- [x] 인증형 CLI 백그라운드 실행 구조 적용
- [x] Codex CLI codex exec 기반 실행 확인
- [x] Codex stdin prompt 전달 확인
- [x] auth-cli 경로에서 workspace index 후보 사용
- [x] AGENTS.md / PROJECT_INDEX.md 토큰 절약 정책 정리
- [ ] Codex suggest 모드 sandbox/approval 정책 보정
- [ ] Codex reasoning effort 프로필별 분리
- [ ] Windows shell quoting 안정화
