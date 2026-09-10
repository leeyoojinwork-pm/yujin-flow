# YUJIN FLOW | Agent Workflow Lab

이유진의 AWAC 1기 2회차, 120분 인터랙티브 강의·실습덱입니다.

## 바로 열기

`public/index.html`을 브라우저로 엽니다. 설치, 빌드, API 키, 서버가 필요하지 않습니다. `public` 안의 파일은 함께 유지하세요. 최신 Chrome을 기준으로 검증합니다.

- 64장: 문제 정의 → YUJIN FLOW → BUILD YOUR AGENT 전환 → Agent 개념 → Claude Project → Skill → 실패 미션 → Subagent 분리 기준 → 예시 갤러리 → 검증 → 만족도 조사 QR.
- 16개 실습노트, 80개 질문. 각 질문의 입력칸과 전체 내보내기.
- 모든 실습의 시간 배지를 누르면 카운트다운이 시작됩니다. 일시정지·재개·초기화와 종료 알림을 지원합니다. 사운드 버튼을 켜면 시작·종료 때 짧은 8-bit 알림음이 납니다.
- 복사와 Markdown 저장 모두 질문과 답변을 포함합니다. 미입력은 임의 예시로 채우지 않습니다.
- 각 워크시트 하단에서 Claude에 넣을 실행 요청과 전체 프롬프트 미리보기를 확인합니다. 답변을 수정하면 미리보기도 즉시 갱신됩니다.
- 샘플 CSV, 코치 MD, Skill ZIP, Claude Code starter를 바로 다운로드합니다.
- 12분 미션: 누락 응답 → 새로운 입력 → 필수 열 누락. 로컬 CSV 검수와 판단 기록.
- 파트별 성공기준 3개, 5개 중간 체크포인트, 실행 전후 원본 대조 루틴.
- 실습 도움: 환경·데이터·코드/지침 진단, 도움 요청·검증 질문 MD 다운로드, 이전 실습 복귀.
- CLI 시뮬레이션(`#/code-run`): 재생·일시정지·단계 이동·속도 조절, 역할·파일 상태, 검수 실패 후 수정과 사람 승인.
- 31장 프롬프트 기법(`#/prompt-techniques`): Copilot 메타프롬프팅, Claude XML 구조화, GPT Few-shot 예시. 같은 가상 강의자료 과제로 비교하고 프롬프트 복사·MD 저장 후 내 Agent 지침 작성으로 이어집니다. 전용·최적 기법이 아닌 수업용 연습 조합이며 공식 출처와 용어 차이를 표시합니다.
- 재생되는 순서도는 학습용 시연이며 실제 AI를 호출하지 않습니다. 실제 실행은 참여자가 Claude에서 진행합니다.
- 4장 택시 장면과 핵심 키워드 밑줄은 이야기 전환을 위한 짧은 모션입니다. 모션 감소 설정에서는 정지 상태로 표시됩니다.
- 2장은 보라색 강조 화면과 흐르는 결과물 띠, 순차 강조를 제공합니다. 정지 버튼과 모션 감소 설정을 지원합니다.
- 26장에서 각자의 문제로 Agent 명세를 작성합니다. 이전 답변은 빈칸에만 가져오며 Project 지침·첫 실행 요청·Skill로 이어집니다.
- YUJIN의 다섯 과제를 `problem.md → job-story.md → workflow.md → boundaries.md → SKILL.md`와 일대일로 연결합니다. 7장의 파일명을 누르면 해당 과제가 열립니다. 각 과제에서 질문·답변과 앞 단계 기록을 포함해 복사·저장하고 다음 과제로 이동할 수 있습니다.
- 실습노트는 Y·U·J·I·N 다섯 묶음과 보완 활동으로 구성됩니다. 기존 16개 노트·80개 답변은 그대로 유지합니다. 다섯 MD 묶음 ZIP은 설계 보관용이며 Skill 업로드용 ZIP과 구분합니다.
- 강사는 강의자료 제작 Agent를 시연합니다. 26장 하단의 ZIP에는 브리프 2개, 가상 원문, 덱 검수 기준, 양식, 지침과 실행 요청이 있습니다. 다운로드는 개인 답변을 변경하지 않습니다. CS는 문제정의·검수 미션의 별도 참고 사례입니다.

강사 진행표는 [INSTRUCTOR.md](INSTRUCTOR.md), 재사용할 운영 멘트·체크리스트는 [TEACHING_PLAYBOOK.md](TEACHING_PLAYBOOK.md), 다음 강의 제작 템플릿은 `docs/`와 `templates/`, 다운로드할 실제 자료는 `public/downloads/`에 있습니다.

## 조작

하단 화살표로 이동합니다. 키보드 좌우 화살표·Page Up/Down도 가능합니다. 입력칸을 편집할 때는 슬라이드가 이동하지 않습니다. 하단 챕터 이름 또는 왼쪽 목차 아이콘을 누르면 전체 목차가 열립니다. `G`도 목차를 엽니다. 강사 노트는 하단 메모 아이콘입니다.

실습 상단의 `4분` 같은 시간 버튼을 누르면 시작하고, 다시 누르면 일시정지합니다. 볼륨 버튼은 타이머 사운드를 켜고 끕니다. 옆의 회전 화살표는 원래 시간으로 초기화합니다. 같은 탭에서 슬라이드나 실습노트로 이동해도 카운트다운은 이어집니다. 마지막 1분은 붉게 표시하며 시간이 끝나도 답변 작성과 내보내기는 가능합니다. 타이머는 현재 탭의 메모리에만 유지하므로 새로고침하면 초기화되고 다른 탭과 공유되지 않습니다. 답변 저장에는 영향을 주지 않습니다.

## 데이터와 개인정보

- 답변은 해당 사이트 경로의 **브라우저 localStorage**에 보관합니다. 서버·공유 DB·분석 도구·AI API로 전송하지 않습니다.
- 서로 다른 기기·브라우저 프로필의 답변은 분리됩니다. 같은 브라우저 프로필의 같은 사이트 탭은 기록을 공유합니다. 개인 계정 인증이나 사용자별 암호화 저장소는 아닙니다.
- 공용 PC에서는 MD로 가져간 후 `내 기록 초기화`를 실행하세요. 민감 정보·실명·사내 비공개 자료를 입력하지 마세요.
- 브라우저 데이터 삭제, 시크릿 모드 종료, 기기 변경, 도메인·사이트 경로 변경 시 이전 기록을 이어 볼 수 없을 수 있습니다. MD가 내보내기 백업이며 MD 재가져오기 기능은 없습니다.
- 로컬 저장소를 막은 환경에서는 현재 탭 메모리만 사용하고 경고를 표시합니다. 창을 닫기 전에 MD로 가져가세요.
- 검사할 CSV는 브라우저 메모리에서 읽습니다. 원본을 업로드하거나 수정하지 않으며 **검수 결과 요약만** 내 노트에 추가합니다.
- Claude에 붙여넣거나 첨부하는 단계부터는 Claude의 데이터 처리 정책과 소속 조직 규칙이 적용됩니다.
- GitHub Pages 호스트는 일반 접속 로그를 처리할 수 있습니다. 이 앱이 답변을 전송하지 않는다는 의미이지 접속 자체가 익명이라는 뜻은 아닙니다.

## GitHub Pages 배포

배포 주소: https://leeyoojinwork-pm.github.io/yujin-flow/

전용 공개 저장소: https://github.com/leeyoojinwork-pm/yujin-flow

2026-09-10 GitHub Actions로 배포했습니다. 배포용 Git checkout은
`../output/yujin-flow-pages/`이며 이 작업 폴더와 별도입니다.
수정 후 `public/`을 배포용 checkout의 `public/`에 동기화하고 변경 내용을
확인한 뒤 `main`에 커밋·push하면 다시 배포됩니다.
검증 명령: `node tools/verify-live.mjs`.

새 저장소를 만드는 경우:

1. 이 폴더의 `public/`, `.github/`, README 등을 새 저장소의 **루트**에 둡니다. 현재 큰 작업 폴더 전체를 올리지 않습니다.
2. 기본 브랜치가 `main`인지 확인합니다. 다른 이름이면 `.github/workflows/pages.yml`의 브랜치 이름을 바꿉니다.
3. 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다.
4. `main`에 반영하거나 Actions → Deploy YUJIN FLOW → Run workflow를 실행합니다.
5. 완료 후 Pages에 표시된 URL을 엽니다. 실습자가 동시에 접속해도 서로의 입력은 보이지 않습니다.

워크플로는 `public/`만 공개합니다. 강사 문서, 테스트 출력, 개인 실습 기록을 업로드 대상에 넣지 않습니다. 정적 파일과 상대경로이므로 `https://사용자.github.io/저장소/`의 하위 경로에서도 작동합니다.

공식 배포 근거: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) (2026-09-10 확인).

## 유지보수

- `public/content.js`: 강의 내용, 질문, 직무별 사례, 공식 출처.
- `public/engine.js`: 프롬프트 조합, Skill/샘플 파일, 입력 정제.
- `public/personal-agent.js`, `personal-agent.css`: 개인 Agent 제작 연결, 강사 강의자료 시연 ZIP, 2장 강조 모션.
- `public/framework-artifacts.js`, `framework-artifacts.css`: YUJIN 과제별 MD, 앞 단계 맥락 연결, 다음 과제 이동, 다섯 묶음 실습노트.
- `public/mission.js`: 12분 미션, CSV 검수, 코치 MD.
- `public/timers.js`, `timers.css`: 실습 타이머, 로컬 사운드 설정, 시작·종료 알림.
- `public/operations.js`, `operations.css`: 성공기준, 체크포인트, 막힘 진단, 검증 질문.
- `public/app.js`: 화면과 상호작용.
- `public/cli-demo.js`, `cli-demo.css`: 로컬 시나리오 기반 터미널 시연. 실제 AI·셸 호출 없음.
- `public/timers.js`, `timers.css`: 실습·미션 공통 카운트다운. 실습별 상태와 종료 시각 기반 시간 계산.
- `public/theme.css`: 보라색 브랜드 포인트와 강조색. 오류·통과의 의미 색상은 별도 유지.
- `public/motion.css`: 택시 장면, 핵심 키워드의 빨간 밑줄, 모션 감소 대응.
- `public/styles.css`, `mission.css`: 반응형·모션·미션 스타일.
- `tools/package.mjs`: 다운로드 자료 재생성, 배포 ZIP 생성.
- `tools/verify.mjs`: 실제 브라우저 검증과 스크린샷 생성.
- `tools/verify-personal-agent.mjs`: 개인 기록 보존·격리, 명세→실행→Skill 내보내기, 시연 ZIP, 강조 모션과 반응형 검증.
- `tools/verify-artifacts.mjs`: 다섯 MD 실제 저장·연속 이동·최신 답변 반영·Skill ZIP 내용 일치·노트 보존 검증.

사이트 사용에 Node는 필요 없습니다. 개발 도구만 `playwright`, `jszip`, `sharp`가 있는 Node 환경을 사용합니다. 필요하면 `YUJIN_NODE_MODULES`에 해당 node_modules 경로를 지정합니다. Chrome이 설치되어 있어야 합니다.

## 내용 구분

Problem Statement, JTBD, HMW, workflow/agent/Skill 개념은 기존 개념입니다. **YUJIN FLOW는 이를 업무 선택·권한·검수·산출물 중심으로 연결한 이유진 강의용 구성**이며, 기존 개념 자체의 발명이나 공식 표준을 주장하지 않습니다. Head/Sub는 강의 설명용 역할 이름입니다. 신입사원 비유는 [Anthropic 공식 Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct)에 근거하며, 목표·맥락·도구·권한·피드백의 다섯 조건 묶음은 이를 확장한 강의용 구성입니다.

제공된 이미지와 Brunch 글의 핵심 주제를 재구성했습니다. 원본 이미지·타인의 경력·책 홍보문을 덱에 복제하거나 강사의 경력으로 사용하지 않았습니다. 출처는 마지막 참고자료 장에서 구분합니다. Claude UI 경로는 2026-09-10 공식 문서 기준이며 화면은 학습용 재구성입니다. 계정·버전·관리자 설정에 따라 달라질 수 있습니다.

로컬 동봉 라이브러리와 라이선스: `public/vendor/NOTICE.md`.
