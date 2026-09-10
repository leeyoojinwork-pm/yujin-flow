(function () {
  'use strict';
  const events = [
    { phase: '준비', actor: 'CLI', command: '$ claude', output: 'Claude Code 세션 시작\n작업 폴더: my-cs-agent/', focus: 'Head', note: '시작 키트를 푼 폴더에서 시작합니다. 설치·로그인은 완료된 상황입니다.' },
    { phase: '요청', actor: 'USER', command: '> ' + window.YFEngine.codeRun, output: '입력·출력 경로, 검수 역할, 수정 한도, 승인 조건 전달.', focus: 'Head', note: '무엇을 만들고 누구에게 검수를 맡길지 한 요청에 담았습니다.' },
    { phase: '맥락', actor: 'HEAD', command: 'Read  CLAUDE.md\nRead  .claude/skills/triage-and-draft/SKILL.md\nRead  data/inquiries-a.csv', output: 'Skill의 references/rubric.md와 report-template.md 확인.\n입력 8건 · 결과 파일 2개 · 외부 발송 금지.', focus: 'Skill', note: 'Skill은 새 담당자가 아니라 Head가 읽는 기준과 절차입니다.' },
    { phase: '작성', actor: 'HEAD', command: 'Write  output/classification.csv\nWrite  output/cs-response-drafts.md', output: '초안 생성: 분류 8행, 답변 3개.\n파일이 생겼어도 아직 검수 전입니다.', focus: 'Head', files: ['초안', '초안'], note: '두 파일의 생성 상태와 검수 상태는 따로 봅니다.' },
    { phase: '검사', actor: 'BASH', command: 'python3 scripts/verify_outputs.py data/inquiries-a.csv output/classification.csv', output: 'PASS: 8 source rows, complete IDs, valid categories, source-grounded evidence\nMeaning of categories and report claims still require human or independent review.', focus: 'Head', files: ['구조 통과', '검수 전'], note: '이 검증 스크립트는 답변이 FAQ와 맞는지까지 검증하지 않습니다.' },
    { phase: '위임', actor: 'HEAD → SUB', command: 'Delegate  review-cs\n  input: data/inquiries-a.csv\n  output: output/classification.csv, output/cs-response-drafts.md\n  criteria: .claude/skills/triage-and-draft/references/rubric.md', output: '검수 작업과 파일 경로를 전달합니다.\nSub 도구 범위: Read, Glob, Grep.', focus: 'Sub', files: ['구조 통과', '검수 중'], note: '위임 대상 이름, 전달한 작업, 입력·출력 경로가 관찰 포인트입니다.' },
    { phase: '반환', actor: 'SUB → HEAD', command: 'Read  입력 · 출력 · 기준 파일\nReturn  NEEDS_REVISION', output: 'A02 답변에 참고한 FAQ ID가 없습니다.\nFAQ-R01과 실제 안내 내용이 맞는지 확인하세요.\nSub는 파일을 고치지 않고 검수 결과를 반환합니다.', focus: 'Sub', tone: 'fail', files: ['구조 통과', '수정 필요'], note: '정해 둔 시나리오의 실패 장면입니다. 구조 검사와 독립 검수의 차이를 봅니다.' },
    { phase: '수정', actor: 'HEAD / LOOP', command: 'Edit  output/cs-response-drafts.md', output: 'A02 초안에 FAQ-R01을 연결하고 반품 접수 메뉴 안내를 확인.\n수정 1 / 최대 2회. 관련 없는 항목은 유지합니다.', focus: 'Loop', retry: 1, files: ['구조 통과', '수정됨'], note: '수정은 Head가 맡습니다. 실패한 항목만 고치고 같은 자료로 다시 확인합니다.' },
    { phase: '재검사', actor: 'BASH', command: 'python3 scripts/verify_outputs.py data/inquiries-a.csv output/classification.csv', output: 'PASS: 8 source rows, complete IDs, valid categories, source-grounded evidence\n보고서 수정 내용은 Sub에게 별도 재검수를 요청합니다.', focus: 'Head', note: '스크립트 통과와 보고서 검수 통과는 서로 다른 기록입니다.' },
    { phase: '재위임', actor: 'HEAD → SUB', command: 'Delegate  review-cs\n  task: A02 초안의 FAQ 근거와 전체 누락 여부 재검수\n  paths: 앞서 전달한 입력 · 출력 · 기준 경로', output: '수정한 파일을 다시 읽고 이전 실패 항목을 확인합니다.', focus: 'Sub', files: ['구조 통과', '재검수 중'], note: '수정했다는 답변만 받지 않고, 변경한 파일을 다시 검수하게 합니다.' },
    { phase: '통과', actor: 'SUB → HEAD', command: 'Return  PASS', output: '8개 ID 포함 · 분류 합계 8 · 원문 근거 확인.\n답변 3개에 문의·FAQ ID 연결. 근거 없는 상태·처리 완료 주장 없음. 검수 결과를 Head에 반환.', focus: 'Sub', tone: 'pass', files: ['검수 통과', '검수 통과'], note: '이 PASS는 준비된 예시입니다. 실제 수업에서는 본인 실행 로그와 파일을 확인합니다.' },
    { phase: '승인 대기', actor: 'HEAD → HUMAN', command: 'WAITING_FOR_APPROVAL', output: 'output/classification.csv\noutput/cs-response-drafts.md\nCS 담당자 검토 대기. 외부 발송·배포는 실행하지 않았습니다.', focus: 'Head', gate: true, note: 'Agent 검수가 끝나도 최종 답변 확정과 고객 발송는 사람이 결정합니다.' }
  ];
  let index = -1, typing = null, running = false, approved = false, speed = 1, timer = null;
  const ui = () => window.YFApp;
  const $ = q => document.querySelector(q);
  const control = (action, icon, label) => '<button type="button" class="icon-button" data-action="cli-' + action + '" title="' + label + '" aria-label="' + label + '">' + ui().icon(icon) + '</button>';
  function markup() {
    return '<section class="cli-demo" aria-label="Claude Code 실행 흐름 시뮬레이션"><div class="cli-demo-label"><span>' + ui().icon('monitor-play') + 'CLI 실행 흐름 · 수업용 시뮬레이션</span><span>실제 AI 호출·로그 아님</span></div><div class="cli-workspace"><div class="cli-terminal"><div class="cli-titlebar"><span>' + ui().icon('terminal') + 'my-cs-agent</span><span>Claude Code / 화면 재구성</span></div><div class="cli-log" id="cli-log" role="region" aria-label="시연 터미널 로그" tabindex="0"><div class="cli-welcome">YUJIN FLOW / EXECUTION LAB<br><span>Head → Skill → Sub → Loop → 사람 승인</span></div><div class="cli-idle">$ <span>claude</span><span class="cli-cursor" aria-hidden="true"></span></div></div><div class="cli-controls"><div>' + control('play', 'play', 'CLI 시연 재생') + control('step', 'step-forward', 'CLI 한 단계 진행') + control('reset', 'rotate-ccw', 'CLI 처음부터') + '<label class="cli-speed" title="재생 속도"><span>속도</span><select id="cli-speed" aria-label="CLI 재생 속도"><option value="1">1×</option><option value="2">2×</option></select></label></div><span id="cli-count">00 / 12</span></div><div class="cli-progress" role="progressbar" aria-label="CLI 시연 진행" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0"><span id="cli-progress-fill"></span></div></div><aside class="cli-inspector"><div class="cli-state"><span class="eyebrow">EXECUTION STATE</span><h2 id="cli-status" role="status" aria-live="polite">실행 준비</h2><p id="cli-explanation">명령 입력부터 검수·수정·승인까지 한 번의 실행을 따라갑니다.</p></div><div class="cli-roles" aria-label="현재 작업 역할">' + [['Head', '진행 · 작성 · 통합'], ['Skill', '재사용 절차'], ['Sub', '독립 검수'], ['Loop', '수정 0 / 최대 2회']].map(([role, desc]) => '<div data-cli-role="' + role + '"><b>' + role + '</b><span>' + desc + '</span></div>').join('') + '</div><div class="cli-files"><h3>output/</h3>' + ['classification.csv', 'cs-response-drafts.md'].map((file, i) => '<div>' + ui().icon(i ? 'file-text' : 'table-2') + '<code>' + file + '</code><span data-cli-file="' + i + '">생성 전</span></div>').join('') + '</div><div class="cli-approval"><button type="button" class="button primary small" data-action="cli-approve" disabled>' + ui().icon('check') + '검토 완료 · 시연 종료</button><p>시연 안에서만 완료 처리됩니다.</p></div></aside></div><details class="cli-request"><summary>실제로 실행할 요청문</summary><pre class="code-preview">' + ui().esc(window.YFEngine.codeRun) + '</pre><div class="button-row">' + ui().button('복사', 'copy-prompt', 'copy', 'secondary', 'data-prompt="codeRun"') + ui().button('MD로 저장', 'download-prompt', 'download', 'secondary', 'data-prompt="codeRun"') + ui().button('Code 시작 키트 ZIP', 'code-kit', 'folder-down', 'secondary') + '</div></details><p class="cli-source">설치·로그인·프로젝트 폴더 준비가 끝난 상황입니다. 권한 요청과 실제 화면은 환경에 따라 다릅니다. <a href="https://code.claude.com/docs/en/quickstart" target="_blank" rel="noopener noreferrer">공식 CLI 시작 안내</a></p></section>';
  }
  function stop() { clearTimeout(timer); timer = null; running = false; }
  function schedule(delay) { clearTimeout(timer); timer = setTimeout(tick, delay / speed); }
  function update() {
    if (!$('#cli-log')) return;
    const current = index < 0 ? null : events[index];
    const displayEvent = typing ? events[typing.event] : current;
    $('#cli-status').textContent = approved ? '시연 완료' : typing ? '입력 중 · ' + displayEvent.phase : current ? current.tone === 'fail' ? '수정 필요' : current.tone === 'pass' ? '검수 통과' : current.phase : '실행 준비';
    $('.cli-state').dataset.tone = approved || typing ? '' : current?.tone || '';
    window.YFMascot.react('cli', approved ? 'APPROVED' : $('#cli-status').textContent);
    $('#cli-explanation').textContent = approved ? '실제 파일을 실행하거나 발송하지 않았습니다. 본인 실행에서는 결과와 근거를 직접 검토하세요.' : displayEvent ? displayEvent.note : '명령 입력부터 검수·수정·승인까지 한 번의 실행을 따라갑니다.';
    $('#cli-count').textContent = String(index + 1).padStart(2, '0') + ' / 12';
    $('#cli-progress-fill').style.width = ((index + 1) / events.length * 100) + '%';
    $('.cli-progress').setAttribute('aria-valuenow', index + 1);
    const playback = $('[data-action="cli-play"]');
    const label = running ? 'CLI 시연 일시정지' : 'CLI 시연 재생';
    playback.innerHTML = ui().icon(running ? 'pause' : 'play');
    playback.setAttribute('title', label); playback.setAttribute('aria-label', label);
    playback.setAttribute('aria-pressed', String(running));
    playback.disabled = index === events.length - 1;
    $('[data-action="cli-step"]').disabled = index === events.length - 1;
    $('[data-action="cli-approve"]').disabled = !(current && current.gate) || approved;
    const focus = typing ? events[typing.event].focus : current && current.focus;
    document.querySelectorAll('[data-cli-role]').forEach(el => el.classList.toggle('active', el.dataset.cliRole === focus));
    let files = ['생성 전', '생성 전'], retry = 0;
    events.slice(0, index + 1).forEach(e => { if (e.files) files = e.files; if (e.retry) retry = e.retry; });
    document.querySelectorAll('[data-cli-file]').forEach((el, i) => { el.textContent = files[i]; el.dataset.state = files[i] === '수정 필요' ? 'fail' : files[i] === '검수 통과' ? 'pass' : ''; });
    $('[data-cli-role="Loop"] span').textContent = '수정 ' + retry + ' / 최대 2회';
    ui().icons();
  }
  function appendEvent(n) {
    $('.cli-idle')?.remove();
    const el = document.createElement('div');
    el.className = 'cli-event' + (events[n].tone ? ' ' + events[n].tone : '');
    el.dataset.event = n;
    el.innerHTML = '<span class="cli-event-label">' + String(n + 1).padStart(2, '0') + ' / ' + ui().esc(events[n].actor) + '</span><pre class="cli-command"></pre><pre class="cli-output" hidden></pre>';
    $('#cli-log').append(el); return el;
  }
  function complete(n) {
    const el = $('[data-event="' + n + '"]') || appendEvent(n);
    el.querySelector('.cli-command').textContent = events[n].command;
    const output = el.querySelector('.cli-output'); output.textContent = events[n].output; output.hidden = false;
    el.classList.remove('typing');
    index = n; typing = null;
    if (events[n].gate) stop();
    update(); $('#cli-log').scrollTop = $('#cli-log').scrollHeight;
  }
  function tick() {
    if (!running || !$('#cli-log')) return;
    if (typing) {
      const e = events[typing.event];
      typing.chars = Math.min(e.command.length, typing.chars + Math.max(3, Math.ceil(e.command.length / 22)));
      $('[data-event="' + typing.event + '"] .cli-command').textContent = e.command.slice(0, typing.chars);
      $('#cli-log').scrollTop = $('#cli-log').scrollHeight;
      if (typing.chars === e.command.length) { complete(typing.event); if (running) schedule(1300); }
      else schedule(32);
      return;
    }
    if (index >= events.length - 1) { stop(); update(); return; }
    const n = index + 1;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { complete(n); if (running) schedule(1300); }
    else { const el = appendEvent(n); el.classList.add('typing'); typing = { event: n, chars: 0 }; update(); schedule(32); }
  }
  function reset() {
    stop(); index = -1; typing = null; approved = false;
    const log = $('#cli-log'); if (!log) return;
    log.querySelectorAll('.cli-event,.cli-complete,.cli-idle').forEach(el => el.remove());
    const idle = document.createElement('div'); idle.className = 'cli-idle';
    idle.innerHTML = '$ <span>claude</span><span class="cli-cursor" aria-hidden="true"></span>'; log.append(idle); log.scrollTop = 0;
    update();
  }
  function setup() {
    reset(); speed = 1;
    $('#cli-speed').addEventListener('change', e => { speed = Number(e.target.value) === 2 ? 2 : 1; });
  }
  function action(a) {
    if (!$('#cli-log')) return;
    if (a === 'cli-play' && index < events.length - 1) {
      if (running) { stop(); update(); } else { running = true; update(); schedule(0); }
    }
    if (a === 'cli-step' && index < events.length - 1) { stop(); complete(typing ? typing.event : index + 1); }
    if (a === 'cli-reset') reset();
    if (a === 'cli-approve' && events[index]?.gate && !approved) {
      approved = true;
      const el = document.createElement('p'); el.className = 'cli-complete'; el.textContent = '시연 완료 / 외부 실행 없음';
      $('#cli-log').append(el); $('#cli-log').scrollTop = $('#cli-log').scrollHeight; update();
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); update(); } });
  window.YFCLI = { markup, setup, action, stop, getState: () => ({ index, running, approved, typing: typing ? { ...typing } : null, speed }) };
})();
