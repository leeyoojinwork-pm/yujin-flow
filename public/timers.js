(function () {
  'use strict';
  const timers = new Map();
  let scheduled = null;
  const app = () => window.YFApp;
  function get(id) {
    const lab = window.YF.labs.find(item => item.id === id);
    if (!lab) return null;
    if (!timers.has(id)) timers.set(id, { id, minutes: lab.minutes, title: lab.title, remaining: lab.minutes * 60000, deadline: 0, phase: 'idle' });
    return timers.get(id);
  }
  function clock(timer) {
    const seconds = Math.max(0, Math.ceil(timer.remaining / 1000));
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function markup(id) {
    const timer = get(id);
    if (!timer) return '';
    return '<div class="lab-timer" data-timer="' + app().esc(id) + '" role="group" aria-label="' + app().esc(timer.title) + ' 타이머"><button type="button" class="timer-toggle" data-action="timer-toggle" data-timer-id="' + app().esc(id) + '"><span data-timer-icon aria-hidden="true"></span><span data-timer-value></span></button><button type="button" class="timer-reset" data-action="timer-reset" data-timer-id="' + app().esc(id) + '" title="' + timer.minutes + '분으로 초기화" aria-label="' + timer.minutes + '분으로 초기화">' + app().icon('rotate-ccw') + '</button></div>';
  }
  function render() {
    let changedIcons = false;
    document.querySelectorAll('[data-timer]').forEach(el => {
      const timer = get(el.dataset.timer);
      if (!timer) return;
      const running = timer.phase === 'running';
      const value = timer.phase === 'idle' ? timer.minutes + '분' : clock(timer);
      const toggle = el.querySelector('.timer-toggle');
      const label = timer.phase === 'idle' ? timer.minutes + '분 타이머 시작' : running ? '타이머 일시정지' : timer.phase === 'complete' ? '시간 종료 · ' + timer.minutes + '분 다시 시작' : '타이머 계속';
      el.dataset.urgent = String(timer.phase !== 'idle' && timer.remaining <= 60000);
      el.querySelector('[data-timer-value]').textContent = value;
      if (el.dataset.phase !== timer.phase) {
        el.dataset.phase = timer.phase;
        toggle.title = label;
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('aria-pressed', String(running));
        el.querySelector('[data-timer-icon]').innerHTML = app().icon(running ? 'pause' : timer.phase === 'idle' ? 'clock-3' : timer.phase === 'complete' ? 'bell-ring' : 'play');
        el.querySelector('.timer-reset').disabled = timer.phase === 'idle';
        changedIcons = true;
      }
    });
    if (changedIcons) app().icons();
  }
  function refresh() {
    clearTimeout(scheduled);
    scheduled = null;
    const finished = [];
    const now = Date.now();
    // Use elapsed wall time so background tabs do not slow the countdown.
    timers.forEach(timer => {
      if (timer.phase !== 'running') return;
      timer.remaining = Math.max(0, timer.deadline - now);
      if (!timer.remaining) {
        timer.phase = 'complete';
        timer.deadline = 0;
        finished.push(timer.title);
      }
    });
    render();
    if (finished.length) app().toast('시간 종료: ' + finished.join(' / ') + ' 기록은 계속 작성할 수 있어요.');
    if ([...timers.values()].some(timer => timer.phase === 'running')) scheduled = setTimeout(refresh, 250);
  }
  function action(name, id) {
    const timer = get(id);
    if (!timer) return;
    if (name === 'timer-reset') {
      timer.remaining = timer.minutes * 60000;
      timer.phase = 'idle';
      timer.deadline = 0;
    } else if (name === 'timer-toggle') {
      if (timer.phase === 'running') {
        timer.remaining = Math.max(0, timer.deadline - Date.now());
        timer.phase = timer.remaining ? 'paused' : 'complete';
        timer.deadline = 0;
      } else {
        if (!timer.remaining) timer.remaining = timer.minutes * 60000;
        timer.deadline = Date.now() + timer.remaining;
        timer.phase = 'running';
      }
    }
    refresh();
  }
  function resetAll() {
    clearTimeout(scheduled);
    scheduled = null;
    timers.clear();
    render();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && app()) refresh(); });
  window.addEventListener('pagehide', () => { clearTimeout(scheduled); scheduled = null; });
  window.addEventListener('pageshow', () => { if (app()) refresh(); });
  window.YFTimers = { markup, refresh, action, resetAll, getState: id => { const timer = get(id); return timer ? { ...timer } : null; } };
})();
