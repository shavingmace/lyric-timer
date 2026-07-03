# GitHub Actions — 자동 배포

`master`에 push하면 테스트 → 빌드 → GitHub Pages 배포까지 자동으로 수행하는 워크플로다.

- 워크플로 파일: `.github/workflows/deploy.yml`
- 배포 URL: https://shavingmace.github.io/lyric-timer/
- 산출물: `dist/index.html` (JS/CSS 전부 인라인된 단일 파일)

## 설계 목적

이 앱의 결과물은 **단일 HTML 파일**이다. 소스에서 언제든 재생성 가능하므로 `dist/`는
git에 커밋하지 않고(`.gitignore`), 대신 CI가 빌드해 Pages로 배포한다. 덕분에:

- 리포 히스토리는 소스만 담아 깨끗하게 유지된다.
- 소스와 배포본의 불일치(빌드 깜빡)가 원천 차단된다.
- 누구나 빌드 없이 URL로 최신 버전을 바로 쓸 수 있다.

## 트리거

```yaml
on:
  push:
    branches: [master]   # master push 시 자동
  workflow_dispatch:      # Actions 탭에서 수동 실행
```

## 잡 구조

두 잡이 순차 실행된다: `build` → (`needs`) → `deploy`.

### build

| 스텝 | 내용 |
|------|------|
| `actions/checkout@v5` | 소스 체크아웃 |
| `actions/setup-node@v6` (node 24, npm 캐시) | Node 런타임 + 의존성 캐시 |
| `npm ci` | lockfile 기반 설치 |
| `npm test` | Vitest 실행 — **실패 시 배포 중단** |
| `npm run build` | `dist/index.html` 생성 |
| `actions/configure-pages@v6` (`enablement: true`) | Pages 설정 로드(있으면 활성화) |
| `actions/upload-pages-artifact@v5` (`path: dist`) | `dist`를 Pages 아티팩트로 업로드 |

테스트를 빌드 앞에 두어, 깨진 코드가 배포되지 않도록 게이트로 삼는다.

### deploy

- `actions/deploy-pages@v5`로 아티팩트를 Pages에 게시.
- `environment: github-pages`, 배포 URL은 `steps.deployment.outputs.page_url`로 노출.

## 권한 · 동시성

```yaml
permissions:
  contents: read     # 소스 읽기
  pages: write       # Pages 게시
  id-token: write    # OIDC (deploy-pages 인증)

concurrency:
  group: pages
  cancel-in-progress: true   # 새 배포가 뜨면 진행 중인 이전 배포는 취소
```

동시성 그룹 덕분에 짧은 간격으로 여러 번 push해도 **가장 최신 것만** 배포된다.
(이전 run이 `cancelled`로 보이는 건 정상.)

## 최초 1회 설정 (운영 메모)

Actions의 기본 `GITHUB_TOKEN`은 **Pages 사이트를 최초 생성할 권한이 없다.**
그래서 리포 최초 세팅 시 관리자 권한으로 Pages를 한 번 활성화해야 한다:

```bash
gh api -X POST repos/shavingmace/lyric-timer/pages -f build_type=workflow
```

한 번 활성화된 뒤로는 `configure-pages`의 `enablement: true`가 기존 설정을 읽어
정상 동작한다. (이미 활성화돼 있으면 이 단계는 다시 할 필요 없음.)

## 사용법

### 자동 배포
`master`에 push → 워크플로가 자동 실행 → 통과 시 URL 갱신.

```bash
git push origin master
```

> 이 리포는 승인 전 push 금지 규칙이 있다. push = 즉시 배포임을 유의.

### 수동 실행
- GitHub → **Actions** 탭 → *Deploy to GitHub Pages* → **Run workflow**
- 또는 CLI:

```bash
gh workflow run "Deploy to GitHub Pages"
```

### 상태 확인 / 재실행

```bash
gh run list --limit 5                 # 최근 실행 목록
gh run view <run-id>                  # 상세
gh run view <run-id> --log-failed     # 실패 로그만
gh run rerun <run-id>                 # 재실행
gh run watch <run-id>                 # 완료까지 관찰
```

배포 확인:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://shavingmace.github.io/lyric-timer/
```

## 로컬과의 관계

CI가 하는 일은 로컬 명령과 동일하다. 배포 전에 로컬에서 재현하려면:

```bash
npm ci
npm test
npm run build      # dist/index.html
npm run preview    # 빌드 결과 미리보기
```

## 트러블슈팅

| 증상 | 원인 / 조치 |
|------|-------------|
| `Resource not accessible by integration` (Create Pages site) | Pages 미활성화. 위 **최초 1회 설정**의 `gh api` 실행. |
| 배포는 성공인데 사이트가 옛 버전 | 브라우저 캐시 / CDN 지연. 잠시 후 강력 새로고침. |
| 이전 run이 `cancelled` | 동시성 그룹이 최신 push로 취소한 것. 정상. |
| 테스트 실패로 배포 안 됨 | `gh run view <id> --log-failed`로 실패 테스트 확인 후 수정. |
| `Node.js 20 deprecated` 경고 | 액션 내부 런타임 공지. 빌드 영향 없음. 액션 메이저 버전 올리면 사라짐. |

## 버전 갱신

액션/Node 버전은 `deploy.yml`에서 관리한다. 최신 메이저 확인:

```bash
for a in actions/checkout actions/setup-node actions/configure-pages \
         actions/upload-pages-artifact actions/deploy-pages; do
  echo "$a -> $(gh api repos/$a/releases/latest --jq .tag_name)"
done
```
