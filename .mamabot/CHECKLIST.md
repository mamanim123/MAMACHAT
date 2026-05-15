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
