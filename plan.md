# Lyric Timer — TDD Plan

Spec: `whiteboard/2026-07-02-1754_lyric-timer-spec.md`
각 항목 = 작은 실패 테스트 하나. 완료 시 `[x]`.

## core/cues — cue 생성·정렬·편집 (순수 함수, 경과초 입력)
- [x] tap(경과초, 기본duration) 하나 → cue 1개, start/duration/text=""/index=0/id 부여
- [x] tap 두 번 → cue 2개, index 0,1, id 서로 다름
- [x] start는 소수 3자리로 반올림
- [x] 순서가 뒤섞인 tap 입력 → start 오름차순 정렬 + index 재계산
- [x] undo → 마지막으로 추가한 cue 제거 (정렬과 무관하게 "가장 최근 추가분")
- [x] 재정렬/편집해도 id는 불변, index만 재계산
- [x] 겹침 감지: cue.start < 이전 cue.start+duration 인 구간 목록 반환

## core/schema — 직렬화/파싱/검증/마이그레이션
- [x] serialize: 상태 → version/meta/cues 구조의 객체
- [x] parse: 유효한 v1 객체 → 상태로 왕복(round-trip) 동일
- [x] parse: version 누락/미지원 → 에러
- [x] parse: cues 필드 형식 오류 → 에러
- [x] updatedAt은 serialize 시 주입된 시각으로 설정 (시각은 인자로 주입)

## core/tokenize — 가사 토큰화 & cue 분배
- [x] tokenize(text, "word") → 공백 기준 분리, 빈 토큰 제거
- [x] tokenize(text, "syllable") → 한글 완성형 글자 단위 분리(공백 제거)
- [x] distribute(tokens, cues): 개수 일치 → 각 cue.text 채움
- [x] distribute: 토큰이 더 많음 → 남는 토큰 목록 함께 반환(경고)
- [x] distribute: 토큰이 더 적음 → 빈 cue 개수 함께 반환(경고)
