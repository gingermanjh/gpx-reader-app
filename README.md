# GPX Reader App

브라우저에서 GPX 파일을 로컬로 열어 지도, 고도 그래프, 기본 통계, 레이스 전 코스 전략 정보를 확인하는 React/Vite 웹앱.

## 주요 기능

- **로컬 GPX 읽기** — 파일 선택 / 드래그 앤 드롭 / 번들 샘플 로드 지원
- **지도 시각화** — track, route, waypoint를 구분해 Leaflet 지도에 렌더링
- **시작/종료 라벨** — 트랙 시작/종료, 루트 시작/종료를 지도에 명확하게 표시
- **활동 요약** — 거리, 경과 시간, 고도 범위, 누적 상승/하강, GPX 구조 요약
- **D3 프로파일 차트** — 고도/속도 그래프, min/max, hover 지점 값, 구간 드래그 확대
- **경사도 기반 코스 분석** — 급오르막/오르막/평지/내리막/급내리막 색상 구분
- **레이스 전략 정보** — climb/descent 구간, split planner, grade distribution, course warnings
- **보급 지점 타임라인** — GPX waypoint를 aid station/checkpoint 후보로 해석
- **목표 시간 / 컷오프 계산** — split별 권장 페이스, 예상 도착, 컷오프 여유 표시
- **수동 레이스 컨텍스트** — 더위/습도, 고도/노출, 야간, 노면 정보를 체크리스트로 기록
- **PNG 리포트 내보내기** — 지도/차트/전략 정보를 이미지 리포트로 저장

## 샘플 GPX

| 파일 | 설명 |
|------|------|
| `public/sample/demo.gpx` | waypoint, route, multi-segment track이 포함된 작은 데모 파일 |
| `public/sample/wonju-mammut-35k.gpx` | Garmin Connect에서 가져온 원주 마무트마운틴레이스 35km 샘플 코스 |

앱 화면의 `Load demo`, `Load 35K sample` 버튼으로 바로 불러올 수 있습니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI | React 19, TypeScript |
| 번들러 | Vite |
| 지도 | Leaflet, React Leaflet, OpenStreetMap tile layer |
| 시각화 | D3 |
| GPX 처리 | DOMParser 기반 브라우저 로컬 파싱 |
| PNG export | html-to-image + SVG 차트 rasterize |
| 테스트 | Vitest, Testing Library, Playwright |
| 품질 | ESLint, TypeScript project references |

## 프로젝트 구조

```text
gpx-reader-app/
├── public/
│   └── sample/
│       ├── demo.gpx                    # 작은 데모 GPX
│       └── wonju-mammut-35k.gpx        # 35K 레이스 샘플 GPX
├── src/
│   ├── App.tsx                         # 앱 상태/파이프라인 조립
│   ├── components/
│   │   ├── charts/ActivityCharts.tsx    # D3 고도/속도 프로파일
│   │   ├── details/EntityBreakdown.tsx  # GPX 구조 설명
│   │   ├── export/ExportReportButton.tsx# PNG 리포트 내보내기
│   │   ├── import/ImportPanel.tsx       # 로컬/샘플 GPX 로드
│   │   ├── map/ActivityMap.tsx          # Leaflet 지도 렌더링
│   │   ├── race/RacePlanner.tsx         # 레이스 전 코스 전략 UI
│   │   ├── summary/SummaryCards.tsx     # 핵심 통계 카드
│   │   └── ui/                          # Card, Badge, Tooltip 등 공통 UI
│   ├── lib/
│   │   ├── gpx/
│   │   │   ├── parseGpx.ts              # GPX XML 파서
│   │   │   ├── deriveStats.ts           # 거리/시간/고도 통계
│   │   │   ├── activitySeries.ts        # 차트용 누적 거리 시계열
│   │   │   ├── courseAnalysis.ts        # 경사도/구간/split/aid 분석
│   │   │   └── toRenderModel.ts         # 지도 렌더 모델 변환
│   │   └── io/readLocalGpx.ts           # File API / 번들 샘플 로드
│   └── styles/app.css                   # 전체 스타일
├── tests/
│   ├── app/                             # React import flow 테스트
│   ├── e2e/                             # Playwright 브라우저 테스트
│   ├── fixtures/                        # GPX 테스트 fixture
│   └── gpx/                             # GPX 도메인 로직 테스트
└── vite.config.ts
```

## 분석 파이프라인

1. `File.text()` 또는 번들 샘플 fetch로 GPX XML을 읽습니다.
2. `parseGpx`가 `wpt`, `rte/rtept`, `trk/trkseg/trkpt` 구조를 보존해 파싱합니다.
3. `deriveStats`가 track distance, elapsed time, elevation gain/loss, structure count를 계산합니다.
4. `activitySeries`가 D3 차트용 누적 거리 시계열을 만듭니다.
5. `courseAnalysis`가 각 leg의 경사도, climb/descent segment, grade distribution, split, aid station, warning을 계산합니다.
6. 지도, 차트, summary, race planner가 같은 분석 모델을 공유합니다.

## 레이스 전략 계산 방식

### 경사도 구분

| 구분 | 기준 |
|------|------|
| 급내리막 | `grade <= -8%` |
| 내리막 | `-8% < grade < -3%` |
| 평지 | `-3% <= grade <= 3%` |
| 오르막 | `3% < grade < 8%` |
| 급오르막 | `grade >= 8%` |

### 목표 완주 시간

목표 완주 시간을 입력하면 경사도 기반 effort factor로 split별 시간을 배분합니다.

- Split planner의 `권장 페이스`
- Split planner의 `예상 도착`
- Aid station timeline의 `예상 도착`

에 반영됩니다.

### 컷오프 시간

컷오프 시간을 입력하면 전체 컷오프 시간을 거리 비율로 각 aid station에 배분하고, 목표 완주 시간 기반 예상 도착과 비교해 `컷오프 여유`를 표시합니다.

> 현재 컷오프는 aid station별 공식 컷오프가 아니라 전체 컷오프의 거리비례 추정입니다.

## 개인정보 / 네트워크

- 로컬에서 선택한 GPX 파일 본문은 서버로 업로드하지 않습니다.
- 파싱과 분석은 브라우저에서 수행합니다.
- 지도 배경을 표시하기 위해 OpenStreetMap tile provider로 tile 요청이 발생할 수 있습니다.
- PNG 리포트 내보내기 시 지도 타일은 브라우저/CORS 상황에 따라 포함되지 않을 수 있으며, 실패한 타일은 placeholder 처리됩니다.

## 개발 환경

```bash
npm install
npm run dev
```

기본 개발 서버:

```text
http://127.0.0.1:5173/
```

## 품질 검증

```bash
npm run lint
npm run typecheck
npm run test
npx playwright test
npm run build
```

현재 테스트 범위:

- GPX XML 파싱
- coordinate validation / malformed XML diagnostics
- distance/time/elevation 통계
- D3 activity series
- 경사도 기반 course analysis
- React import flow
- 브라우저 e2e: 샘플 로드, local import, privacy/network check, PNG export

## 제약 / 향후 개선

- GPX 편집/저장 기능은 없습니다.
- 로그인, 클라우드 동기화, 라이브 트래킹은 없습니다.
- grade-adjusted pace는 Strava/Garmin 수준의 공식 알고리즘이 아니라 단순 effort weighting 모델입니다.
- 공식 aid station/cutoff 정보를 GPX waypoint와 별도로 편집하는 기능은 아직 없습니다.
- 외부 날씨, 노면, 야간, 고도 노출도는 API 연동 없이 수동 입력 방식입니다.

## 라이선스

개인 프로젝트. 별도 라이선스 미지정.
