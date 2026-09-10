(function () {
  'use strict';
  const icon = name => '<i data-lucide="' + name + '" aria-hidden="true"></i>';
  const phases = [
    ['plan', 'head', '', '목표와 역할 결정', 'Orchestrator가 CS 문의 처리 순서와 검수 조건을 정합니다.'],
    ['skill', 'skill', 'read', 'Skill 사용', '재사용할 분류 기준·FAQ·답변 양식을 읽습니다.'],
    ['draft', 'head', 'read-back', '답변 초안 작성', '메인 Agent가 Skill의 절차를 따라 문의를 분류하고 초안을 만듭니다.'],
    ['delegate', 'sub', 'delegate', '검수 작업 위임', '원문·FAQ·초안을 Subagent에 전달해 독립 검수를 맡깁니다.'],
    ['fail', 'sub', 'return', '검수 실패 → 수정 요청', 'Subagent가 FAQ 근거 누락을 발견하고 검수 결과를 돌려줍니다.'],
    ['revise', 'head', '', '총괄이 수정 · 1 / 2회', 'Orchestrator가 누락된 근거를 보완합니다. 실패 원인에 맞춰 돌아갑니다.'],
    ['recheck', 'sub', 'delegate', '수정본 재검수', '수정한 초안을 다시 위임해 같은 통과 기준으로 확인합니다.'],
    ['pass', 'head', 'return', '검수 통과 → 결과 통합', '통과한 검수 결과를 받아 최종 초안과 근거를 정리합니다.'],
    ['approval', 'head', '', '사람 승인 대기', '실제 업무는 여기서 대기합니다. 고객 발송은 사람이 확인한 뒤 진행합니다.'],
    ['restart', '', '', '학습용 시연 다시 보기', '애니메이션만 처음부터 반복합니다. 실제 작업을 다시 실행하거나 승인하지 않습니다.']
  ];
  let root = null, timer = null, observer = null, motion = null, index = 0, cycle = 0, paused = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = selector => root && root.querySelector(selector);
  function markup() {
    const roles = [
      ['Orchestrator', '총괄 · 누구에게 무엇을 맡길지 결정하고 결과를 통합합니다.', '기존 Head / Claude Code에서는 메인 대화가 담당 가능'],
      ['Subagent', '독립 담당 · 별도 맥락에서 맡은 작업을 수행하고 결과를 반환합니다.', '기존 Sub / 이 예시는 검수 담당'],
      ['Skill', '작업자가 참고하는 재사용 절차와 기준입니다.', '담당 Agent가 아님 / SKILL.md + 참고 파일'],
      ['Feedback Loop', '검수 결과에 따라 수정하고 다시 확인합니다.', '이 예시의 수정 한도: 2회 / 미통과 시 사람에게 이관']
    ];
    return '<div class="orchestration-definition"><b>오케스트레이션</b><p>작업 분배, 실행 순서, 결과 반환, 재시도와 중단을 조율하는 전체 과정입니다.</p></div><div class="anatomy-grid"><div class="anatomy-roles">' + roles.map(r => '<div class="role-row"><b>' + r[0] + '</b><p>' + r[1] + '<small>' + r[2] + '</small></p></div>').join('') + '</div><figure class="anatomy-tree" aria-label="Orchestrator가 Skill을 사용하고 Subagent에 검수를 위임한 뒤 수정하는 흐름"><div class="tree-toolbar"><span>ORCHESTRATION</span><div><button type="button" class="icon-button" data-tree-action="pause" title="자동 재생 일시정지" aria-label="자동 재생 일시정지">' + icon('pause') + '</button><button type="button" class="icon-button" data-tree-action="step" title="한 단계 진행" aria-label="한 단계 진행">' + icon('step-forward') + '</button><button type="button" class="icon-button" data-tree-action="reset" title="처음부터 다시 보기" aria-label="처음부터 다시 보기">' + icon('rotate-ccw') + '</button></div></div><div class="tree-stage"><svg class="tree-routes" aria-hidden="true"><defs><marker id="tree-motion-arrow" viewBox="0 0 8 8" markerWidth="7" markerHeight="7" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="currentColor"/></marker></defs><path class="tree-active-path" fill="none" marker-end="url(#tree-motion-arrow)"/></svg><span class="tree-packet" aria-hidden="true"></span><div class="tree-node tree-head"><span class="tree-role">Orchestrator</span><h2>CS 문의 처리 총괄</h2><p>메인 Agent · 판단 · 결과 통합</p></div><ul class="tree-branches"><li><span class="tree-edge-label">절차 사용</span><div class="tree-node tree-skill"><span class="tree-role">Skill</span><h3>재사용할 업무 절차</h3><p>분류 기준 · FAQ · 답변 양식</p><code>SKILL.md</code></div></li><li><span class="tree-edge-label">위임 / 결과 반환</span><div class="tree-node tree-sub"><span class="tree-role">Subagent</span><h3>독립 검수 담당</h3><p>원문 · 누락 · FAQ 근거 확인</p><span class="tree-return">검수 결과를 총괄에 반환</span></div></li></ul></div><figcaption class="tree-loop">' + icon('repeat-2') + '<div><b>Feedback Loop / 검수 → 수정 → 재검수</b><p>총괄 → 검수 담당 → 총괄 → 검수 담당</p></div></figcaption><div class="tree-status"><span class="tree-status-count"></span><div><b class="tree-status-title"></b><p class="tree-status-message"></p></div></div><p class="tree-simulation">학습용 자동 반복 · 실제 AI 호출 없음 · 실제 업무는 사람 승인까지 대기</p></figure></div><p class="caption">Anthropic의 Orchestrator–Workers와 Evaluator–Optimizer 패턴을 조합한 교육용 예시입니다. Claude Code 공식 용어는 main conversation / subagent입니다. 이 그림이나 웹 채팅의 역할 지시만으로 독립 Agent가 생성되지는 않습니다.</p>';
  }
  function route(name) {
    const stage = $('.tree-stage').getBoundingClientRect();
    const pos = selector => {
      const r = $(selector).getBoundingClientRect();
      return { x: r.left - stage.left + r.width / 2, top: r.top - stage.top, bottom: r.bottom - stage.top };
    };
    const h = pos('.tree-head'), target = pos(name.startsWith('read') ? '.tree-skill' : '.tree-sub');
    const back = name === 'return' || name === 'read-back';
    const mid = h.bottom + (target.top - h.bottom) / 2 + (back ? 9 : -9);
    const hx = h.x + (back ? 10 : -10);
    const points = [[hx, h.bottom], [hx, mid], [target.x, mid], [target.x, target.top]];
    if (back) points.reverse();
    return points.map((p, i) => (i ? 'L' : 'M') + p.map(n => n.toFixed(1)).join(' ')).join(' ');
  }
  function draw() {
    if (!root) return;
    if (motion) { motion.cancel(); motion = null; }
    const name = phases[index][2], path = $('.tree-active-path'), packet = $('.tree-packet');
    path.style.display = name ? '' : 'none'; packet.hidden = !name || reduced.matches;
    if (!name) return;
    const d = route(name); path.setAttribute('d', d);
    packet.style.offsetPath = 'path("' + d + '")';
    if (!reduced.matches) {
      motion = packet.animate([{ offsetDistance: '0%' }, { offsetDistance: '100%' }], { duration: 1450, fill: 'both', easing: 'ease-in-out' });
      if (paused || document.hidden) motion.pause();
    }
  }
  function controls() {
    const b = $('[data-tree-action="pause"]'); if (!b) return;
    b.innerHTML = icon(paused ? 'play' : 'pause');
    b.title = paused ? '자동 재생 시작' : '자동 재생 일시정지';
    b.setAttribute('aria-label', b.title);
    if (window.lucide) window.lucide.createIcons();
  }
  function render() {
    if (!root) return;
    const [state, active, , title, text] = phases[index];
    root.dataset.treeState = state;
    root.querySelectorAll('.tree-node').forEach(n => n.classList.toggle('is-current', !!active && n.classList.contains('tree-' + active)));
    $('.tree-status-count').textContent = String(index + 1).padStart(2, '0') + ' / 10';
    $('.tree-status-title').textContent = title;
    $('.tree-status-message').textContent = text;
    $('.tree-loop').classList.toggle('is-looping', ['fail', 'revise', 'recheck'].includes(state));
    controls(); draw();
  }
  function schedule() {
    clearTimeout(timer); timer = null;
    if (!root || paused || document.hidden) return;
    timer = setTimeout(() => {
      index = (index + 1) % phases.length;
      if (!index) cycle++;
      render(); schedule();
    }, index >= 8 ? 3000 : 2100);
  }
  function click(event) {
    const button = event.target.closest('[data-tree-action]'); if (!button) return;
    if (button.dataset.treeAction === 'pause') {
      paused = !paused;
      if (motion) { if (paused) motion.pause(); else motion.play(); }
      controls(); schedule();
    } else {
      paused = true;
      if (button.dataset.treeAction === 'reset') { index = 0; cycle = 0; paused = reduced.matches; }
      else { index = (index + 1) % phases.length; if (!index) cycle++; }
      render(); schedule();
    }
  }
  function stop() {
    clearTimeout(timer); timer = null;
    if (observer) observer.disconnect(); observer = null;
    if (motion) motion.cancel(); motion = null;
    if (root) root.removeEventListener('click', click);
    root = null;
  }
  function mount() {
    stop(); root = document.querySelector('.anatomy-tree'); if (!root) return;
    index = 0; cycle = 0; paused = reduced.matches;
    root.addEventListener('click', click);
    observer = new ResizeObserver(draw); observer.observe($('.tree-stage'));
    render(); schedule();
  }
  document.addEventListener('visibilitychange', () => {
    if (!root) return;
    if (motion) { if (document.hidden || paused) motion.pause(); else motion.play(); }
    schedule();
  });
  reduced.addEventListener('change', () => { if (root) { paused = true; render(); schedule(); } });
  window.YFOrchestration = { markup, mount, stop, getState: () => ({ mounted: !!root, index, cycle, paused, running: !!timer, state: phases[index][0] }) };
}());
