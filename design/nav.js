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
    '.labnav { position: sticky; top: 0; z-index: 30; display: flex; align-items: center;',
    '  gap: var(--space-3, 12px); padding: var(--space-3, 12px) var(--space-5, 20px);',
    '  background: var(--bg-raised, #fff); border-bottom: 1px solid var(--border-default, #E4E4E7); }',
    '.labnav-brand { flex: none; white-space: nowrap; padding-right: var(--space-4, 16px);',
    '  border-right: 1px solid var(--border-subtle, #E4E4E7);',
    '  font-size: var(--type-caption-size, 12px); letter-spacing: var(--type-caption-track, .04em);',
    '  text-transform: uppercase; color: var(--text-muted, #71717A); }',
    // The row scrolls rather than wraps. With eighteen labs a wrapping bar is two
    // lines on a laptop and four on a phone, and the height changes per page — so
    // every lab's own sticky tab strip sits at a different offset. A fixed-height
    // bar is what makes `--labnav-h` worth publishing at all.
    '.labnav-scroll { flex: 1; min-width: 0; display: flex; align-items: center;',
    '  gap: var(--space-1, 4px); overflow-x: auto; overscroll-behavior-x: contain;',
    '  scroll-padding-inline: var(--space-4, 16px); scrollbar-width: thin;',
    '  scrollbar-color: var(--border-default, #E4E4E7) transparent; padding-bottom: 2px; }',
    // No edge fade, and it was tried: a gradient mask over the row dims whatever
    // is at the edge, and the thing most often at the edge is the current lab,
    // because the strip is scrolled to it. Fading the label the reader most needs
    // to read is worse than the hard clip it fixes. The brand's divider and the
    // thin scrollbar are what make a clipped neighbour legible as a clip.
    '.labnav-scroll::-webkit-scrollbar { height: 4px; }',
    '.labnav-scroll::-webkit-scrollbar-thumb { background: var(--border-default, #E4E4E7); border-radius: 99px; }',
    '.labnav-scroll::-webkit-scrollbar-thumb:hover { background: var(--border-strong, #D4D4D8); }',
    '.labnav-scroll::-webkit-scrollbar-track { background: transparent; }',
    '.labnav a { flex: none; padding: var(--space-2, 8px) var(--space-3, 12px);',
    '  border: 1px solid transparent; border-radius: var(--radius-sm, 6px);',
    '  text-decoration: none; white-space: nowrap;',
    '  font-size: var(--type-subhead-size, 15px); color: var(--text-secondary, #52525B); }',
    '.labnav a:hover { background: var(--surface-2, #F4F4F5); color: var(--text-primary, #18181B); }',
    '.labnav a[aria-current="page"] { background: var(--accent-subtle, #F0FDFA);',
    '  border-color: var(--accent-default, #0F766E); color: var(--accent-text, #0F766E); }',
    // Six labelled sets rather than eighteen peers. The label doubles as the
    // divider, so a group costs one rule and no extra markup.
    '.labnav-group { flex: none; margin-left: var(--space-3, 12px);',
    '  padding-left: var(--space-4, 16px); border-left: 1px solid var(--border-subtle, #E4E4E7);',
    '  font-size: 10px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600;',
    '  color: var(--text-muted, #71717A); }',
    '.labnav-group:first-child { margin-left: 0; padding-left: var(--space-2, 8px); border-left: 0; }',
    '.labnav .toggle { flex: none; height: var(--control-sm, 32px); padding: 0 var(--space-4, 16px);',
    '  border: 1px solid var(--border-default, #E4E4E7); border-radius: var(--radius-md, 8px);',
    '  background: var(--surface-1, #fff); color: var(--text-secondary, #52525B); font: inherit;',
    '  font-size: var(--type-subhead-size, 15px); cursor: pointer; }',
    '@media (max-width: 900px) { .labnav-brand { display: none; } }',
    '@media (max-width: 640px) { .labnav-group { display: none; } }'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  // Grouped the way the doc set is — foundations, then modules, then the flows,
  // then the two labs that are cross-cutting. Order is the reading order of
  // `docs/README.md`, so the nav and the spec agree about what belongs with what.
  var LABS = [
    { group: 'Board',      name: 'Index',         file: 'index.html' },
    { group: 'Foundation', name: 'Palette',       file: 'palette-lab.html' },
    { group: 'Foundation', name: 'Onboarding',    file: 'onboarding-lab.html' },
    { group: 'Modules',    name: 'Calendar',      file: 'calendar-lab.html' },
    { group: 'Modules',    name: 'Habits',        file: 'habits-lab.html' },
    { group: 'Modules',    name: 'Notes',         file: 'notes-lab.html' },
    { group: 'Modules',    name: 'Protocols',     file: 'protocols-lab.html' },
    { group: 'Modules',    name: 'People',        file: 'people-lab.html' },
    { group: 'Modules',    name: 'Review',        file: 'review-lab.html' },
    { group: 'Modules',    name: 'Areas & Goals', file: 'areas-lab.html' },
    { group: 'Modules',    name: 'Settings',      file: 'settings-lab.html' },
    { group: 'Flows',      name: 'Capture',       file: 'capture-lab.html' },
    { group: 'Flows',      name: 'Retrieval',     file: 'retrieval-lab.html' },
    { group: 'Flows',      name: 'Morning plan',  file: 'morning-plan-lab.html' },
    { group: 'Flows',      name: 'Lapse',         file: 'lapsed-lab.html' },
    { group: 'Flows',      name: 'Disruption',    file: 'disruption-lab.html' },
    { group: 'AI',         name: 'AI tiers',      file: 'tiers-lab.html' },
    { group: 'System',     name: 'System states', file: 'system-lab.html' }
  ];

  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  var nav = document.createElement('nav');
  nav.className = 'labnav';
  nav.setAttribute('aria-label', 'Design labs');

  var html = '<span class="labnav-brand">Small Wins — design</span>' +
             '<div class="labnav-scroll" id="labnav-scroll">';
  var group = '';
  LABS.forEach(function (lab) {
    if (lab.group !== group) {
      html += '<span class="labnav-group">' + lab.group + '</span>';
      group = lab.group;
    }
    var current = lab.file.toLowerCase() === here;
    html += '<a href="' + lab.file + '"' +
            (current ? ' aria-current="page"' : '') + '>' + lab.name + '</a>';
  });
  html += '</div>';
  // A lab whose own controls ARE the subject — the palette lab, where light/dark
  // is the experiment rather than a viewing preference — opts out with
  // `<body data-lab-toggle="off">`. Two things writing `data-mode` is one too many.
  var wantsToggle = document.body.dataset.labToggle !== 'off';
  if (wantsToggle) {
    html += '<button class="toggle" type="button" id="labnav-mode">Dark</button>';
  }
  nav.innerHTML = html;

  document.body.insertBefore(nav, document.body.firstChild);

  // Eighteen links do not fit, so the row scrolls — which means the current lab
  // can load off the right edge, past a group label the reader has no reason to
  // scroll to. Centre it. Done by writing `scrollLeft` rather than calling
  // `scrollIntoView`, because that method can scroll the *page* to bring a link
  // into view, and the page is already where the reader wants it.
  //
  // The offset is taken from bounding rects, not `offsetLeft`: the scroll box is
  // `static`, so its children's `offsetParent` is the sticky `.labnav`, and an
  // `offsetLeft` difference includes the brand and the nav's own padding. That
  // shortened the scroll by ~500px and left the current lab off screen.
  var box = nav.querySelector('#labnav-scroll');
  var currentLink = nav.querySelector('a[aria-current="page"]');
  if (box && currentLink && box.scrollWidth > box.clientWidth) {
    var b = box.getBoundingClientRect();
    var c = currentLink.getBoundingClientRect();
    box.scrollLeft += (c.left - b.left) - Math.max(0, (b.width - c.width) / 2);
  }

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
    var dark = document.documentElement.dataset.mode === 'dark';
    btn.textContent = dark ? 'Light' : 'Dark';
    // "Dark" says what the button will do and nothing about what is on screen.
    // The accessible name states the action rather than the target.
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = btn.getAttribute('aria-label');
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
