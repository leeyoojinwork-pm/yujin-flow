(function () {
  'use strict';
  const timers = new Map();
  let scheduled = null;
  let soundEnabled = false, audio = null;
  const soundKey = 'yujin-flow-timer-sound';
  const app = () => window.YFApp;
  try { soundEnabled = localStorage.getItem(soundKey) === 'on'; } catch (_) { soundEnabled = false; }
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
    return '<div class="lab-timer" data-timer="' + app().esc(id) + '" role="group" aria-label="' + app().esc(timer.title) + ' 타이머"><button type="button" class="timer-toggle" data-action="timer-toggle" data-timer-id="' + app().esc(id) + '"><span data-timer-icon aria-hidden="true"></span><span data-timer-value></span></button><button type="button" class="timer-sound" data-action="timer-sound" data-timer-id="' + app().esc(id) + '" title="타이머 사운드 켜기" aria-label="타이머 사운드 켜기" aria-pressed="false">' + app().icon('volume-2') + '</button><button type="button" class="timer-reset" data-action="timer-reset" data-timer-id="' + app().esc(id) + '" title="' + timer.minutes + '분으로 초기화" aria-label="' + timer.minutes + '분으로 초기화">' + app().icon('rotate-ccw') + '</button></div>';
  }
  function saveSound() {
    try { localStorage.setItem(soundKey, soundEnabled ? 'on' : 'off'); } catch (_) {}
  }
  function tone(ctx, start, frequency, duration, gain = 0.035) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
  function playSound(kind) {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audio = audio || new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const notes = kind === 'finish' ? [523, 659, 784, 1046, 784] : [659, 784, 988, 784];
    const now = audio.currentTime + 0.03;
    notes.forEach((frequency, i) => tone(audio, now + i * 0.105, frequency, 0.085, kind === 'finish' ? 0.045 : 0.032));
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
      const sound = el.querySelector('.timer-sound');
      if (sound) {
        const label = soundEnabled ? '타이머 사운드 끄기' : '타이머 사운드 켜기';
        sound.title = label;
        sound.setAttribute('aria-label', label);
        sound.setAttribute('aria-pressed', String(soundEnabled));
        if (el.dataset.sound !== String(soundEnabled)) {
          el.dataset.sound = String(soundEnabled);
          sound.innerHTML = app().icon(soundEnabled ? 'volume-2' : 'volume-x');
          changedIcons = true;
        }
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
    if (finished.length) {
      playSound('finish');
      app().toast('시간 종료: ' + finished.join(' / ') + ' 기록은 계속 작성할 수 있어요.');
    }
    if ([...timers.values()].some(timer => timer.phase === 'running')) scheduled = setTimeout(refresh, 250);
  }
  function action(name, id) {
    const timer = get(id);
    if (name === 'timer-sound') {
      soundEnabled = !soundEnabled;
      saveSound();
      if (soundEnabled) playSound('start');
      render();
      return;
    }
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
        playSound('start');
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
