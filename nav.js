/* ============================================================================
   SHARED LAB CHROME — the nav between labs and the light/dark toggle.

   Injected rather than copied into each lab, because both are identical
   everywhere and a nav duplicated across four files is the same maintenance cost
   as duplicated CSS, just smaller. One source, one place to add the next lab.

   Loaded by every lab with `<script src="nav.js"></script>`. It works from
   `file://` and from GitHub Pages: the labs are static and the paths are
   relative, so there is no build step and no server.
   ============================================================================ */

(function () {
  'use strict';

  // The nav's own CSS ships with the nav. A lab that links nothing but `nav.js`
  // still gets a working bar, and there is one place to change it. The token
  // references all carry a fallback, so the nav does not break in a file that
  // forgot `tokens.css` either.
  var STYLE = [
    '.labnav { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; flex-wrap: wrap;',
    '  gap: var(--space-2, 8px); padding: var(--space-4, 16px) var(--space-5, 20px);',
    '  background: var(--bg-raised, #fff); border-bottom: 1px solid var(--border-default, #E4E4E7); }',
    '.labnav-brand { margin-right: var(--space-4, 16px); white-space: nowrap;',
    '  font-size: var(--type-caption-size, 12px); letter-spacing: var(--type-caption-track, .04em);',
    '  text-transform: uppercase; color: var(--text-muted, #71717A); }',
    '.labnav a { padding: var(--space-2, 8px) var(--space-3, 12px); border: 1px solid transparent;',
    '  border-radius: var(--radius-sm, 6px); text-decoration: none;',
    '  font-size: var(--type-subhead-size, 15px); color: var(--text-secondary, #52525B); }',
    '.labnav a:hover { background: var(--surface-2, #F4F4F5); color: var(--text-primary, #18181B); }',
    '.labnav a[aria-current="page"] { background: var(--accent-subtle, #F0FDFA);',
    '  border-color: var(--accent-default, #0F766E); color: var(--accent-text, #0F766E); }',
    '.labnav .grow { flex: 1; }',
    '.labnav .toggle { height: var(--control-sm, 32px); padding: 0 var(--space-4, 16px);',
    '  border: 1px solid var(--border-default, #E4E4E7); border-radius: var(--radius-md, 8px);',
    '  background: var(--surface-1, #fff); color: var(--text-secondary, #52525B); font: inherit;',
    '  font-size: var(--type-subhead-size, 15px); cursor: pointer; }'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  var LABS = [
    { file: 'index.html',           name: 'Index' },
    { file: 'palette-lab.html',     name: 'Palette' },
    { file: 'onboarding-lab.html',  name: 'Onboarding' },
    { file: 'calendar-lab.html',    name: 'Calendar' },
    { file: 'habits-lab.html',      name: 'Habits' }
  ];

  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  var nav = document.createElement('nav');
  nav.className = 'labnav';
  nav.setAttribute('aria-label', 'Design labs');

  var html = '<span class="labnav-brand">Small Wins — design</span>';
  LABS.forEach(function (lab) {
    var current = lab.file.toLowerCase() === here;
    html += '<a href="' + lab.file + '"' +
            (current ? ' aria-current="page"' : '') + '>' + lab.name + '</a>';
  });
  // A lab whose own controls ARE the subject — the palette lab, where light/dark
  // is the experiment rather than a viewing preference — opts out with
  // `<body data-lab-toggle="off">`. Two things writing `data-mode` is one too many.
  var wantsToggle = document.body.dataset.labToggle !== 'off';
  html += '<span class="grow"></span>' +
          (wantsToggle ? '<button class="toggle" type="button" id="labnav-mode">Dark</button>' : '');
  nav.innerHTML = html;

  document.body.insertBefore(nav, document.body.firstChild);

  // Full-bleed out of whatever padding this page's body happens to carry. Read
  // rather than assumed: the labs do not all pad their body the same way, and a
  // hard-coded negative margin that is wrong by 32px is a horizontal scrollbar.
  var cs = getComputedStyle(document.body);
  nav.style.marginTop = '-' + cs.paddingTop;
  nav.style.marginRight = '-' + cs.paddingRight;
  nav.style.marginLeft = '-' + cs.paddingLeft;
  nav.style.marginBottom = 'var(--space-7, 24px)';

  // Publish the bar's height, because anything else that pins itself to the top of
  // the viewport has to pin itself *below* this. Two sticky elements both at
  // `top: 0` is not "stacked chrome" — it is one bar silently hidden behind
  // another, and which one disappears depends on a z-index nobody chose on purpose.
  function publishHeight() {
    document.documentElement.style.setProperty('--labnav-h', nav.offsetHeight + 'px');
  }
  publishHeight();
  window.addEventListener('resize', publishHeight);

  // The toggle. Every lab ships `light` + `warm` and switches to `dark` + `cool`,
  // which is the pairing the token set decided on: warm paper for light, cool ink
  // for dark. Dark and light are not a matched pair and are not meant to be.
  var btn = nav.querySelector('#labnav-mode');
  if (!btn) return;

  function label() {
    btn.textContent = document.documentElement.dataset.mode === 'dark' ? 'Light' : 'Dark';
  }
  btn.addEventListener('click', function () {
    var dark = document.documentElement.dataset.mode === 'dark';
    document.documentElement.dataset.mode = dark ? 'light' : 'dark';
    document.documentElement.dataset.palette = dark ? 'warm' : 'cool';
    label();
    // Some labs redraw things (a contrast table, a measurement readout) from the
    // live token values, so they get told the mode changed.
    window.dispatchEvent(new CustomEvent('labmodechange'));
  });
  label();
})();
