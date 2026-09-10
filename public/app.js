(function () {
  'use strict';
  const D = window.YF, E = window.YFEngine;
  const boot = E.loadState();
  let state = boot.state, storageAvailable = boot.storage, active = 0, mode = 'deck';
  let flow = null, flowTimer = null, flowToken = 0, toastTimer = null, frameworkIndex = -1;
  let guideStep = 0, pendingConfirm = null, notesVisible = false;
  let helpOrigin = 'opening';
  const $ = (query, root = document) => root.querySelector(query);
  const $$ = (query, root = document) => [...root.querySelectorAll(query)];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => '<i data-lucide="' + esc(name) + '" aria-hidden="true"></i>';
  const button = (text, action, symbol = 'arrow-right', cls = 'primary', attrs = '') => '<button type="button" class="button ' + cls + '" data-action="' + action + '" ' + attrs + '>' + icon(symbol) + esc(text) + '</button>';
  const ext = (url, text) => '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + icon('arrow-up-right') + '</a>';
  const pair = (label, text) => '<div class="flow-info-block"><span>' + esc(label) + '</span><p>' + esc(text) + '</p></div>';
  function icons() { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } }); }
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
  }
  function save() {
    state.updatedAt = new Date().toISOString();
    if (storageAvailable) {
      try { localStorage.setItem(E.storageKey, JSON.stringify(state)); }
      catch (_) { storageAvailable = false; }
    }
    const el = $('#save-status');
    el.classList.toggle('error', !storageAvailable);
    el.innerHTML = icon(storageAvailable ? 'hard-drive' : 'triangle-alert') + '<span>' + (storageAvailable ? '이 브라우저에 저장됨' : '임시 보관 · MD로 저장하세요') + '</span>';
    const p = E.progress(state); $('#lab-count').textContent = p.complete;
    icons();
  }
  function getLab(id) { return D.labs.find(l => l.id === id); }
  function labCount(id) { const l = getLab(id); return l.fields.filter(f => E.answer(state, id, f.id).trim()).length + ' / ' + l.fields.length; }
  function refreshPromptPreviews() { $$('[data-lab-prompt]').forEach(x => x.textContent = E.labPrompt(x.dataset.labPrompt, state)); window.YFPersonal.refresh(); window.YFArtifacts.refresh(); }
  function form(id, prefix) {
    const l = getLab(id);
    const fields = l.fields.map((f, i) => {
      const domId = prefix + '-' + id + '-' + f.id;
      const attrs = ' id="' + domId + '" data-lab="' + id + '" data-field="' + f.id + '" placeholder="' + esc(f.placeholder) + '" autocomplete="off" spellcheck="false" maxlength="' + (f.maxLength || 20000) + '"';
      const input = f.single || f.type === 'number' ? '<input' + attrs + ' type="' + (f.type || 'text') + '" value="' + esc(E.answer(state, id, f.id)) + '"' + (f.type === 'number' ? ' min="' + (f.min || 0) + '" ' + (f.max != null ? 'max="' + f.max + '"' : '') + ' step="any" inputmode="decimal"' : '') + '>' : '<textarea' + attrs + ' rows="' + (id === 'skill' && f.id === 'steps' ? 5 : 3) + '">' + esc(E.answer(state, id, f.id)) + '</textarea>';
      return '<div class="field"><label for="' + domId + '"><span class="field-num">' + String(i + 1).padStart(2, '0') + '</span>' + esc(f.label) + '</label>' + input + '</div>';
    }).join('');
    const prompt = E.labPrompt(id, state);
    return '<div class="lab-content">' + window.YFArtifacts.bridge(id) + window.YFOperations.checkpoint(id) + (id === 'problem' ? '<aside class="problem-anchor"><span class="eyebrow">AGENT DESIGN / 출발점</span><h2>이 문제정의가 뒤에서 만들 Agent의 기준입니다.</h2><p>누구의 어떤 어려움을 줄일지 정한 뒤, 지침과 검수 조건으로 옮깁니다.</p><div class="button-row">' + button('문제 → Project 지침', 'goto', 'arrow-right', 'secondary', 'data-slide="lab-instructions"') + button('성공 기준 → 검증', 'goto', 'check-check', 'secondary', 'data-slide="lab-experiment"') + '</div></aside>' : '') + (id === 'experiment' ? '<div class="poc-materials"><p>PoC 입력: 가상 문의 A01~A05 + rubric.md. 아래 두 파일을 Claude 대화에 첨부한 뒤, 이 실습의 프롬프트를 사용하세요.</p><div class="button-row">' + button('문의 CSV', 'download-sample', 'download', 'secondary', 'data-file="inquiries-a.csv"') + button('분류 기준·FAQ', 'download-sample', 'download', 'secondary', 'data-file="rubric.md"') + '</div></div>' : '') + '<div class="lab-heading"><p>' + esc(l.purpose) + '</p>' + window.YFTimers.markup(id) + '</div><div class="lab-form">' + fields + '</div>' + (id === 'metrics' ? metricInline() : '') + '<div class="lab-actions"><div class="lab-actions-left">' + (l.fields.some(f => f.example) ? '<button type="button" class="text-button" data-action="fill-example" data-lab-id="' + id + '">' + icon('corner-down-right') + 'CS 참고 예시 넣기</button>' : '<span class="lab-time">직접 실행한 결과를 기록합니다.</span>') + '<span class="lab-progress" data-progress="' + id + '">' + labCount(id) + ' 입력</span></div></div><section class="lab-prompt-panel" aria-label="Claude 실행 프롬프트"><div class="lab-prompt-heading"><div><span class="eyebrow">READY-TO-USE PROMPT</span><h3>Claude에 이렇게 요청하세요.</h3></div>' + icon('message-square-code') + '</div><p class="lab-prompt-task">' + esc(l.task) + '</p><p class="lab-prompt-note">위 질문과 내가 쓴 답변, 앞에서 정한 관련 맥락까지 자동으로 함께 붙습니다.</p><details><summary>복사되는 전체 프롬프트 미리보기' + icon('chevron-down') + '</summary><pre class="code-preview" data-lab-prompt="' + id + '">' + esc(prompt) + '</pre></details><div class="button-row">' + button('프롬프트 복사', 'copy-lab', 'copy', 'primary', 'data-lab-id="' + id + '"') + button('프롬프트 MD 저장', 'download-lab', 'download', 'secondary', 'data-lab-id="' + id + '"') + '</div></section></div>' + window.YFArtifacts.footer(id);
  }
  function metricInline() {
    const m = E.metrics(state);
    return '<div class="metric-inline" data-metric-live>' + (m ? '1회 순절감 ' + format(m.saved) + '분 · 주간 ' + format(m.weekly) + '분' + (m.saved < 0 ? ' (기존보다 시간이 더 걸립니다.)' : '') : '시간과 주간 빈도를 모두 입력하면 순절감 시간을 계산합니다.') + '</div>';
  }
  function format(n) { return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(n); }
  function promptBlock(content, name) {
    return '<pre class="code-preview">' + esc(content) + '</pre><div class="button-row" style="margin-top:16px">' + button('복사', 'copy-prompt', 'copy', 'secondary', 'data-prompt="' + name + '"') + button('MD로 저장', 'download-prompt', 'download', 'secondary', 'data-prompt="' + name + '"') + '</div>';
  }
  function titleMarkup(s) {
    if (s.id === 'yujin-framework') return '<span class="framework-title-lead">문제에서 실행까지.</span><span class="framework-wordmark">YUJIN <span class="title-emphasis">FLOW.</span><span class="framework-title-arrow">' + icon('arrow-up-right') + '</span></span>';
    const phrase = {
      'finish-line': '네 가지', 'from-last-week': '내 업무', 'taxi': '어떤 문제',
      'solution-trap': '챗봇', 'rethink-work': '없애도 되는 일', 'yujin-framework': 'YUJIN FLOW',
      'problem-formula': '한 문장', 'jtbd': '문의 해결', 'hmw': '여러 해결책',
      'experiment': 'PoC', 'workflow-map': '여섯 칸', 'what-is-agent': 'Agent',
      'onboarding': '일할 조건', 'orchestration-concept': 'Orchestration', 'split-criteria': '언제',
      'example-gallery': '내 문제',
      'case-brief': '내 Agent', 'case-files': '두 곳', 'case-flow': '파일이 나올 때까지', 'skill-structure': '업무 절차 묶음',
      'skill-vs-sub': '일하는 방법', 'code-start': '실제 역할', 'code-files': 'Subagent 검수', 'code-run': '실행 기록',
      'loop-control': '끝나는 조건', 'evaluation': '운영 기준', 'success-metrics': '검수와 재작업',
      'next-week': '세 번의 실행 기록', 'takeaway': '내 일의 설계도', 'troubleshooting': '여기부터 확인',
      'faq-agent-roles': 'Agent 역할', 'faq-qa-loop': 'QA와 Loop', 'faq-practice': '실습',
      'references': '유진의 재구성', 'closing': '실행 기준', 'survey-week2': '만족도 조사'
    }[s.id];
    return phrase ? s.title.split(phrase).map(esc).join('<span class="title-emphasis">' + esc(phrase) + '</span>') : esc(s.title);
  }
  function header(s, n) {
    const ch = D.chapters.find(c => c.id === s.chapter);
    return '<header><span class="eyebrow ' + (s.type === 'lab' ? 'lab-kicker' : '') + '">' + ch.n + '<span class="slash">/</span>' + esc(ch.en) + (s.type === 'lab' ? '<span class="slash">/</span>WRITE & BUILD' : '') + '</span><span class="slide-index">AWAC 1기 · 2회차 <span class="slash">/</span> ' + String(n + 1).padStart(2, '0') + '</span></header>';
  }
  function credit(s) {
    return '<footer class="slide-credit"><span>YUJIN FLOW / 이유진</span>' + (s.source ? ext(D.sources[s.source].url, D.sources[s.source].title) : '') + '<span class="stage-meta">' + (s.source ? '공식 문서 확인 ' + D.checked : 'AFTER WORK AI CLUB') + '</span></footer>';
  }
  function renderSlide(n, focus = false) {
    cancelFlow(); stopExamples(); window.YFOrchestration.stop(); window.YFCLI.stop(); guideStep = 0; frameworkIndex = -1;
    active = Math.max(0, Math.min(D.slides.length - 1, n));
    const s = D.slides[active]; state.slide = s.id;
    const article = $('#slide');
    article.className = s.type + '-slide slide-enter';
    if (s.type === 'hero') {
      article.innerHTML = '<div class="slide-inner">' + header(s, active) + '<div class="hero-copy"><div class="hero-name">YUJIN FLOW</div><h1>내 일을 대신할<br>나만의 <span class="accent">AI AGENT</span> 만들기.</h1><div class="hero-corner" aria-hidden="true">↗</div></div><div class="hero-bottom"><div><p>' + esc(s.subtitle) + '</p><p class="hero-impact">' + esc(s.impact) + '</p><p class="hero-hook">' + esc(s.hook) + '</p></div><div class="hero-signature"><b>이유진</b><a href="mailto:lee.yoojin.work@gmail.com">lee.yoojin.work@gmail.com</a></div></div><div class="hero-strip"><span><b>Y</b>Why Gap<small>진짜 병목은?</small></span><span><b>U</b>User Job<small>입력과 출력은?</small></span><span><b>J</b>Journey<small>흐름과 예외는?</small></span><span><b>I</b>Intelligence Fit<small>AI가 맞는 일은?</small></span><span><b>N</b>Next Agent<small>어떻게 다시 쓰나?</small></span></div><div class="hero-start">' + button('오늘의 흐름', 'next', 'arrow-right', 'lime') + '</div></div>';
    } else if (s.type === 'agent-intro') {
      article.innerHTML = '<div class="slide-inner">' + header(s, active) + '<div class="agent-intro-stage"><p class="agent-intro-kicker">YUJIN FLOW / AGENT LAB</p><div class="agent-intro-display" aria-hidden="true"><span>BUILD YOUR</span><strong>AGENT<span class="agent-intro-period">.</span></strong></div><h1>' + esc(s.title).replace(/\n/g, ' <br>') + '</h1><ol class="agent-intro-sequence">' + [['target', '목표', '어디까지 해낼 것인가'], ['wrench', '도구', '무엇을 사용할 것인가'], ['git-branch', '판단', '다음 행동은 무엇인가'], ['terminal', '실행', '결과를 만들고 확인하기']].map((x, i) => '<li style="--step:' + i + '"><span class="agent-intro-node">' + icon(x[0]) + '<b>' + x[1] + '</b><small>0' + (i + 1) + '</small></span><p>' + x[2] + '</p></li>').join('') + '</ol><div class="agent-intro-bottom"><p>내 업무 흐름 한 장에서, 첫 실행까지.</p><button type="button" class="icon-button" data-action="agent-replay" aria-label="제작 모션 다시 보기" title="제작 모션 다시 보기">' + icon('rotate-ccw') + '</button></div></div>' + credit(s) + '</div>';
    } else if (s.type === 'closing') {
      article.innerHTML = '<div class="slide-inner">' + header(s, active) + '<div class="closing-content"><h1>' + titleMarkup(s) + '</h1><p>' + esc(s.subtitle) + '</p><div class="button-row">' + button('내 결과물 가져가기', 'export-open', 'download', 'lime') + button('실습노트 열기', 'notebook', 'notebook-pen', 'secondary') + '</div></div><div class="closing-end"><b>YUJIN FLOW</b><span>일을 맡기는 사람, 이유진</span></div></div>';
    } else {
      article.innerHTML = '<div class="slide-inner">' + header(s, active) + '<h1 class="slide-title">' + titleMarkup(s) + '</h1>' + (s.subtitle ? '<p class="slide-subtitle">' + esc(s.subtitle) + '</p>' : '') + '<div class="slide-body">' + window.YFOperations.criteria(s) + window.YFOperations.verification(s) + body(s) + window.YFArtifacts.slideFooter(s) + '</div>' + credit(s) + '</div>';
    }
    article.scrollTop = 0;
    $('#current').textContent = String(active + 1).padStart(2, '0');
    $('#total').textContent = D.slides.length;
    $('#deck-progress-fill').style.width = ((active + 1) / D.slides.length * 100) + '%';
    const chapter = D.chapters.find(c => c.id === s.chapter);
    $('#chapter-label').textContent = chapter.n + ' / ' + chapter.en;
    $('#slide-title').textContent = s.title.replace(/\n/g, ' ');
    $('#previous').disabled = active === 0;
    $('#next').disabled = active === D.slides.length - 1;
    $$('.chapter-button').forEach(b => b.setAttribute('aria-current', b.dataset.chapter === s.chapter ? 'step' : 'false'));
    $('#speaker-notes').innerHTML = '<b>INSTRUCTOR NOTE · ' + String(active + 1).padStart(2, '0') + '</b>' + esc(s.note || '');
    window.YFMascot.mount(s);
    if (s.type === 'anatomy') window.YFOrchestration.mount();
    if (s.type === 'flow') setupFlow(s.case);
    if (s.type === 'mission') setupMission();
    if (s.type === 'code-run') window.YFCLI.setup();
    if (s.id === 'hmw') setupExamples();
    window.YFTimers.refresh();
    icons();
    if (focus) article.focus({ preventScroll: true });
  }
  function body(s) {
    const personal = window.YFPersonal.body(s);
    if (personal !== null) return personal;
    switch (s.type) {
      case 'prompt-techniques': return window.YFPromptTechniques.markup();
      case 'homework-bridge': return '<div class="homework-bridge"><section><span class="eyebrow">01 / 가져오기</span><h2>1주차에 적은 세 가지</h2><ol><li>내가 풀고 싶은 문제 하나</li><li>왜 불편한지</li><li>Agent가 해줬으면 하는 일</li></ol><p>내 1주차 상세 페이지에서 가져오세요. 짧은 메모나 음성으로 풀어 쓴 내용도 괜찮습니다.</p></section><section><span class="eyebrow">02 / 구체화하기</span><h2>기능보다 문제부터</h2><p class="homework-before">“CS 문의가 많아서 챗봇을 만들고 싶다.”</p><p>누가, 언제, 무엇 때문에 어려운가요? FAQ를 찾는 시간인지, 예외 문의를 판단하는 일인지 나눠봅니다.</p><p><b>가설:</b> 문의가 몰릴 때 CS 담당자가 FAQ를 반복해서 찾느라 첫 답변이 늦어진다.</p></section></div><div class="homework-next"><p>오늘은 이 문제를 작은 PoC로 검증한 뒤 Agent의 역할·입력·완료 기준으로 옮깁니다.</p>' + button('1주차 과제 가져오기', 'goto', 'notebook-pen', 'primary', 'data-slide="lab-gap"') + '</div>';
      case 'deliverables': return '<p class="deliverable-impact">Before: 반복 분류와 복사·붙여넣기 <span>After: 내 Agent가 초안을 만들고, 사람은 검수와 승인</span></p><div class="deliverable-motion-tools"><span>DESIGN → BUILD → RUN → VERIFY</span><button type="button" class="icon-button" data-action="deliverables-motion" aria-label="흐름 애니메이션 일시 정지" aria-pressed="false" title="흐름 애니메이션 일시 정지">' + icon('pause') + '</button></div><div class="deliverable-ribbon" aria-hidden="true"><div>' + Array(2).fill('<span>MY PROJECT <b>→</b> MY SKILL <b>→</b> MY WORKFLOW <b>→</b> MY RESULTS <b>→</b> </span>').join('') + '</div></div><div class="deliverable-list">' + [
        ['folder-open', 'Project 하나', '내 지침과 기준 파일을 등록한 업무 공간.'],
        ['package', 'Skill 하나', '다시 쓸 절차가 들어 있는 SKILL.md와 ZIP.'],
        ['git-branch', '업무 흐름 한 장', '시작·분업·검수·승인·중단까지 연결.'],
        ['file-check-2', '실행 기록 두 번', '다른 입력으로 확인한 결과와 수정 이유.']
      ].map((x, i) => '<div class="deliverable" style="--output-index:' + i + '"><div class="num">0' + (i + 1) + ' / OUTPUT</div>' + icon(x[0]) + '<h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>').join('') + '</div><div class="schedule">' + D.chapters.map(c => '<div><small>' + c.n + ' / ' + c.en + '</small><b>' + c.name + '</b><span>' + c.minutes + '분</span></div>').join('') + '</div>';
      case 'compare': return '<div class="compare-grid">' + [s.left, s.right].map(c => '<section class="compare-column"><p class="compare-label">' + esc(c.label) + '</p><h3>' + esc(c.title) + '</h3><ul>' + c.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>').join('') + '</div>';
      case 'reveal': return taxiMarkup(s);
      case 'editorial': return (s.intro ? '<p class="leadline">' + esc(s.intro) + '</p>' : '') + '<div class="editorial-list">' + s.rows.map(r => '<div class="editorial-row"><h3>' + esc(r[0]) + '</h3><p>' + esc(r[1]) + '</p></div>').join('') + '</div>' + (s.caption ? '<p class="caption">' + esc(s.caption) + '</p>' : '');
      case 'framework': return '<div class="framework-grid">' + [
        ['Y', 'Why Gap', '현재 업무 방식의 진짜 병목은 어디인가?', '원하는 상태와 지금 상태의 차이.', 'problem.md'],
        ['U', 'User Job', 'AI에게 시킬 Input/Output 구조는 무엇인가?', '누가 어떤 결과를 얻으려는지.', 'job-story.md'],
        ['J', 'Journey', '업무의 세부 흐름과 예외 상황은 어떻게 되는가?', '실제 업무의 앞뒤와 판단 지점.', 'workflow.md'],
        ['I', 'Intelligence Fit', '이 단계에 맞는 AI 모델·툴은 무엇인가?', 'AI의 일, 사람의 일, 중단 기준.', 'boundaries.md'],
        ['N', 'Next Agent', '이 흐름을 어떻게 지속 가능한 Agent로 만드는가?', '등록하고 실행하고 다시 쓸 설계.', 'SKILL.md']
      ].map((r, i) => '<div class="framework-step" style="--i:' + i + '"><div class="framework-letter">' + r[0] + '</div><b>' + r[1] + '</b><strong class="framework-question">' + r[2] + '</strong><p>' + r[3] + '</p><button type="button" class="file-tag artifact-link" data-action="artifact-open" data-stage="' + r[0] + '" title="' + r[0] + ' 과제 시작">' + r[4] + icon('arrow-right') + '</button>' + window.YFArtifacts.assignment(r[0]) + '</div>').join('') + '</div><div class="framework-controls">' + button('한 단계씩 보기', 'framework-next', 'step-forward', 'secondary') + '<p class="framework-desc" id="framework-desc">각 칸의 한 줄 질문에 답하면 실제 MD 과제와 실행 기준으로 이어집니다.</p></div>';
      case 'formula': return '<div class="formula-tokens">' + s.tokens.map(t => '<span>' + esc(t) + '</span>').join('') + '</div>' + (s.id === 'hmw' ? examplesMarkup() : '<p class="formula-example">' + esc(s.example) + '</p><p class="caption">' + esc(s.caption) + '</p>');
      case 'traffic': return '<p class="poc-definition"><b>PoC (Proof of Concept) · 개념 검증</b><br>작은 데이터로 구현 가능성과 품질을 확인합니다. 오늘은 가상 문의 5건으로 분류·FAQ 기반 초안을 검증합니다. 고객이 쓰는 최소 제품인 MVP나 실제 운영 배포와는 다릅니다.</p><div class="traffic-grid">' + [
        ['GREEN / 사용 가능', '이 범위에서는\n쓸 수 있다.', '작은 입력에서도 ID와 형식이 맞고 결과를 쉽게 확인할 수 있다.', '맡길 범위를 좁게 유지'],
        ['AMBER / 검수 후 사용', '초안은 되지만,\n검수가 필요하다.', '분류 기준이나 표현이 모호해 사람이 확인해야 한다.', '기준표 + 검수 지점 추가'],
        ['RED / 재설계', '다시 설계하거나\n사람에게 넘긴다.', '필요한 정보·도구가 없거나 품질을 확인하기 어렵다.', '입력·작업·적용 방식 수정']
      ].map(x => '<div class="traffic-item"><div class="light">' + x[0] + '</div><h3>' + esc(x[1]).replace(/\n/g, '<br>') + '</h3><p>' + x[2] + '</p><div class="decision">' + x[3] + '</div></div>').join('') + '</div>';
      case 'pipeline': return '<div class="pipeline">' + s.steps.map((x, i) => '<div class="pipeline-node"><span class="num">STEP 0' + (i + 1) + '</span><h3>' + esc(x) + '</h3><p>' + esc(s.details[i]) + '</p></div>').join('') + '</div><p class="pipeline-note">앞 단계의 출력이 다음 단계의 입력이 됩니다.<br>“정리한다”를 “무엇을 읽어 어떤 표를 만든다”로 바꿔보세요.</p>';
      case 'concepts': return '<div class="table-scroll"><table class="concept-table"><thead><tr><th>구분</th><th>어떻게 일하나</th><th>우리 실습에서</th></tr></thead><tbody><tr><td>Prompt</td><td>한 번의 작업을 요청한다.</td><td>“이 CSV를 분류해줘.”</td></tr><tr><td>Workflow</td><td>정해둔 단계와 분기를 따른다.</td><td>읽기 → 분류 → 집계 → 검수</td></tr><tr class="highlight"><td>Agent</td><td>목표·관찰 결과에 맞춰 도구와 다음 행동을 선택한다.</td><td>누락을 발견하면 해당 입력을 다시 읽고 수정</td></tr><tr><td>Project / Skill</td><td>공통 맥락 / 재사용 절차를 제공한다.</td><td>기준 문서 / triage-and-draft</td></tr></tbody></table></div><p class="caption">웹 실습은 도구를 쓰는 Agentic workflow부터 시작합니다. Project를 만드는 것만으로 예약 실행이나 다중 Agent가 생기지는 않습니다.</p>';
      case 'anatomy': return window.YFOrchestration.markup();
      case 'split-criteria': return splitCriteriaMarkup();
      case 'example-gallery': return exampleGalleryMarkup();
      case 'flow': return flowMarkup(s.case);
      case 'lab': return (s.lab === 'skill' ? '<div class="button-row">' + button('내 Project 절차 가져오기', 'personal-skill', 'import', 'secondary') + '</div>' : '') + form(s.lab, 'deck');
      case 'casebrief': return '<div class="case-brief-grid"><div><p class="case-headline">고객 문의를 읽고,<br>FAQ에 근거한<br>답변 초안을 쓴다.</p><div class="case-checks"><span>' + icon('check') + '전체 ID 포함</span><span>' + icon('check') + 'FAQ 근거 있는 초안</span></div></div><div class="case-details"><dl><div><dt>사용자</dt><dd>온라인 쇼핑몰 CS 담당자</dd></div><div><dt>입력</dt><dd>가상 문의 8건 + FAQ·분류 기준</dd></div><div><dt>AI의 일</dt><dd>분류·집계, FAQ 확인, 초안 3개</dd></div><div><dt>사람의 일</dt><dd>답변 검토, 예외 판단과 고객 발송</dd></div><div><dt>산출물</dt><dd>classification.csv<br>cs-response-drafts.md</dd></div></dl></div></div><p class="caption">이 사례와 응답은 학습을 위해 만든 가상 데이터입니다.</p>';
      case 'assets': return assetsMarkup();
      case 'guide': return '<div id="guide-container">' + guideMarkup(s.guide) + '</div>';
      case 'project-export': return '<div class="export-layout"><div><pre class="code-preview">' + esc(E.projectInstructions(state)) + '</pre><div class="button-row" style="margin-top:16px">' + button('내 Project 지침 복사', 'copy-project', 'copy', 'primary') + button('지침 MD 저장', 'download-project', 'download', 'secondary') + '</div></div><div class="export-sidebar"><h3>Set project instructions<br>→ Save instructions</h3><p>앞에서 쓴 질문과 답변이 모두 포함됩니다. 미입력 항목을 먼저 채우고 Project에 붙여넣으세요.</p><p>지침은 이름·설명과 별도로 저장해야 합니다.</p><div class="button-row">' + button('지침 작성으로', 'goto', 'pencil', 'secondary', 'data-slide="lab-instructions"') + button('CS 참고 예시 지침', 'copy-example-project', 'copy', 'secondary') + '</div></div></div>';
      case 'result': return resultMarkup();
      case 'skill-structure': return '<div class="skill-structure-grid"><div class="filetree">my-skill/\n├── SKILL.md\n└── references/\n    ├── 업무-기준.md\n    └── 출력-양식.md</div><div class="skill-parts"><div class="skill-part"><b>name + description</b><p>무슨 Skill이고 언제 사용할지 찾는 표지.</p></div><div class="skill-part"><b>SKILL.md 본문</b><p>입력, 절차, 결과 형식, 검수, 멈출 조건.</p></div><div class="skill-part"><b>references/</b><p>필요할 때 읽는 기준과 양식. 본문에 경로를 연결합니다.</p></div></div></div><p class="caption">Skill 자체는 사람도, 예약 실행기도 아닙니다. 실행 환경이 읽고 사용하는 업무 자산입니다.</p>';
      case 'skill-export': return skillExportMarkup();
      case 'rerun': return '<div class="export-layout"><div>' + promptBlock(E.secondRun, 'secondRun') + '</div><div class="export-sidebar"><h3>새 입력으로 재사용 검증</h3><p>B01에는 복합 의견, B05에는 지시문처럼 보이는 데이터, B06에는 빈 응답이 있습니다.</p><p>6개 ID가 모두 포함되는지, B05의 문장을 실행하지 않는지 확인하세요.</p><div class="button-row">' + button('B 데이터 받기', 'download-sample', 'download', 'secondary', 'data-file="inquiries-b.csv"') + '</div><p class="caption">Skill 사용 여부는 실행 활동에서 확인합니다. 모델이 “사용했다”고 답한 문장만으로 판정하지 않습니다.</p></div></div>';
      case 'code-start': return '<div class="code-split"><div><ol class="ordered-steps"><li>Claude Code에서 빈 실습 폴더를 엽니다.</li><li>시작 키트를 풀거나, 옆의 요청으로 파일 생성을 맡깁니다.</li><li><code>.claude/agents/review-cs.md</code>의 역할과 도구를 읽어봅니다.</li></ol><div class="button-row">' + button('Code 시작 키트 ZIP', 'code-kit', 'folder-down', 'primary') + '</div><p class="code-note">현재 공식 문서: /agents 생성 마법사는 v2.1.198부터 제거되었습니다. 파일 또는 자연어 생성 요청을 사용합니다.</p></div><div>' + promptBlock(E.codeCreate, 'codeCreate') + '</div></div>';
      case 'code-files': return '<p class="caption">아래 파일 트리는 CS 심화 키트의 한 가지 구성입니다.</p><div class="skill-structure-grid"><div class="filetree">my-cs-agent/\n├── CLAUDE.md              ← Orchestrator 지침\n├── .claude/\n│   ├── agents/\n│   │   └── review-cs.md    ← 검수 담당 Subagent\n│   └── skills/\n│       └── triage-and-draft/\n│           └── SKILL.md\n├── data/                  ← 입력\n├── scripts/\n│   └── verify_outputs.py\n└── output/                ← 실행 후 생성</div><div class="skill-parts"><div class="skill-part"><b>Orchestrator / 총괄</b><p>목표 확인 → 작업 분해·위임 → 결과 통합. 필요하면 직접 작업도 합니다.</p></div><div class="skill-part"><b>Subagent / 담당자</b><p>맡은 조사·작성·검수를 허용된 도구로 실행 → 결과 반환. 검수 전용이라는 뜻은 아닙니다.</p></div><div class="skill-part"><b>강의자료 제작에 적용하면</b><p>총괄 → 자료 조사 담당·슬라이드 작성 담당·검수 담당에 위임 → 통합 → 강사 승인.</p></div><div class="skill-part"><b>이 CS 키트의 선택</b><p>Orchestrator가 초안을 만들고 review-cs는 읽기 전용 검수만 수행합니다. Skill은 각 담당자가 참고하는 절차입니다.</p></div></div></div>';
      case 'code-run': return window.YFCLI.markup();
      case 'metrics': return '<div class="metric-equation">기존 처리 시간 − (AI 처리 + 검수 + 재작업)<strong>= 실제로 돌려받은 시간</strong></div>' + metricValues() + '<p class="caption">아래 값은 내 실습노트의 입력으로 계산합니다. 미입력일 때는 결과를 표시하지 않습니다.</p><div class="button-row" style="margin-top:24px">' + button('내 시간 입력하기', 'goto', 'pencil', 'secondary', 'data-slide="lab-metrics"') + '</div>';
      case 'takeaway': return window.YFArtifacts.mapping() + window.YFArtifacts.panel('N') + takeawayMarkup();
      case 'troubleshooting': return '<div class="help-return">' + button('하던 실습으로', 'goto', 'arrow-left', 'secondary', 'data-slide="' + helpOrigin + '"') + '</div><div id="triage-container">' + window.YFOperations.triage() + '</div><div class="faq">' + [
        ['Skills 메뉴가 보이지 않아요.', 'Settings → Capabilities에서 코드 실행·파일 생성을 확인하고 Customize → Skills로 이동합니다. 조직 계정은 관리자 설정을 확인합니다. 기능을 사용할 수 없다면 같은 절차를 Project 지침으로 먼저 시험하고 Skill 실행은 미완료로 기록합니다.'],
        ['Skill ZIP 업로드가 실패해요.', 'ZIP 안에 이름이 일치하는 Skill 폴더와 SKILL.md가 있는지 확인합니다. name·description을 점검하고 이 덱의 완성 예시 ZIP과 구조를 비교합니다.'],
        ['새 대화에서 이전 결과를 모르네요.', '재사용할 기준은 Project 지식 또는 Skill에 저장합니다. 이번 실행 데이터는 새 대화에도 첨부합니다. 이전 채팅 전체가 항상 공유된다고 가정하지 않습니다.'],
        ['Claude Code에서 Subagent를 못 찾아요.', '.claude/agents/ 아래 파일 경로와 frontmatter를 확인합니다. 세션 도중 처음 agents 폴더를 만들었다면 Claude Code를 다시 열고 구체적으로 위임을 요청합니다.'],
        ['다른 기기에서 내 노트가 안 보여요.', '노트는 작성한 브라우저의 로컬 저장소에 있습니다. 내보낸 MD를 가져가세요. 브라우저 저장소를 지우거나 비공개 창을 닫으면 기록이 사라질 수 있습니다.'],
        ['이 HTML이 Claude를 직접 실행하나요?', '아니요. 이 덱은 설계·기록·파일 만들기와 학습용 순서도 시연을 제공합니다. 실제 AI 작업은 본인의 Claude에서 실행하고 관찰한 결과를 기록합니다.']
      ].map(x => '<details><summary>' + x[0] + '</summary><p>' + x[1] + '</p></details>').join('') + '</div>';
      case 'references': return '<div class="source-list">' + Object.values(D.sources).map(x => '<div class="source-item">' + ext(x.url, x.title) + '<p>' + (x === D.sources.brunch ? '제공 자료 · 문제에서 출발하는 기획 관점' : '기술 개념과 실습 경로 확인 · ' + D.checked) + '</p></div>').join('') + '</div><p class="source-note">추가 참고: 사용자가 제공한 designbywani의 문제정의·JTBD·HMW 이미지, NAVER CONNECT TechRun의 AI 가능성 실험 이미지, AX·일의 변화 관련 게시물과 Trevari 소개 자료.</p><p class="source-note">YUJIN FLOW와 실습 사례·질문·파일은 이유진 강의 맥락으로 새로 구성했습니다. 화면 안내는 학습용 재구성입니다.</p>';
      case 'faq': return faqMarkup(s);
      case 'survey': return surveyMarkup(s);
      case 'mission-brief': return missionBrief();
      case 'mission': return missionMarkup();
      default: return '';
    }
  }
  function assetsMarkup() {
    const file = (name, description, symbol) => '<div class="asset-file">' + icon(symbol) + '<div><code>' + name + '</code><p>' + description + '</p></div><div class="asset-file-actions"><button type="button" data-action="copy-sample" data-file="' + name + '" title="' + name + ' 내용 복사" aria-label="' + name + ' 내용 복사">' + icon('copy') + '</button><button type="button" data-action="download-sample" data-file="' + name + '" title="' + name + ' 받기" aria-label="' + name + ' 받기">' + icon('download') + '</button></div></div>';
    return '<div class="asset-workspace"><section class="asset-zone knowledge"><header><span>01 · 한 번 설정</span><h2>Project knowledge</h2><p>Agent가 계속 참고할 기준과 결과 양식</p></header>' + file('rubric.md', '무엇을 어떻게 분류하고 검수할지', 'list-checks') + file('report-template.md', '답변 3개에 문의 ID·FAQ ID를 남길 양식', 'file-text') + '</section><div class="asset-divider" aria-hidden="true">' + icon('arrow-right') + '<span>입력만 교체</span></div><section class="asset-zone run"><header><span>02 · 실행마다 교체</span><h2>New chat</h2><p>한 번의 실행에서 분석할 입력 하나</p></header>' + file('inquiries-a.csv', '첫 실행 · 총 8건 중 미응답 1건', 'file-spreadsheet') + file('inquiries-b.csv', '재사용 검증 · 복합 문의와 지시문형 원문', 'file-spreadsheet') + '</section></div><div class="asset-bottom"><p><b>기준은 유지하고, 입력만 바꿉니다.</b><br>가상·익명 자료이며 Claude 첨부는 직접 진행합니다.</p>' + button('실습 자료 ZIP', 'sample-kit', 'folder-down', 'primary') + '</div>';
  }
  function faqMarkup(s) {
    return '<div class="faq-deck"><div class="faq-anchor"><span class="eyebrow">LIVE Q&A</span><b>질문을 받기 전,<br>용어를 한 번 맞춥니다.</b></div><div class="faq">' + s.items.map((x, i) => '<details ' + (i === 0 ? 'open' : '') + '><summary><span>' + String(i + 1).padStart(2, '0') + '</span>' + esc(x[0]) + '</summary><div class="faq-answer"><strong>' + esc(x[1]) + '</strong><p>' + esc(x[2]) + '</p></div></details>').join('') + '</div></div>';
  }
  function surveyMarkup(s) {
    return '<div class="survey-layout"><section class="survey-copy"><span class="eyebrow">WRAP-UP</span><h2>휴대폰 카메라로 QR을 찍고<br>오늘 수업을 남겨주세요.</h2><p>좋았던 점, 헷갈린 지점, 다음 시간에 더 보고 싶은 실습을 적어주시면 3주차 흐름에 바로 반영합니다.</p><a class="button primary" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + icon('external-link') + '설문 링크 열기</a></section><section class="survey-qr-card"><img src="' + esc(s.qr) + '" alt="2주차 만족도 조사 QR 코드"><p>2주차 만족도 조사</p></section></div>';
  }
  function splitCriteriaMarkup() {
    const criteria = [
      ['전문성이 다를 때', '자료 조사·정책 확인·디자인 검수처럼 읽는 기준과 근거가 다르면 나눈다.', 'Parallelization / Orchestrator-workers'],
      ['산출 단계가 다를 때', '리서치 결과, 슬라이드 초안, 검수 리포트처럼 다음 단계의 입력이 되는 결과물이 다르면 나눈다.', 'Prompt chaining'],
      ['분기 기준이 다를 때', '요청 유형에 따라 FAQ 답변, 원인 분석, 보류 질문처럼 다른 경로를 타야 하면 나눈다.', 'Routing'],
      ['반복 검수가 필요할 때', '초안이 기준을 못 넘으면 수정 지시를 돌려보내고 다시 확인해야 하면 나눈다.', 'Evaluator-optimizer']
    ];
    const agents = [
      ['Orchestrator', '강의 목적·수강생 수준·시간표를 잡고 작업을 배분한다.'],
      ['Research worker', '공식 자료와 제공 자료에서 근거·용어·주의점을 모은다.'],
      ['Deck writer', '흐름에 맞춰 장표 카피와 실습 안내를 작성한다.'],
      ['QA reviewer', '시간, 누락, 번역체, 검수 지점, 파일 열림 여부를 확인한다.']
    ];
    return '<div class="split-layout"><section class="split-rule"><span class="eyebrow">START SIMPLE</span><h2>처음부터 쪼개지 않습니다.</h2><p>하나의 Project와 Skill로 실행해보고, 역할을 나눌 이유가 생길 때만 Subagent를 둡니다.</p><div class="split-gate"><b>질문</b><span>이 일을 한 사람이 같은 기준으로 끝낼 수 있나?</span></div></section><section class="split-criteria-list">' + criteria.map((x, i) => '<div class="split-criterion"><span>0' + (i + 1) + '</span><h3>' + x[0] + '</h3><p>' + x[1] + '</p><small>' + x[2] + '</small></div>').join('') + '</section></div><div class="split-example"><div><span class="eyebrow">YUJIN FLOW → N</span><h3>강의자료 제작 Agent라면</h3><p>문제정의와 Journey에서 나눌 지점을 찾고, Intelligence Fit에서 사람이 승인할 곳을 정합니다.</p></div><ol>' + agents.map(x => '<li><b>' + x[0] + '</b><span>' + x[1] + '</span></li>').join('') + '</ol></div>';
  }
  function exampleGalleryMarkup() {
    const examples = [
      ['강의자료', '자료가 흩어져 덱 흐름 잡는 데 오래 걸린다.', '브리프·원문을 읽고 6장 초안과 검수표를 만든다.', '강사가 톤·사실·시간을 승인한다.'],
      ['CS', '문의가 몰릴 때 FAQ를 반복해서 찾느라 첫 답변이 늦다.', '문의 분류, FAQ 근거 확인, 답변 초안 3개를 만든다.', '담당자가 예외 문의와 발송을 판단한다.'],
      ['취준생', '공고별로 어떤 경험을 써야 할지 매번 막힌다.', '공고 요건과 경험 기록을 매칭해 지원서 초안을 만든다.', '본인이 사실·수치·표현을 확인한다.'],
      ['개발', '버그 제보가 모호해 원인 파악과 수정 범위가 흔들린다.', '재현 조건을 정리하고 수정 후보와 테스트 체크를 만든다.', '개발자가 코드 변경·PR·배포를 승인한다.'],
      ['HR', '반복 문의에 정책 근거를 붙여 답하는 데 시간이 든다.', '문의 유형을 나누고 규정 근거와 답변 초안을 만든다.', '담당자가 개인별 예외와 민감 판단을 맡는다.'],
      ['기획·마케팅', 'VOC·브리프가 흩어져 우선순위와 메시지가 흔들린다.', '주제 분류, 초안 작성, 근거 부족 항목을 표시한다.', '사람이 주장·예산·외부 공개를 승인한다.']
    ];
    return '<div class="example-gallery"><section class="example-focus"><span class="eyebrow">ONE FLOW</span><h2>공식은 같습니다.</h2><p>문제정의 → AI가 할 일 → 사람이 검수할 지점을 같은 순서로 적으면, 직무가 달라도 Agent 설계가 흔들리지 않습니다.</p>' + button('내 Guardrails 쓰기', 'goto', 'arrow-right', 'primary', 'data-slide="lab-boundary"') + '</section><section class="example-cards">' + examples.map((x, i) => '<article class="example-card"><span>' + String(i + 1).padStart(2, '0') + '</span><h3>' + x[0] + '</h3><dl><div><dt>문제정의</dt><dd>' + x[1] + '</dd></div><div><dt>AI의 일</dt><dd>' + x[2] + '</dd></div><div><dt>사람 검수</dt><dd>' + x[3] + '</dd></div></dl></article>').join('') + '</section></div>';
  }
  let exampleTimer = null, exampleIndex = 0, examplesPaused = false;
  const reducedExamples = window.matchMedia('(prefers-reduced-motion: reduce)');
  function examplesMarkup() {
    const controls = [['prev', 'chevron-left', '이전 예시'], ['pause', 'pause', '예시 자동 전환 정지'], ['next', 'chevron-right', '다음 예시']];
    return '<section class="hmw-examples" aria-label="직무별 HMW 예시"><div class="hmw-example-top"><span class="eyebrow" id="hmw-domain"></span><div class="hmw-example-controls"><span id="hmw-count"></span>' + controls.map(([action, symbol, label]) => '<button type="button" class="icon-button" data-action="example-' + action + '" aria-label="' + label + '" title="' + label + '">' + icon(symbol) + '</button>').join('') + '</div></div><div class="hmw-example-stage"><p class="formula-example" id="hmw-example-text"></p><p class="caption" id="hmw-alternatives"></p></div></section>';
  }
  function stopExamples() { clearInterval(exampleTimer); exampleTimer = null; }
  function paintExample() {
    if (!$('#hmw-example-text')) return;
    const example = D.hmwExamples[exampleIndex];
    $('#hmw-domain').textContent = example.domain;
    $('#hmw-count').textContent = String(exampleIndex + 1).padStart(2, '0') + ' / ' + D.hmwExamples.length;
    $('#hmw-example-text').textContent = example.text;
    $('#hmw-alternatives').textContent = example.alternatives;
    const stage = $('.hmw-example-stage');
    stage.classList.remove('example-enter'); void stage.offsetWidth; stage.classList.add('example-enter');
    const toggle = $('[data-action="example-pause"]');
    const label = examplesPaused ? '예시 자동 전환 재생' : '예시 자동 전환 정지';
    toggle.setAttribute('aria-label', label); toggle.title = label;
    toggle.innerHTML = icon(examplesPaused ? 'play' : 'pause');
    icons();
  }
  function startExamples() {
    stopExamples();
    if (!examplesPaused && !document.hidden && mode === 'deck' && D.slides[active].id === 'hmw') {
      exampleTimer = setInterval(() => { exampleIndex = (exampleIndex + 1) % D.hmwExamples.length; paintExample(); }, 1500);
    }
  }
  function setupExamples() { exampleIndex = 0; examplesPaused = reducedExamples.matches; paintExample(); startExamples(); }
  function moveExample(delta) { examplesPaused = true; stopExamples(); exampleIndex = (exampleIndex + delta + D.hmwExamples.length) % D.hmwExamples.length; paintExample(); }
  document.addEventListener('visibilitychange', startExamples);
  reducedExamples.addEventListener('change', () => { if (reducedExamples.matches) { examplesPaused = true; stopExamples(); paintExample(); } });
  function taxiMarkup(s) {
    const key = '언제 차를 탈 수 있을지 몰라';
    const reveal = s.reveal.split(key).map(esc).join('<span class="motion-underline">' + esc(key) + '</span>');
    return '<div class="taxi-scene"><div class="taxi-route"><span>현재 위치</span><span class="destination">약속 장소</span></div><div class="taxi-skyline" aria-hidden="true"></div><div class="taxi-road" aria-hidden="true"></div><div class="taxi-car" aria-hidden="true"><div class="taxi-speed"></div><div class="taxi-sign">TAXI</div><div class="taxi-car-body"></div><span class="taxi-wheel left"></span><span class="taxi-wheel right"></span></div></div><div class="taxi-copy"><section class="taxi-purpose"><button type="button" class="button primary" data-action="taxi-answer" aria-controls="taxi-purpose-answer" aria-expanded="false">답 보기</button><div id="taxi-purpose-answer" role="status" aria-live="polite" hidden><span class="eyebrow">본질적 목적</span><p class="reveal-question"><span class="motion-underline">' + esc(s.prompt) + '</span></p><p class="caption">택시는 이 목적을 이루는 여러 수단 중 하나입니다.</p></div></section><button type="button" class="icon-button taxi-expand" data-action="reveal" aria-controls="taxi-context-answer" aria-label="상황을 더해 문제정의로 확장" title="상황을 더해 문제정의로 확장" aria-expanded="false" hidden>' + icon('arrow-right') + '</button><div id="taxi-context-answer" class="reveal-answer" role="status" aria-live="polite" hidden><span class="eyebrow">상황을 반영한 문제정의</span><h3>' + reveal.replace(/\n/g, '<br>') + '</h3><p>' + esc(s.after) + '</p><p class="caption">관찰로 확인할 문제 가설 예시</p></div></div>';
  }
  function guideMarkup(id) {
    const g = D.guides[id], step = g.steps[guideStep];
    return '<div class="guide-layout"><div class="guide-steps" role="tablist" aria-label="Claude 실습 단계">' + g.steps.map((x, i) => '<button type="button" class="guide-step" role="tab" id="guide-tab-' + i + '" aria-controls="guide-panel" aria-selected="' + (i === guideStep) + '" data-guide-step="' + i + '"><span class="step-num">0' + (i + 1) + '</span><span><strong>' + esc(x.title) + '</strong><span class="step-description">' + esc(x.body) + '</span><span class="step-outcome">남는 것 / ' + esc(x.result) + '</span></span></button>').join('') + '</div><div class="guide-preview" id="guide-panel" role="tabpanel" aria-labelledby="guide-tab-' + guideStep + '"><div class="mock-caption">학습용 화면 재구성 · 실제 UI와 다를 수 있음</div>' + mockWindow(step) + '<div class="guide-external"><span>공식 도움말 확인 ' + D.checked + '</span>' + ext(g.link, 'Claude 열기') + '</div></div></div>' + (id === 'run' ? window.YFPersonal.promptPanel() : '');
  }
  function mockWindow(step) {
    const action = (text, hi = true) => '<span class="mock-action' + (hi ? ' mock-highlight' : '') + '">' + esc(text) + '</span>';
    let inner = '';
    switch (step.view) {
      case 'projects': inner = '<h3>Projects</h3>' + action('+ New Project') + '<div class="mock-field" style="margin-top:28px">Your projects</div>'; break;
      case 'create': inner = '<h3>Create a project</h3><span class="mock-label">Name / 내 업무 이름</span><div class="mock-field">예: 강의자료 제작 Agent</div><span class="mock-label">Description</span><div class="mock-field">' + esc(E.answer(state,'instructions','goal') || '예: 원문을 청중에게 맞는 발표 덱으로') + '</div>' + action('Create project'); break;
      case 'knowledge': inner = '<h3>내 업무 Project</h3><span class="mock-label">Project knowledge / 내 기준·양식</span><div class="mock-file">예: deck-criteria.md</div><div class="mock-file">예: slide-template.md</div><div style="margin-top:20px">' + action('+ Add content') + '</div>'; break;
      case 'instructions': inner = '<h3>Set project instructions</h3><div class="mock-field">역할 · 목표 · 입력<br>절차 · 규칙 · 출력 · 검수</div>' + action('Save instructions'); break;
      case 'capabilities': inner = '<h3>Capabilities</h3><div class="mock-field">Code execution<br>and file creation <span class="mock-toggle mock-highlight"></span></div><p class="mock-check">파일을 생성하고 Skill을 실행할 환경</p>'; break;
      case 'skills': inner = '<h3>Skills</h3>' + action('+') + '<div class="mock-field" style="margin-top:24px">Your skills</div>'; break;
      case 'upload': inner = '<h3>Create skill</h3>' + action('Upload a skill') + '<div class="mock-field" style="margin-top:24px">' + esc(E.answer(state,'skill','name') || 'my-skill') + '.zip</div>'; break;
      case 'enabled': inner = '<h3>Your skills</h3><div class="mock-field">' + esc(E.answer(state,'skill','name') || '내 Skill') + '<span class="mock-toggle mock-highlight"></span></div><p class="mock-check">새 대화 + 다른 입력<br>같은 기준으로 다시 실행</p>'; break;
      case 'chat': inner = '<h3>내 업무 Project</h3>' + action('New chat') + '<div class="mock-field" style="margin-top:24px">이번 업무를 시작합니다.</div>'; break;
      case 'attach': inner = '<h3>New chat</h3><div class="mock-field">' + esc(E.answer(state,'instructions','input') || '내 입력 파일 / 시연: brief-a.md + sources.md') + '</div>' + action('+ 첨부'); break;
      case 'send': inner = '<h3>New chat</h3><div class="mock-field">아래의 내 실행 프롬프트 붙여넣기<br>입력 확인 → 작업 → 승인 대기</div>' + action('전송 ↑'); break;
      case 'files': inner = '<h3>생성된 결과물 확인</h3><div class="mock-file">' + esc(E.answer(state,'instructions','output') || '내가 정한 산출물') + '</div><div style="margin-top:20px">' + action('Download') + '</div>'; break;
    }
    return '<div class="mock-window"><div class="mock-topbar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span>claude.ai / ' + esc(step.menu) + '</span></div><div class="mock-body"><div class="mock-sidebar"><b>Claude</b><span>New chat</span><span class="' + (['projects', 'create', 'knowledge', 'instructions', 'chat', 'attach', 'send', 'files'].includes(step.view) ? 'selected' : '') + '">Projects</span><span class="' + (['skills', 'upload', 'enabled'].includes(step.view) ? 'selected' : '') + '">Customize</span><span>Settings</span></div><div class="mock-main">' + inner + '</div></div></div>';
  }
  function resultMarkup() {
    return '<span class="demo-label">A 데이터의 수업용 기대 결과 · 실제 모델 실행 결과 아님</span><div class="json-result"><div><table class="result-table"><thead><tr><th>주 분류</th><th>건수</th><th>근거 ID</th></tr></thead><tbody>' + [['배송',2,'A01, A06'],['반품·환불',2,'A02, A05'],['결제',2,'A03, A07'],['계정',1,'A04'],['미응답',1,'A08'],['합계',8,'A01–A08']].map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</tbody></table><div class="result-pass"><span>누락 0</span><span>중복 0</span><span>집계 8/8</span></div></div><div class="result-actions"><h3>담당자가 확인할 답변 초안 3개</h3><ol><li>배송 조회 메뉴 안내<span>A01 / FAQ-D01 · 실제 배송 상태는 알 수 없음</span></li><li>반품 접수 메뉴 안내<span>A02 / FAQ-R01 · 가능 여부는 담당자 확인</span></li><li>중복 결제 확인에 필요한 정보 안내<span>A03 / FAQ-P01 · 결제 취소를 단정하지 않음</span></li></ol>' + button('검수용 정답 CSV', 'download-sample', 'download', 'secondary', 'data-file="expected-classification-a.csv"') + '</div></div>';
  }
  function skillExportMarkup() {
    const errors = E.skillErrors(state);
    return '<div class="export-layout"><div><pre class="code-preview tall">' + esc(errors.length ? window.YFPersonal.lessonSkillFiles()['build-lecture-deck/SKILL.md'] : E.skillMarkdown(state)) + '</pre><p class="caption">' + (errors.length ? '현재 미리보기: 강의자료 제작 시연 예시. 내 Skill은 실습 칸을 모두 채운 뒤 생성합니다.' : '현재 미리보기: 내가 작성한 질문·답변으로 만든 Skill.') + '</p></div><div class="export-sidebar"><h3>직접 만든 업무 절차를<br>업로드할 수 있는 파일로.</h3><p>MD는 읽고 고치는 원본입니다. ZIP은 Skill 폴더째 Claude에 업로드하는 묶음입니다.</p><div class="button-row">' + button('내 SKILL.md', 'download-skill', 'file-down', 'primary') + button('내 Skill ZIP', 'skill-zip', 'package', 'secondary') + '</div>' + (errors.length ? '<p class="inline-feedback">내 Skill에 작성이 필요한 항목 ' + errors.length + '개</p>' + button('Skill 작성으로', 'goto', 'pencil', 'secondary', 'data-slide="lab-skill"') : '<p class="caption">내 질문과 답변이 SKILL.md 본문에 모두 포함됩니다.</p>') + '<div class="button-row">' + button('강의자료 제작 예시 ZIP', 'personal-lesson-skill', 'download', 'secondary') + button('CS 검수용 예시 ZIP', 'example-skill', 'download', 'secondary') + '</div><p class="caption">참고 파일을 직접 추가한 경우 본문의 경로와 ZIP 안의 위치가 맞는지 확인하세요.</p></div></div>';
  }
  function metricValues() {
    const m = E.metrics(state);
    return '<div class="metric-values"><div><span>기존 / 1회</span><b>' + (m ? format(m.before) + '분' : '—') + '</b></div><div><span>AI + 사람 / 1회</span><b>' + (m ? format(m.after) + '분' : '—') + '</b></div><div><span>주간 순절감</span><b class="' + (m && m.weekly < 0 ? 'negative' : '') + '">' + (m ? format(m.weekly) + '분' : '—') + '</b></div></div>';
  }
  function takeawayMarkup() {
    return '<div class="takeaway-grid"><div class="takeaway-item">' + icon('notebook-pen') + '<h3>전체 설계 노트</h3><p>모든 실습 질문, 답변, 검토 요청을 함께 묶은 프롬프트.</p><div class="button-row">' + button('전체 복사', 'copy-all', 'copy', 'primary') + button('MD 저장', 'download-all', 'download', 'secondary') + '</div></div><div class="takeaway-item">' + icon('folder-open') + '<h3>Project 지침</h3><p>실제 Claude 작업 공간에서 사용할 역할·절차·검수 조건.</p><div class="button-row">' + button('지침 복사', 'copy-project', 'copy', 'primary') + button('MD 저장', 'download-project', 'download', 'secondary') + '</div></div><div class="takeaway-item">' + icon('package') + '<h3>재사용 Skill</h3><p>업로드할 Skill ZIP과 직접 수정할 SKILL.md.</p><div class="button-row">' + button('Skill ZIP', 'skill-zip', 'package', 'primary') + button('SKILL.md', 'download-skill', 'file-down', 'secondary') + '</div></div></div><p class="privacy-note">' + icon('hard-drive') + '<span>입력은 이 브라우저에만 저장됩니다. 다른 참가자와 공유하거나 서버로 전송하지 않습니다. 같은 기기·브라우저 프로필은 기록을 함께 볼 수 있으므로 공용 기기에서는 내보낸 뒤 초기화하세요. Claude에 직접 붙여넣거나 업로드한 자료에는 Claude의 데이터 처리가 적용됩니다.</span></p>';
  }
  function flowNodes(c) {
    return [
      { id:'input', x:24, y:76, w:174, h:76, title:c.input, sub:'INPUT', kind:'start' },
      { id:'head', x:256, y:76, w:176, h:76, title:c.head, sub:'ORCHESTRATOR', kind:'task' },
      { id:'work1', x:488, y:76, w:176, h:76, title:c.workers[0], sub:'TASK / SUBAGENT 1', kind:'task' },
      { id:'work2', x:720, y:76, w:176, h:76, title:c.workers[1], sub:'TASK / SUBAGENT 2', kind:'task' },
      { id:'merge', x:720, y:308, w:176, h:76, title:c.merge, sub:'ORCHESTRATOR / SYNTHESIZE', kind:'task' },
      { id:'check', x:504, y:274, w:144, h:144, title:c.check, sub:'CHECK', kind:'decision' },
      { id:'human', x:256, y:308, w:176, h:76, title:c.human, sub:'HUMAN GATE', kind:'person' },
      { id:'output', x:24, y:308, w:174, h:76, title:c.output, sub:'OUTPUT', kind:'end' },
      { id:'stop', x:464, y:470, w:224, h:54, title:'중단 · 사람에게 질문', sub:'', kind:'end' }
    ];
  }
  function flowRationale(c) {
    const d = c.design;
    return '<aside class="flow-info flow-rationale" aria-label="' + esc(c.name) + ' 문제정의와 검수 기준"><section class="case-reason" data-case-reason="problem"><h2><span>01</span>문제정의</h2><p>' + esc(d.problem) + '</p></section><section class="case-reason" data-case-reason="rationale"><h2><span>02</span>왜 이 흐름인가?</h2><p>' + esc(d.rationale) + '</p></section><section class="case-reason case-human-review" data-case-reason="review"><h2><span>03</span>사람 검수 포인트</h2><ol>' + d.review.map(([when, check]) => '<li><b>' + esc(when) + '</b><p>' + esc(check) + '</p></li>').join('') + '</ol></section><details class="case-implementation"><summary>완료 목표 · 도구 · Skill · 권한' + icon('chevron-down') + '</summary>' + pair('완료 목표', c.goal) + pair('사용 도구', c.tools) + pair('재사용 Skill', c.skill) + pair('사람의 권한', c.action) + '</details><p class="case-design-note">학습용 가설 · 실제 적용 전 원인·효과 검증</p></aside>';
  }
  function flowMarkup(key) {
    const c = D.cases[key], nodes = flowNodes(c);
    const paths = '<path class="edge" d="M198 114H248"/><path class="edge" d="M432 114H480"/><path class="edge" d="M664 114H712"/><path class="edge" d="M808 152V300"/><path class="edge" d="M720 346H656"/><path class="edge" d="M504 346H440"/><path class="edge" d="M256 346H206"/><path class="edge loop-edge" d="M576 274V160"/><path class="edge loop-edge" d="M576 418V462"/>';
    const labels = '<text x="463" y="329" class="small" text-anchor="middle">통과</text><rect x="526" y="197" width="108" height="39" fill="#f7f8f5"/><text x="580" y="211" class="small" text-anchor="middle">수정 · 최대 2회</text><text x="580" y="229" class="small" text-anchor="middle">' + esc(c.returnLabel) + '</text><rect x="545" y="429" width="62" height="17" fill="#f7f8f5"/><text x="576" y="441" class="small" text-anchor="middle">한도 초과</text>';
    const shapes = nodes.map(n => '<g class="flow-node" data-flow-node="' + n.id + '" data-kind="' + n.kind + '">' + (n.kind === 'decision' ? '<polygon points="' + (n.x+n.w/2) + ',' + n.y + ' ' + (n.x+n.w) + ',' + (n.y+n.h/2) + ' ' + (n.x+n.w/2) + ',' + (n.y+n.h) + ' ' + n.x + ',' + (n.y+n.h/2) + '"/>' : '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="' + (['start','end'].includes(n.kind)?25:5) + '"/>') + '<text x="' + (n.x+n.w/2) + '" y="' + (n.y+n.h/2+7) + '" text-anchor="middle">' + esc(n.title) + '</text>' + (n.sub ? '<text class="small" x="' + (n.x+n.w/2) + '" y="' + (n.y+n.h/2-15) + '" text-anchor="middle">' + n.sub + '</text>' : '') + '</g>').join('');
    return '<div class="flow-layout"><div class="flow-area"><div class="flow-toolbar"><div class="flow-controls">' + button('흐름 재생', 'flow-play', 'play', 'primary small') + '<button type="button" class="icon-button" data-action="flow-step" title="한 단계 진행" aria-label="한 단계 진행">' + icon('step-forward') + '</button><button type="button" class="icon-button" data-action="flow-reset" title="흐름 다시 시작" aria-label="흐름 다시 시작">' + icon('rotate-ccw') + '</button></div><span class="flow-label"><i></i>학습용 시연 · 실제 AI 호출 없음</span></div><svg class="workflow-svg" viewBox="0 0 920 540" role="img" aria-label="' + esc(c.name + ' 업무 순서도. 입력, Orchestrator, 작업 역할, 결과 통합, 검수. 실패하면 최대 2회 수정하고 사람 승인 후 완료한다.') + '"><defs><marker id="flow-arrow" viewBox="0 0 8 8" markerWidth="7" markerHeight="7" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#8d9884"/></marker></defs>' + paths + labels + shapes + '</svg><div class="flow-mobile">' + nodes.slice(0,8).map((n, i) => '<div class="flow-mobile-node" data-flow-node="' + n.id + '"><span>0' + (i + 1) + '</span><div><b>' + esc(n.title) + '</b><small>' + n.sub + '</small></div></div>').join('') + '<div class="loop-note">검수 실패 → ' + esc(c.returnLabel) + ' · 최대 2회<br>' + esc(c.stop) + '</div></div><div class="flow-log" role="status"><b id="flow-state-label">READY</b><span id="flow-message">재생하면 자료와 결과가 이동하는 순서를 볼 수 있습니다.</span></div><div class="gate-actions" id="gate-actions" hidden>' + button('승인하고 완료', 'flow-approve', 'check', 'primary small') + button('수정 요청', 'flow-reject', 'undo-2', 'secondary small') + '</div></div>' + flowRationale(c) + '</div>';
  }
  function cancelFlow() { flowToken++; clearTimeout(flowTimer); flowTimer=null; flow=null; }
  function setupFlow(key) { flow = { key, step:-1, order:['input','head','work1','work2','merge','check','human','output'], failures:0, running:false, gate:false, done:false }; }
  function flowMessage(label,message) { if ($('#flow-message')) { $('#flow-state-label').textContent=label; $('#flow-message').textContent=message; window.YFMascot.react('flow',label); } }
  function markNode(id,status='active') { $$('[data-flow-node]').forEach(el=>{if(el.dataset.flowNode===id){el.classList.remove('fail','done','active');el.classList.add(status);}else if(el.classList.contains('active')){el.classList.remove('active');el.classList.add('done');}}); }
  function flowAdvance(auto=false) {
    if (!flow || flow.gate || flow.done) return;
    const c=D.cases[flow.key];
    if (flow.step === 5 && flow.failures === 0) {
      flow.failures=1;flow.step=1;
      $$('[data-flow-node]').forEach(el=>{if(['work1','work2','merge','check'].includes(el.dataset.flowNode))el.classList.remove('active','done','fail');});
    }
    flow.step++;
    const id=flow.order[flow.step];
    if (!id) return;
    markNode(id);
    const messages={input:c.input+'가 들어왔습니다.',head:'Orchestrator가 목적과 입력을 확인하고 작업 순서를 정합니다.',work1:c.workers[0]+'를 수행합니다.',work2:c.workers[1]+' 결과를 모읍니다.',merge:c.merge+' 결과물을 준비합니다.',check:flow.failures?c.repaired:c.missing,human:'사람의 승인 앞에서 멈춥니다. 아래에서 승인 또는 수정을 선택하세요.',output:'검토된 결과를 남겼습니다. 이 화면에서는 외부 작업을 실행하지 않습니다.'};
    flowMessage(id==='check'&&!flow.failures?'NEEDS REVISION':id==='human'?'WAITING FOR YOU':id.toUpperCase(),messages[id]);
    if(id==='check'&&!flow.failures)markNode('check','fail');
    if(id==='human'){flow.gate=true;flow.running=false;$('#gate-actions').hidden=false;setFlowPlay(false);return;}
    if(auto&&flow.running){const token=flowToken;flowTimer=setTimeout(()=>{if(token===flowToken)flowAdvance(true);},id==='check'?1600:750);}
  }
  function setFlowPlay(running) { const el=$('[data-action="flow-play"]');if(el){el.innerHTML=icon(running?'pause':'play')+(running?'일시 정지':'흐름 재생');icons();} }
  function notebook() {
    const openIds=$$('.notebook-lab[open]').map(el=>el.dataset.notebookLab);
    const p=E.progress(state);
    const labOrder = window.YFArtifacts.stages.flatMap(stage => stage.labs).concat(window.YFArtifacts.extras);
    const renderLab = l => '<details class="notebook-lab" data-notebook-lab="' + l.id + '" ' + (openIds.includes(l.id) || (!openIds.length && l.id === 'gap') ? 'open' : '') + '><summary><span class="lab-letter">' + String(labOrder.indexOf(l.id)+1).padStart(2,'0') + '</span><h2>' + esc(l.title) + '</h2><span class="summary-count" data-summary-count="' + l.id + '">' + labCount(l.id) + '</span>' + icon('chevron-down') + '</summary>' + form(l.id,'notebook') + '</details>';
    const groupedLabs = window.YFArtifacts.stages.map(stage => window.YFArtifacts.notebookGroup(stage,renderLab)).join('') + '<section class="artifact-extras"><h2>보완 과제 / 검수·동료 피드백·실행 계획</h2><p>다섯 MD를 만든 뒤 돌아보는 활동입니다. 기록은 전체 MD에 함께 저장됩니다.</p>' + window.YFArtifacts.extras.map(id => renderLab(getLab(id))).join('') + '</section>';
    $('#notebook').innerHTML='<div class="notebook-header"><div><span class="eyebrow">MY WORKSPACE / YUJIN FLOW</span><h1>내 실습노트</h1><p>완료 <b id="notebook-complete">'+p.complete+'</b> / '+D.labs.length+'개 · 질문 <b id="notebook-filled">'+p.filled+'</b> / '+p.total+'개 작성</p></div><div class="notebook-toolbar">'+button('전체 프롬프트 복사','copy-all','copy','secondary')+button('전체 MD 저장','download-all','download','primary')+'</div></div><div class="notebook-list">'+groupedLabs+'</div><div class="notebook-bottom"><p>내 입력은 이 브라우저의 로컬 저장소에만 남습니다.<br>브라우저 데이터 삭제 전에는 MD로 보관하세요.</p><button type="button" class="text-button" data-action="reset-all">'+icon('trash-2')+'내 기록 초기화</button></div>';
    window.YFTimers.refresh();
    icons();
  }
  function setMode(next) {
    mode=next; cancelFlow(); stopExamples(); window.YFOrchestration.stop(); window.YFCLI.stop();
    $('#slide').hidden=next!=='deck';$('#notebook').hidden=next!=='notebook';
    $('#deck-mode').setAttribute('aria-pressed',next==='deck');$('#lab-mode').setAttribute('aria-pressed',next==='notebook');
    $('#notes-toggle').disabled=next!=='deck';$('#speaker-notes').hidden=next!=='deck'||!notesVisible;
    $('#previous').disabled=next!=='deck'||active===0;$('#next').disabled=next!=='deck'||active===D.slides.length-1;
    if(next==='notebook')notebook();else renderSlide(active);
  }
  function go(id, focus=true) {
    const n=D.slides.findIndex(s=>s.id===id); if(n<0)return;
    if(mode!=='deck')setMode('deck');
    renderSlide(n,focus);
    try{history.replaceState(null,'','#/'+id);}catch(_){location.hash='/'+id;}
    saveNavigation();
  }
  function saveNavigation(){if(storageAvailable)try{localStorage.setItem(E.storageKey,JSON.stringify(state));}catch(_){storageAvailable=false;save();}}
  function openExport(){$('#export-preview').value=E.allPrompt(state);$('#export-dialog').showModal();}
  function showIndex(){
    $('#index-list').innerHTML=D.chapters.map(ch=>'<section class="index-chapter"><h3>'+ch.n+' / '+ch.name+' · '+ch.minutes+'분</h3>'+D.slides.map((s,i)=>s.chapter===ch.id?'<button type="button" class="index-item '+(i===active?'current':'')+'" data-action="goto" data-slide="'+s.id+'"><span>'+String(i+1).padStart(2,'0')+'</span><span>'+esc(s.title.replace(/\n/g,' '))+'</span>'+(s.type==='lab'?'<span class="lab-marker">실습</span>':'')+'</button>':'').join('')+'</section>').join('');
    $('#index-dialog').showModal();icons();
  }
  function confirm(title,message,fn){pendingConfirm=fn;$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-action').textContent=title.includes('예시')?'예시로 바꾸기':'초기화';$('#confirm-dialog').showModal();}
  function closeDialogs(){$$('dialog[open]').forEach(d=>d.close());}
  function download(text,name,mime='text/markdown;charset=utf-8'){
    const blob=text instanceof Blob?text:new Blob([text],{type:mime});
    const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
    toast(name+' 파일을 저장합니다.');
  }
  async function zipFiles(files,name){
    if(!window.JSZip){toast('ZIP 도구를 불러오지 못했습니다. MD로 저장해주세요.');return;}
    const zip=new window.JSZip();for(const [path,content]of Object.entries(files))zip.file(path,content);
    download(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),name);
  }
  async function copy(text){
    try{
      if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}
      else{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.top='0';ta.style.left='-9999px';const owner=$('dialog[open]')||document.body;owner.append(ta);ta.focus();ta.select();const ok=document.execCommand('copy');ta.remove();if(!ok)throw new Error('copy');}
      toast('질문과 답변을 함께 복사했습니다.');
    }catch(_){$('#export-preview').value=text;if(!$('#export-dialog').open)$('#export-dialog').showModal();$('#export-preview').focus();$('#export-preview').select();toast('클립보드 접근이 제한되어 내용을 선택했습니다. 직접 복사하거나 MD로 저장하세요.');}
  }
  function fillExample(id){
    const apply=()=>{const l=getLab(id);state.answers[id]={};l.fields.forEach(f=>{state.answers[id][f.id]=f.example||'';});save();if(mode==='notebook')notebook();else renderSlide(active);toast('완성 예시를 넣었습니다. 내 업무에 맞게 바꿔보세요.');};
    if(getLab(id).fields.some(f=>E.answer(state,id,f.id).trim()))confirm('이 실습을 예시로 바꿀까요?','이 실습에 쓴 답변만 예시로 바뀝니다. 다른 실습 기록은 그대로 유지됩니다.',apply);else apply();
  }
  function skillReady(){
    const errors=E.skillErrors(state);
    if(errors.length){toast('Skill 항목을 먼저 완성해주세요: '+errors[0]);go('lab-skill');return false;}
    return true;
  }
  async function action(el){
    const a=el.dataset.action;
    if(a && a.startsWith('personal-')) { await window.YFPersonal.action(a); return; }
    if(a && a.startsWith('artifact-')) { await window.YFArtifacts.action(a,el.dataset.stage); return; }
    if(a && a.startsWith('technique-')) { await window.YFPromptTechniques.action(a,el.dataset.method); return; }
    switch(a){
      case 'deliverables-motion':{const paused=$('#slide').classList.toggle('motion-paused');el.setAttribute('aria-pressed',String(paused));el.setAttribute('aria-label',paused?'흐름 애니메이션 재생':'흐름 애니메이션 일시 정지');el.title=el.getAttribute('aria-label');el.innerHTML=icon(paused?'play':'pause');icons();break;}
      case 'example-prev':moveExample(-1);break;
      case 'example-next':moveExample(1);break;
      case 'example-pause':examplesPaused=!examplesPaused;paintExample();startExamples();break;
      case 'next':go(D.slides[Math.min(active+1,D.slides.length-1)].id);break;
      case 'triage-select':$('#triage-container').innerHTML=window.YFOperations.triage(el.dataset.category);icons();$('#triage-'+el.dataset.category).focus();break;
      case 'goto':closeDialogs();go(el.dataset.slide);break;
      case 'notebook':setMode('notebook');break;
      case 'agent-replay':renderSlide(active);$('.agent-intro-bottom button').focus({preventScroll:true});break;
      case 'taxi-answer':{$('#taxi-purpose-answer').hidden=false;const next=$('.taxi-expand');next.hidden=false;el.setAttribute('aria-expanded','true');el.hidden=true;next.focus({preventScroll:true});break;}
      case 'reveal':{const scene=$('.taxi-scene');if(scene)scene.classList.add('is-revealed');$('.reveal-answer').hidden=false;el.setAttribute('aria-expanded','true');el.disabled=true;break;}
      case 'framework-next':{
        frameworkIndex=(frameworkIndex+1)%5;
        $$('.framework-step').forEach((el,i)=>el.classList.toggle('active',i===frameworkIndex));
        $('#framework-desc').textContent=['Y: 아직 기능을 정하지 않고, 줄일 차이를 적습니다.','U: 일을 겪는 사람과 최종 결과를 연결합니다.','J: 자료가 들어와 결과가 쓰일 때까지 펼칩니다.','I: AI가 할 수 있는 일과 사람이 맡을 일을 나눕니다.','N: Project와 Skill로 등록하고 새 입력으로 검증합니다.'][frameworkIndex];break;}
      case 'copy-lab':await copy(E.labPrompt(el.dataset.labId,state));break;
      case 'download-lab':download(E.labPrompt(el.dataset.labId,state),'YUJIN-FLOW-'+el.dataset.labId+'.md');break;
      case 'fill-example':fillExample(el.dataset.labId);break;
      case 'export-open':openExport();break;
      case 'copy-all':await copy(E.allPrompt(state));break;
      case 'download-all':download(E.allPrompt(state),'YUJIN-FLOW-my-agent.md');break;
      case 'copy-project':await copy(E.projectInstructions(state));break;
      case 'copy-example-project':await copy(E.projectInstructions(state,true));break;
      case 'download-project':download(E.projectInstructions(state),'project-instructions.md');break;
      case 'copy-sample':await copy(E.samples[el.dataset.file]);break;
      case 'download-sample':download(E.samples[el.dataset.file],el.dataset.file,el.dataset.file.endsWith('.csv')?'text/csv;charset=utf-8':'text/markdown;charset=utf-8');break;
      case 'copy-prompt':await copy(E[el.dataset.prompt]);break;
      case 'download-prompt':download('# YUJIN FLOW | '+el.dataset.prompt+'\n\n'+E[el.dataset.prompt]+'\n',el.dataset.prompt+'.md');break;
      case 'sample-kit':await zipFiles(E.samples,'YUJIN-FLOW-classroom-data.zip');break;
      case 'example-skill':await zipFiles(E.skillFiles(state,true),'triage-and-draft-example.zip');break;
      case 'skill-zip':if(skillReady())await zipFiles(E.skillFiles(state),E.answer(state,'skill','name').trim()+'.zip');break;
      case 'download-skill':if(skillReady())download(E.skillMarkdown(state),'SKILL.md');break;
      case 'code-kit':await zipFiles(E.codeKit(),'YUJIN-FLOW-claude-code-starter.zip');break;
      case 'reset-all':confirm('내 기록 초기화','이 브라우저의 YUJIN FLOW 답변을 모두 지웁니다. 필요한 기록은 먼저 MD로 저장하세요.',()=>{state=E.blankState();window.YFTimers.resetAll();storageAvailable=true;save();if(mode==='notebook')notebook();else renderSlide(active);toast('내 실습 기록을 초기화했습니다.');});break;
      case 'timer-toggle':case 'timer-reset':case 'timer-sound':window.YFTimers.action(a,el.dataset.timerId);break;
      case 'flow-play':
        if(!flow)return;
        if(flow.done||flow.gate){toast(flow.gate?'승인 또는 수정 요청을 선택하세요.':'완료된 흐름입니다. 다시 시작 버튼을 눌러보세요.');return;}
        flow.running=!flow.running;clearTimeout(flowTimer);setFlowPlay(flow.running);if(flow.running)flowAdvance(true);break;
      case 'flow-step':if(flow){flow.running=false;clearTimeout(flowTimer);setFlowPlay(false);flowAdvance();}break;
      case 'flow-reset':renderSlide(active);break;
      case 'flow-approve':if(flow&&flow.gate){flow.gate=false;flow.done=true;markNode('output');$('#gate-actions').hidden=true;flowMessage('APPROVED','사람의 승인 후 결과가 확정됩니다. 이 시연에서는 외부 작업을 실행하지 않습니다.');}break;
      case 'flow-reject':if(flow&&flow.gate){$('#gate-actions').hidden=true;flow.gate=false;if(flow.failures>=2){flow.done=true;markNode('stop','fail');flowMessage('STOP','수정 한도를 넘었습니다. 현재 결과와 확인 질문을 사람에게 돌려줍니다.');}else{flow.failures++;flow.step=3;flowMessage('REVISE','요청한 부분만 수정하고 다시 검수합니다.');flow.running=true;setFlowPlay(true);flowAdvance(true);}}break;
      default:if(a&&a.startsWith('cli-'))window.YFCLI.action(a);else if(a&&a.startsWith('mission-'))await missionAction(a,el);
    }
  }
  document.addEventListener('click',async e=>{
    const close=e.target.closest('[data-close]');if(close){close.closest('dialog').close();return;}
    const guide=e.target.closest('[data-guide-step]');if(guide){guideStep=Number(guide.dataset.guideStep);$('#guide-container').innerHTML=guideMarkup(D.slides[active].guide);icons();$('#guide-tab-'+guideStep).focus();return;}
    const chapter=e.target.closest('[data-chapter]');if(chapter){go(D.slides.find(s=>s.chapter===chapter.dataset.chapter).id);return;}
    const el=e.target.closest('[data-action]');if(el){try{await action(el);}catch(err){toast('작업을 완료하지 못했습니다. 기록을 MD로 저장하고 다시 시도해주세요.');console.error(err);}}
  });
  document.addEventListener('input',e=>{
    const el=e.target;if(!el.dataset.lab||!el.dataset.field)return;
    const labId=el.dataset.lab,fieldId=el.dataset.field;
    if(!state.answers[labId])state.answers[labId]={};state.answers[labId][fieldId]=el.value;
    // Keep the deck and notebook copies coherent without rerendering the focused input.
    $$('[data-lab="'+labId+'"][data-field="'+fieldId+'"]').forEach(other=>{if(other!==el)other.value=el.value;});
    save();
    $$('[data-progress="'+labId+'"]').forEach(x=>x.textContent=labCount(labId)+' 입력');
    $$('[data-summary-count="'+labId+'"]').forEach(x=>x.textContent=labCount(labId));
    const p=E.progress(state);if($('#notebook-complete'))$('#notebook-complete').textContent=p.complete;if($('#notebook-filled'))$('#notebook-filled').textContent=p.filled;
    if(labId==='metrics')$$('[data-metric-live]').forEach(x=>x.outerHTML=metricInline());
    refreshPromptPreviews();
  });
  $('#next').addEventListener('click',()=>go(D.slides[Math.min(active+1,D.slides.length-1)].id));
  $('#previous').addEventListener('click',()=>go(D.slides[Math.max(active-1,0)].id));
  $('#deck-mode').addEventListener('click',()=>setMode('deck'));
  $('#lab-mode').addEventListener('click',()=>setMode('notebook'));
  $('#index-open').addEventListener('click',showIndex);
  $('#chapter-label').addEventListener('click',showIndex);
  $('#export-open').addEventListener('click',openExport);
  $('#help-open').addEventListener('click',()=>{if(state.slide!=='troubleshooting')helpOrigin=state.slide;go('troubleshooting');});
  $('#confirm-action').addEventListener('click',()=>{$('#confirm-dialog').close();if(pendingConfirm){const fn=pendingConfirm;pendingConfirm=null;fn();}});
  $('#notes-toggle').addEventListener('click',()=>{notesVisible=!notesVisible;$('#speaker-notes').hidden=!notesVisible;$('#notes-toggle').setAttribute('aria-pressed',notesVisible);});
  $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){toast('이 브라우저에서는 전체 화면을 지원하지 않습니다.');}});
  document.addEventListener('keydown',e=>{
    if($('dialog[open]'))return;
    if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(e.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      const tabs=$$('[role="tab"]',e.target.closest('[role="tablist"]'));
      const index=tabs.indexOf(e.target);
      const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      e.preventDefault();tabs[next].click();
      const selected=$('[role="tab"][aria-selected="true"]');if(selected)selected.focus();
      return;
    }
    if(e.key==='g'||e.key==='G'){e.preventDefault();showIndex();return;}
    if(mode!=='deck')return;
    if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();go(D.slides[Math.min(active+1,D.slides.length-1)].id);}
    if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();go(D.slides[Math.max(active-1,0)].id);}
    if(e.key==='Home'){e.preventDefault();go(D.slides[0].id);}
    if(e.key==='End'){e.preventDefault();go(D.slides[D.slides.length-1].id);}
  });
  window.addEventListener('hashchange',()=>{const id=location.hash.replace(/^#\/?/,'');const found=D.slides.findIndex(s=>s.id===id);if(found>=0){if(mode!=='deck')setMode('deck');renderSlide(found);}});
  window.addEventListener('storage',event=>{
    if(event.key!==E.storageKey||!event.newValue)return;
    try{const next=E.sanitizeState(JSON.parse(event.newValue));state=next;$$('[data-lab][data-field]').forEach(el=>el.value=E.answer(state,el.dataset.lab,el.dataset.field));refreshPromptPreviews();$('#lab-count').textContent=E.progress(state).complete;toast('같은 브라우저의 다른 탭에서 수정한 기록을 반영했습니다.');}catch(_){}
  });
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  $('#chapters').innerHTML=D.chapters.map(c=>'<button type="button" class="chapter-button" data-chapter="'+c.id+'" title="'+c.name+'" aria-label="'+c.n+' '+c.name+'" aria-current="false">'+c.n+'</button>').join('');
  const target=location.hash.replace(/^#\/?/,'')||state.slide;
  active=Math.max(0,D.slides.findIndex(s=>s.id===target));
  window.YFApp={getState:()=>state,save,toast,download,zipFiles,copy,go,icons,form,esc,button,icon};
  renderSlide(active);$('#lab-count').textContent=E.progress(state).complete;
  if(!storageAvailable){$('#save-status').classList.add('error');$('#save-status').innerHTML=icon('triangle-alert')+'<span>저장소 사용 불가 · MD로 보관</span>';toast('브라우저 저장소를 사용할 수 없습니다. 이 창의 기록은 MD로 저장해주세요.');icons();}

  // Mission checks run locally without model requests.
  function missionBrief(){return '<p class="caption">QA 리허설 · CS 샘플 데이터로 연습하지만, 내 Agent 결과에도 같은 질문을 적용합니다. 재실행은 아래 CS 예시 Skill을 사용하세요.</p><div class="button-row">'+button('CS 예시 Skill ZIP','example-skill','download','secondary')+'</div>' + (window.YFMission?window.YFMission.brief(button,icon):'');}
  function missionMarkup(){return window.YFMission?window.YFMission.markup(button,icon,form):'';}
  function setupMission(){if(window.YFMission)window.YFMission.setup();}
  async function missionAction(a,el){if(window.YFMission)await window.YFMission.action(a,el);}
})();
