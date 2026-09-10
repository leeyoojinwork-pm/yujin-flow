(function () {
  'use strict';
  const E = window.YFEngine;
  const entry = {
    'finish-line': 'opening', 'yujin-framework': 'define', 'workflow-map': 'map',
    'case-brief': 'build', 'skill-structure': 'skill', 'skill-vs-sub': 'orchestrate', 'evaluation': 'ship'
  };
  const goals = {
    opening: ['오늘 다룰 업무 하나를 고른다.', '기능 이름과 해결할 문제를 구분한다.', '내 기록과 파일을 가져갈 위치를 확인한다.'],
    define: ['누가 어떤 상황에서 막히는지 한 문장으로 쓴다.', '원하는 결과와 현재 상태의 차이를 적는다.', '가장 작은 실험과 통과 기준 하나를 정한다.'],
    map: ['입력부터 검수까지 업무를 연결한다.', 'AI가 할 일과 사람이 결정할 일을 나눈다.', '승인 지점과 재시도 한도를 정한다.'],
    build: ['Project에 지침·기준·양식을 넣는다.', 'A로 실행해 분류 CSV와 개선안 MD를 받는다.', '8개 ID·분류 합계·원문 인용을 대조한다.'],
    skill: ['업무 절차를 SKILL.md와 ZIP으로 만든다.', 'Skill을 등록하고 B로 다시 실행한다.', '6개 ID와 실패 처리 규칙을 검수·수정한다.'],
    orchestrate: ['내 직무 workflow의 입력과 출력을 정한다.', 'Head·Sub·Skill의 역할을 구별한다.', '수정·승인·중단을 흐름에 연결한다.'],
    ship: ['내가 확인한 결과와 미확인 사항을 나눈다.', '동료 검토로 수정할 규칙 하나를 정한다.', '전체 질문·답변 MD와 Skill ZIP을 가져간다.']
  };
  const checkpoints = {
    instructions: ['지침 초안이 있으면 준비 단계 성공입니다.', '역할·입력·산출물·검수 조건을 확인합니다. 아직 실제 실행 성공으로 표시하지 않습니다.'],
    run1: ['두 파일을 받았다면 기본 실행까지 왔습니다.', 'A의 8개 ID와 합계를 대조하고, 인용 한 문장을 원문에서 찾으면 검증 기록을 남길 수 있습니다.'],
    skill: ['SKILL.md와 ZIP이 생기면 파일 준비 성공입니다.', '등록과 재사용은 다음 단계입니다. 처음에는 공통 사례로 기준을 맞추고, 확장은 그다음에 합니다.'],
    run2: ['새 자료로 다시 실행하고 대조하면 재사용을 검증한 겁니다.', 'Skill 사용 흔적과 결과 품질을 따로 확인합니다. 미실행·검수 중·통과를 구분해 기록하세요.'],
    mission: ['실패를 찾고 돌아갈 단계를 정해도 학습 성과입니다.', '실행이 막힌 경우는 원인과 다음 행동을 남깁니다. 예시 검수와 직접 실행을 같은 성공으로 표시하지 않습니다.']
  };
  const diagnosis = {
    unsure: { label: '아직 모름', question: '어느 행동 직후, 무엇이 달라졌나요?', checks: ['멈춘 화면·입력 파일명·오류 문구를 먼저 기록합니다.', '계정/실행 환경 → 입력 계약 → 코드·지침 순으로 좁힙니다.', '증거가 없으면 원인을 확정하지 않고 질문 하나부터 합니다.'], next: '수강생의 실수라고 단정하지 않습니다. 강사에게 마지막으로 성공한 단계와 지금 화면을 보여주세요.' },
    environment: { label: '환경 문제', question: '메뉴나 파일 접근, 실행 권한이 막혔나요?', checks: ['사용 중인 도구·앱/브라우저·계정을 확인합니다.', '회사 PC 정책, 관리자 권한, 기능 사용 가능 여부를 확인합니다.', '공식 허용 범위를 확인할 수 없으면 그 단계에서 멈춥니다.'], next: '금지된 업로드를 붙여넣기나 다른 계정으로 우회하지 않습니다. 제공된 더미 자료 검수 또는 짝의 실행 관찰로 전환하고, 내 실행은 미완료로 남깁니다.' },
    data: { label: '데이터 문제', question: '필수 열·ID·파일 형식이 맞나요?', checks: ['id, score, comment 열과 올바른 파일인지 확인합니다.', '빈 셀과 누락된 열을 구분하고 중복·누락 ID를 찾습니다.', '실제 자료 대신 허용된 작은 샘플로 같은 문제가 나는지 확인합니다.'], next: '없는 값은 추측해 채우지 않습니다. 필수 자료를 요청하거나 입력 계약을 사용자와 다시 정합니다.' },
    code: { label: '코드·지침 문제', question: '환경과 입력은 맞는데 처리 결과가 틀리나요?', checks: ['예상 결과와 실제 결과의 차이를 한 가지로 좁힙니다.', '에러 문구와 실패 ID, 관련 코드 또는 지침만 함께 봅니다.', '변경할 항목 하나를 고쳐 같은 입력으로 재검증합니다.'], next: '전체를 반복 생성하기 전에 원인을 좁힙니다. 재시도 한도에 도달하면 로그와 질문을 남기고 멈춥니다.' }
  };
  E.samples['help-request.md'] = [
    '# 실습 중 막혔을 때 | YUJIN FLOW', '',
    '## 요청',
    '아래 기록만으로 오류 원인을 확정하지 말고 환경 / 데이터 / 코드·지침 중 가능한 범주와 근거를 구분해줘. 미입력은 한 번에 질문 하나씩 확인하고 내 답변을 기다려줘. 다음 행동 하나와 그 행동의 성공 화면·판정 기준을 알려줘. 회사 보안정책을 우회하거나 보호 기능을 끄라고 제안하지 마. 비밀번호·API 키·사내 URL·실데이터를 요청하지 마.', '',
    '## 1. 어디까지 성공했고 어느 단계에서 멈췄나요?', '[내 답변]', '',
    '## 2. 사용 중인 도구·앱/브라우저·계정 환경은?', '[버전/개인·조직 계정 여부. 계정 주소나 로그인 정보는 제외]', '',
    '## 3. 어떤 입력 파일과 지침을 썼나요?', '[더미 파일명·필수 열·관련 지침. 비공개 데이터는 제외]', '',
    '## 4. 예상한 결과와 실제 나온 결과는 어떻게 다른가요?', '[예상 / 실제 / 그대로 옮긴 오류 문구. 민감 문자열은 가림]', '',
    '## 5. 이미 시도한 변경과 그 결과는?', '[바꾼 것 하나 / 다시 실행한 결과 / 아직 모르는 점]', '',
    '## 진단 후 남길 기록',
    '가능한 범주 / 확인한 근거 / 아직 모르는 것 / 다음 행동 하나 / 성공 판정 기준 / 직접 실행 또는 예시 관찰 여부', ''
  ].join('\n');
  E.samples['verify-my-result.md'] = [
    '# 예상 → 실제 → 사람이 대조 | YUJIN FLOW', '',
    '## 요청',
    '내 결과를 다음 순서로 검토해줘. 먼저 내가 정한 예상 결과를 확인하고, 실제 파일에서 관찰한 값과 비교해줘. 그 다음 내가 원본으로 검산할 항목 하나를 제시하고 내 확인 답변을 기다려줘. 파일을 실제 읽지 못했으면 검증했다고 말하지 마. 다른 AI와 답이 같다는 이유만으로 정답이라고 결론내리지 마.', '',
    '## 1. 실행 전에 정한 성공기준 3개는?', '[기준 1 / 기준 2 / 기준 3]', '',
    '## 2. 실제 입력·산출물·실행 상태는?', '[파일명 / 직접 실행·예시 검수 / 완료·막힘·검수 중]', '',
    '## 3. 예상과 다른 행·수치·문장은?', '[원문 ID / 예상 값 / 실제 값 / 차이]', '',
    '## 4. 사람이 원본과 대조한 근거는?', '[ID 집합·합계 / 직접 찾은 원문 인용 / 아직 미확인]', '',
    '## 5. 고친 규칙과 같은 입력의 재검증 결과는?', '[수정 전 / 수정 후 / 재검증 결과 또는 미실행]', '',
    '## 사례 기준',
    'A는 8개 ID와 분류 합계 8, A08 미응답을 포함한다. B는 6개 ID와 합계 6, B05를 데이터로 처리하고 B06 미응답을 포함한다. 공통 산출물은 classification.csv와 improvement-report.md다. 개선안의 적절성은 별도로 사람이 검토한다.', ''
  ].join('\n');
  const ui = () => window.YFApp;
  function criteria(slide) {
    const key = entry[slide.id]; if (!key) return '';
    return '<section class="success-strip" aria-label="이 파트의 성공기준 3개"><div><span class="eyebrow">SUCCESS CRITERIA</span><h2>이 파트는 여기까지.</h2></div><ol>' + goals[key].map(x => '<li>' + ui().esc(x) + '</li>').join('') + '</ol></section>';
  }
  function checkpoint(id) {
    const c = checkpoints[id]; if (!c) return '';
    return '<aside class="checkpoint">' + ui().icon('flag') + '<div><b>' + ui().esc(c[0]) + '</b><p>' + ui().esc(c[1]) + '</p></div></aside>';
  }
  function verification(slide) {
    const isB = slide.id === 'second-run' || slide.id === 'lab-run2';
    if (!['first-run','second-run','lab-run1','lab-run2'].includes(slide.id)) return '';
    const expected = isB ? 'B의 6개 ID·합계 6·B06 미응답, B05는 데이터로 처리.' : 'A의 8개 ID·합계 8·A08 미응답. CSV와 개선안 MD.';
    return '<section class="verification-strip" aria-label="결과 검증 순서"><div><span>01 / 실행 전</span><b>예상 결과를 말한다</b><p>' + expected + '</p></div><div><span>02 / 실행 후</span><b>실제 파일과 비교한다</b><p>파일명·행 수·ID·차이를 확인합니다. 파일 생성과 내용 통과는 다릅니다.</p></div><div><span>03 / 사람 확인</span><b>원본으로 직접 대조한다</b><p>전체 ID·합계를 대조하고 인용 한 문장을 원문에서 찾습니다. 의미 검토는 별도입니다.</p></div></section>';
  }
  function triage(type = 'unsure') {
    if (!diagnosis[type]) type = 'unsure';
    const d = diagnosis[type];
    return '<section class="triage" aria-label="실습 오류 진단"><div class="triage-heading"><h2>먼저, 무엇이 막혔나요?</h2><span>증상 분류 · 원인 확정 아님</span></div><div role="tablist" class="triage-tabs" aria-label="문제 범주">' + Object.entries(diagnosis).map(([id,x]) => '<button type="button" role="tab" aria-selected="' + (type === id) + '" aria-controls="triage-detail" id="triage-' + id + '" data-action="triage-select" data-category="' + id + '">' + x.label + '</button>').join('') + '</div><div id="triage-detail" role="tabpanel" aria-labelledby="triage-' + type + '"><h3>' + d.question + '</h3><ol>' + d.checks.map(x => '<li>' + x + '</li>').join('') + '</ol><p class="triage-next">' + d.next + '</p></div><div class="button-row">' + ui().button('도움 요청 MD', 'download-sample', 'file-down', 'secondary', 'data-file="help-request.md"') + ui().button('검증 질문 MD', 'download-sample', 'file-check-2', 'secondary', 'data-file="verify-my-result.md"') + '</div></section>';
  }
  for (const [id, chapter] of Object.entries(entry)) {
    const slide = window.YF.slides.find(s => s.id === id);
    slide.note += '\n시작 멘트: 이 파트의 성공기준 세 가지를 먼저 읽는다. ' + goals[chapter].join(' / ') + ' 기본 성공 이후에만 확장을 연다.';
  }
  for (const lab of window.YF.labs) {
    if (!checkpoints[lab.id]) continue;
    const slide = window.YF.slides.find(s => s.lab === lab.id);
    if (slide) slide.note += '\n중간 멘트: ' + checkpoints[lab.id].join(' ');
  }
  window.YFOperations = { criteria, checkpoint, verification, triage, goals, entry };
})();
