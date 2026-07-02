# Lyric Timer

노래를 들으며 스페이스바로 가사 타이밍을 찍고, 각 타이밍에 가사 조각을 매핑한 뒤,
버전이 있는 JSON으로 export 하는 **단일 HTML 앱**.

작곡한 곡의 절차적 시각화를 위한 데이터 소스를 만드는 것이 목적입니다.
이 앱은 타이밍 데이터만 생성하며, 실제 렌더링(캔버스/애니메이션, 단어 하이라이트 등)은
export한 JSON을 import 하는 외부 JS 앱이 담당합니다.

## 워크플로우

1. **설정** — 곡 제목, 단위(음절/단어), 기본 지속시간 입력. 로컬 오디오 파일 업로드 또는 오디오 없이 진행. 기존 JSON import 지원.
2. **캡처** — 재생하며 스페이스바를 눌러 타이밍(cue)을 기록. 오디오가 없으면 시작 버튼 기준 경과시간을 사용.
3. **매핑** — cue마다 가사 조각을 입력하거나, 전체 가사를 붙여넣어 순차 분배.
4. **Export** — 버전이 있는 JSON으로 다운로드/복사.

## Export JSON 스키마 (v1)

```jsonc
{
  "version": "1.0",
  "meta": {
    "title": "곡 제목",
    "unit": "syllable" | "word",
    "hasAudio": true,
    "audioFileName": "song.mp3",
    "defaultDuration": 0.5,
    "totalDuration": 214.3,
    "createdAt": "2026-07-02T08:54:00Z",
    "updatedAt": "2026-07-02T08:54:00Z"
  },
  "cues": [
    { "id": "c-0001", "start": 1.234, "duration": 0.5, "text": "가", "index": 0 }
  ]
}
```

- `start`/`duration`은 초 단위(밀리초 해상도).
- `cues`는 `start` 오름차순 정렬되어 외부 렌더러의 시간→cue 탐색에 유리합니다.

## 기술 스택

- **빌드**: [Vite](https://vitejs.dev) + [vite-plugin-singlefile](https://www.npmjs.com/package/vite-plugin-singlefile) — 모든 JS/CSS를 하나의 `dist/index.html`로 인라인.
- **테스트**: [Vitest](https://vitest.dev) — 순수 로직(`src/core`) 중심.
- **언어**: TypeScript (strict).

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm test         # 테스트 1회 실행
npm run test:watch
npm run build    # dist/index.html 단일 파일 생성
```

## 구조

```
src/
├─ core/          # 순수 로직 (테스트 대상)
│  ├─ cues.ts     # cue 생성·정렬·undo·겹침 감지
│  ├─ schema.ts   # 직렬화·파싱·검증
│  └─ tokenize.ts # 가사 토큰화·분배
└─ ui/            # DOM/오디오 레이어 (개발 예정)
```

시간 소스(오디오 `currentTime` / 타이머 `performance.now()`)는 UI 레이어가 담당하고,
`core`는 "경과초를 받아 cue를 만드는" 순수 함수로 유지해 테스트 가능성을 확보합니다.

## 현재 상태

- ✅ `core` 로직 (cues · schema · tokenize) — TDD 완료, 17개 테스트 통과.
- ⬜ UI 레이어 (setup / capture / map / export 단계) — 개발 예정.
- ⬜ 단일 HTML 빌드 산출물 검증.

## 라이선스

MIT
