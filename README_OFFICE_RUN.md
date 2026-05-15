# Mamabot Office Package

생성일: 20260514-065620

## 사무실 PC에서 실행 방법

1. ZIP 압축을 푼다.
2. PowerShell을 열고 압축 푼 폴더로 이동한다.

cd 압축푼경로\mamabot-office-20260514-065620
npm install
npm run dev

3. 브라우저에서 접속한다.

http://localhost:3200

## 포함 여부

- secrets 포함: True
- git 기록 포함: True
- 대화 세션 포함: True

## 제외된 주요 폴더

- node_modules
- .next
- backups
- 참고자료
- runtime/workspace-index
- runtime/hermes/logs
- runtime/hermes/runs
- runtime/hermes/home/hermes-agent/venv
- config/cache

## 참고

- Quick Mode를 바로 쓰려면 secrets\.env.local 안에 OPENROUTER_API_KEY가 있어야 한다.
- Hermes venv는 PC 환경 의존성이 있어서 제외했다.
- workspace-index는 사무실에서 작업폴더 선택 후 "인덱스 갱신" 버튼으로 다시 만들면 된다.
