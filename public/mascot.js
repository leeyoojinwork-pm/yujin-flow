(function () {
  'use strict';
  const icon = name => '<i data-lucide="' + name + '" aria-hidden="true"></i>';
  function sprite() {
    return '<div class="pixel-bot" aria-hidden="true">' + ['body', 'arm-left', 'arm-right', 'leg-one', 'leg-two', 'leg-three', 'leg-four', 'eye-left', 'eye-right'].map(part => '<span class="pixel-part pixel-' + part + '"></span>').join('') + '</div>';
  }
  function scene(kind) {
    const particles = kind === 'assemble' ? [['target', '목표'], ['wrench', '도구'], ['git-branch', '판단'], ['file-check-2', '검수']] : [['file-text', 'SKILL.md']];
    return '<div class="mascot-scene mascot-' + kind + ' mascot-playing" data-mascot="' + kind + '"><div class="mascot-stage" aria-hidden="true">' + particles.map(([symbol, label], i) => '<span class="mascot-token token-' + i + '">' + icon(symbol) + '<small>' + label + '</small></span>').join('') + sprite() + '<span class="mascot-baseline"></span></div><button type="button" class="icon-button mascot-replay" data-mascot-replay title="캐릭터 모션 다시 보기" aria-label="캐릭터 모션 다시 보기">' + icon('rotate-ccw') + '</button></div>';
  }
  function inline(kind) {
    return '<div class="mascot-inline mascot-reacting" data-mascot="' + kind + '" data-state="ready" aria-hidden="true">' + sprite() + '</div>';
  }
  function mount(slide) {
    const root = document.querySelector('#slide');
    if (slide.type === 'agent-intro') {
      const display = root.querySelector('.agent-intro-display');
      const hero = document.createElement('div'); hero.className = 'agent-intro-hero';
      display.before(hero); hero.append(display); hero.insertAdjacentHTML('beforeend', scene('assemble'));
    }
    if (slide.id === 'onboarding') {
      const lead = root.querySelector('.leadline');
      const row = document.createElement('div'); row.className = 'mascot-onboarding';
      lead.before(row); row.innerHTML = inline('welcome'); row.append(lead);
      row.querySelector('[data-mascot]').dataset.state = 'greet';
    }
    if (slide.id === 'skill-structure') {
      const tree = root.querySelector('.filetree');
      const header = document.createElement('div'); header.className = 'mascot-skill-header';
      header.innerHTML = scene('read'); tree.prepend(header);
    }
    if (slide.type === 'flow') {
      root.querySelector('.flow-log').insertAdjacentHTML('afterbegin', inline('flow'));
    }
    if (slide.type === 'code-run') {
      root.querySelector('.cli-state').classList.add('has-mascot');
      root.querySelector('.cli-state').insertAdjacentHTML('afterbegin', inline('cli'));
    }
  }
  function react(kind, cue) {
    const el = document.querySelector('#slide [data-mascot="' + kind + '"]');
    if (!el || el.dataset.cue === cue) return;
    el.dataset.cue = cue;
    el.dataset.state = /APPROVED|PASS|검수 통과/.test(cue) ? 'done' : /NEEDS|STOP|수정 필요/.test(cue) ? 'oops' : /WAITING|승인 대기/.test(cue) ? 'wait' : /READY|실행 준비/.test(cue) ? 'ready' : 'work';
    el.classList.remove('mascot-reacting'); void el.offsetWidth; el.classList.add('mascot-reacting');
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-mascot-replay]');
    if (!button) return;
    const scene = button.closest('[data-mascot]');
    scene.classList.remove('mascot-playing'); void scene.offsetWidth; scene.classList.add('mascot-playing');
  });
  window.YFMascot = { mount, react };
})();
