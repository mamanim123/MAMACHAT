# Mamabot Portable Package

생성일: 20260514-233107

## 집/사무실 실행 방법

### 사무실에서 실행
01-start-office.bat

### 집에서 실행
01-start-home.bat

## 처음 가져온 PC에서 필요한 경우

setup-office.bat 또는 npm run setup:office 실행

## 개발 서버

브라우저:
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

- Quick Mode를 바로 쓰려면 secrets\.env.local 안에 OPENROUTER_API_KEY가 있어야 합니다.
- Hermes venv는 PC 환경 의존성이 있어 제외합니다.
- 새 PC에서는 setup-office.bat을 한 번 실행하세요.
- 매일 실행은 01-start-office.bat 또는 01-start-home.bat만 누르면 됩니다.
