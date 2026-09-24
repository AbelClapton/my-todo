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
    // This bar owns the top of the stack, and the numbers are high on purpose.
    //
    // The panels below are *descendants* of this element, so they are painted inside
    // this bar's stacking context: their own z-index only orders them against each
    // other, and against the page their effective value is this one. A lab that pins
    // its own chrome with `position: sticky; z-index: 100` — which the palette lab did,
    // for a header it means to sit *under* this bar, since it pins at
    // `top: var(--labnav-h)` — therefore painted over the notes panel. Its header is
    // 2 now, which is all it ever needed to beat the page content it scrolls across.
    //
    // The contract: a lab's pinned chrome goes below this. Nothing in a lab should
    // need a value anywhere near 500.
    '.labnav { position: sticky; top: 0; z-index: 500; display: flex; align-items: center;',
    '  gap: var(--space-3, 12px); padding: var(--space-3, 12px) var(--space-5, 20px);',
    '  background: var(--bg-raised, #fff); border-bottom: 1px solid var(--border-default, #E4E4E7); }',
    '.labnav-brand { flex: none; white-space: nowrap; padding-right: var(--space-4, 16px);',
    '  border-right: 1px solid var(--border-subtle, #E4E4E7);',
    '  font-size: var(--type-caption-size, 12px); letter-spacing: var(--type-caption-track, .04em);',
    '  text-transform: uppercase; color: var(--text-muted, #71717A); }',
    '.labnav-grow { flex: 1; }',
    // Buttons share one rule: the bar has six of them and they should be one object.
    '.nbtn, .nstep, .toggle, .nchk { flex: none; height: var(--control-sm, 32px);',
    '  display: inline-flex; align-items: center; gap: 6px; padding: 0 var(--space-3, 12px);',
    '  border: 1px solid var(--border-default, #E4E4E7); border-radius: var(--radius-md, 8px);',
    '  background: var(--surface-1, #fff); color: var(--text-secondary, #52525B); font: inherit;',
    '  font-size: var(--type-subhead-size, 15px); cursor: pointer; text-decoration: none;',
    '  white-space: nowrap; box-sizing: border-box; }',
    '.nbtn:hover, .nstep:hover, .toggle:hover, .nchk:hover { background: var(--surface-2, #F4F4F5);',
    '  color: var(--text-primary, #18181B); }',
    '.nbtn[aria-expanded=\"true\"] { background: var(--accent-subtle, #F0FDFA);',
    '  border-color: var(--accent-default, #0F766E); color: var(--accent-text, #0F766E); }',
    '.nchk.on { border-color: var(--success-text, #15803D); color: var(--success-text, #15803D);',
    '  background: var(--success-subtle, #F0FDF4); }',
    '.nchk input { margin: 0; accent-color: var(--accent-default, #0F766E); }',
    '.nstep { min-width: 26px; padding: 0 var(--space-2, 8px); font-size: 18px; line-height: 1;',
    '  justify-content: center; }',
    '.nstep.is-off { color: var(--text-disabled, #A1A1AA); cursor: default; }',
    '.nstep.is-off:hover { background: var(--surface-1, #fff); color: var(--text-disabled, #A1A1AA); }',
    // The stepper is the one part of the bar allowed to give way. Everything else is
    // a fixed control; a fixed row of them with no rule for what shrinks is how a bar
    // ends up 47px wider than a phone and puts a scrollbar on the page.
    '.navstep { display: inline-flex; align-items: center; gap: var(--space-1, 4px);',
    '  flex: 0 1 auto; min-width: 0; }',
    '.navtitle { min-width: 0; overflow: hidden; text-overflow: ellipsis; text-align: center;',
    '  white-space: nowrap; font-size: var(--type-subhead-size, 15px);',
    '  color: var(--text-primary, #18181B); }',
    '.navtitle .pos { margin-left: 6px; font-size: var(--type-caption-size, 12px);',
    '  color: var(--text-muted, #71717A); font-variant-numeric: tabular-nums; }',
    '.nbtn .dot { width: 6px; height: 6px; border-radius: 99px;',
    '  background: var(--accent-default, #0F766E); }',
    // Panels. `top: calc(100% + 6px)` needs no measuring, because the nav is sticky
    // and therefore already the containing block.
    '.navpop { position: absolute; top: calc(100% + 6px); z-index: 510;',
    '  background: var(--bg-raised, #fff); border: 1px solid var(--border-default, #E4E4E7);',
    '  border-radius: var(--radius-lg, 12px); padding: var(--space-4, 16px);',
    '  box-shadow: 0 14px 36px -10px rgba(0,0,0,.24), 0 2px 6px -2px rgba(0,0,0,.10); }',
    '.navpop[hidden] { display: none; }',
    '.phead { display: flex; align-items: center; gap: var(--space-3, 12px);',
    '  margin-bottom: var(--space-3, 12px); }',
    '.phead strong { font-size: var(--type-subhead-size, 15px); color: var(--text-primary, #18181B); }',
    '.phead .sub { font-size: var(--type-caption-size, 12px); color: var(--text-muted, #71717A); }',
    '.phead .grow, .pfoot .grow { flex: 1; }',
    '.plink { background: none; border: 0; padding: 0; font: inherit; cursor: pointer;',
    '  font-size: var(--type-caption-size, 12px); color: var(--text-secondary, #52525B);',
    '  text-decoration: underline; }',
    '.plink:hover { color: var(--text-primary, #18181B); }',
    '.pdanger { color: var(--warning-text, #B45309); }',
    // The menu. Six groups, three columns at a wide window.
    // Multi-column rather than a grid: the six groups hold 1, 2, 8, 5, 1 and 1 items,
    // and a grid aligns cells by *row*, so the tallest group sets the row's height and
    // the sparse ones leave a column of dead space. Multi-column balances by content
    // height, which is the thing that is actually uneven.
    '.p-menu { width: min(940px, calc(100vw - 32px)); max-height: min(78vh, 660px); overflow: auto; }',
    '.p-menu .cols { column-count: 1; column-gap: var(--space-7, 24px); }',
    '@media (min-width: 700px) { .p-menu .cols { column-count: 2; } }',
    '@media (min-width: 1060px) { .p-menu .cols { column-count: 3; } }',
    '.p-menu .grp { break-inside: avoid; -webkit-column-break-inside: avoid;',
    '  margin: 0 0 var(--space-4, 16px); }',
    '.p-menu .grp:last-child { margin-bottom: 0; }',
    '.p-menu .glab { margin: 0 0 4px; font-size: 10px; letter-spacing: .08em;',
    '  text-transform: uppercase; font-weight: 600; color: var(--text-muted, #71717A); }',
    '.p-menu a { display: flex; align-items: center; gap: 6px; padding: 5px 8px;',
    '  border-radius: var(--radius-sm, 6px); text-decoration: none;',
    '  font-size: var(--type-subhead-size, 15px); color: var(--text-secondary, #52525B); }',
    '.p-menu a:hover { background: var(--surface-2, #F4F4F5); color: var(--text-primary, #18181B); }',
    '.p-menu a[aria-current=\"page\"] { background: var(--accent-subtle, #F0FDFA);',
    '  color: var(--accent-text, #0F766E); font-weight: 600; }',
    '.p-menu .tick { width: 12px; color: var(--success-text, #15803D); font-size: 12px; }',
    '.p-menu .n { margin-left: auto; font-size: 11px; color: var(--text-muted, #71717A);',
    '  font-variant-numeric: tabular-nums; }',
    // The menu carries the export commands as well as the views, so the bar can drop
    // its Export button on a narrow window without losing the feature. A command in
    // both a menu and a toolbar button is not duplication — it is the menu being
    // complete, which is what a menu is for.
    '.p-menu .mfoot { display: flex; flex-wrap: wrap; gap: var(--space-2, 8px);',
    '  margin-top: var(--space-4, 16px); padding-top: var(--space-4, 16px);',
    '  border-top: 1px solid var(--border-subtle, #E4E4E7); }',
    '.p-menu .mfoot .mlab { width: 100%; margin-bottom: 2px; font-size: 10px; letter-spacing: .08em;',
    '  text-transform: uppercase; font-weight: 600; color: var(--text-muted, #71717A); }',
    // The same buttons as the dropdown, so they need the same sub-label treatment:
    // without this the `<small>` runs inline and the two labels read as one string.
    '.p-menu .mfoot button { display: block; width: 100%; text-align: left; padding: 8px 10px;',
    '  border: 1px solid var(--border-subtle, #E4E4E7); border-radius: var(--radius-sm, 6px);',
    '  background: var(--surface-1, #fff); font: inherit; cursor: pointer;',
    '  font-size: var(--type-subhead-size, 15px); color: var(--text-primary, #18181B); }',
    '.p-menu .mfoot button:hover { background: var(--surface-2, #F4F4F5);',
    '  border-color: var(--border-default, #E4E4E7); }',
    '.p-menu .mfoot button small { display: block; margin-top: 2px;',
    '  font-size: var(--type-caption-size, 12px); color: var(--text-muted, #71717A); }',
    '.p-notes { width: min(470px, calc(100vw - 32px)); }',
    '.p-notes textarea { width: 100%; min-height: 172px; resize: vertical; box-sizing: border-box;',
    '  font: inherit; font-size: var(--type-callout-size, 15px); line-height: 1.5;',
    '  padding: var(--space-3, 12px); border: 1px solid var(--border-default, #E4E4E7);',
    '  border-radius: var(--radius-md, 8px); background: var(--surface-1, #fff);',
    '  color: var(--text-primary, #18181B); }',
    '.pfoot { display: flex; align-items: center; gap: var(--space-3, 12px);',
    '  margin-top: var(--space-3, 12px); }',
    '.psave { font-size: var(--type-caption-size, 12px); color: var(--text-muted, #71717A); }',
    '.pchk { display: inline-flex; align-items: center; gap: 6px; cursor: pointer;',
    '  font-size: var(--type-caption-size, 12px); color: var(--text-secondary, #52525B); }',
    '.pchk input { margin: 0; accent-color: var(--accent-default, #0F766E); }',
    '.pchk.on { color: var(--success-text, #15803D); }',
    '.p-export { width: 280px; padding: var(--space-2, 8px); }',
    '.p-export button { display: block; width: 100%; text-align: left; padding: 9px 10px;',
    '  border: 0; border-radius: var(--radius-sm, 6px); background: none; font: inherit;',
    '  font-size: var(--type-subhead-size, 15px); color: var(--text-primary, #18181B);',
    '  cursor: pointer; }',
    '.p-export button:hover { background: var(--surface-2, #F4F4F5); }',
    '.p-export button small { display: block; margin-top: 2px;',
    '  font-size: var(--type-caption-size, 12px); color: var(--text-muted, #71717A); }',
    '.p-json { width: min(600px, calc(100vw - 32px)); }',
    '.p-json .psave { display: block; margin: 0 0 var(--space-3, 12px); }',
    '.p-json textarea { width: 100%; height: 230px; box-sizing: border-box; resize: vertical;',
    '  font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 11px;',
    '  line-height: 1.5; padding: var(--space-3, 12px); border: 1px solid var(--border-default, #E4E4E7);',
    '  border-radius: var(--radius-md, 8px); background: var(--surface-2, #F4F4F5);',
    '  color: var(--text-primary, #18181B); }',
    // The toast is a sibling of the bar rather than a child, so it sits in the root
    // stacking context and needs a value of its own — above the bar, since a toast
    // behind the bar is as invisible as one behind a lab header.
    '.navtoast { position: fixed; left: 50%; bottom: 24px; z-index: 520; transform: translateX(-50%);',
    '  max-width: calc(100vw - 32px); padding: 9px 15px; border-radius: var(--radius-md, 8px);',
    '  background: var(--text-primary, #18181B); color: var(--bg-raised, #fff);',
    '  font-size: var(--type-subhead-size, 15px); opacity: 0; pointer-events: none;',
    '  transition: opacity 150ms ease; box-shadow: 0 10px 28px -8px rgba(0,0,0,.4); }',
    '.navtoast.on { opacity: 1; }',
    '@media (prefers-reduced-motion: reduce) { .navtoast { transition: none; } }',
    '@media (max-width: 1180px) { .labnav-brand { display: none; } }',
    '@media (max-width: 900px) { .navtitle .pos { display: none; } }',
    '@media (max-width: 860px) { .nchk span { display: none; } }',
    // Shed the words before the affordances: the view's name is the one thing on the
    // bar a reader needs to keep their place, so it is the last to go and it
    // ellipsises rather than vanishing.
    '@media (max-width: 700px) { .btxt { display: none; } }',
    '@media (max-width: 620px) { #nav-export { display: none; } }',
    '@media (max-width: 560px) { #nav-chk { display: none; } }',
    '@media (max-width: 460px) { .navtitle { display: none; } }'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  // One key holds every view's review state. `file://` and the Pages origin both
  // support localStorage and both share it across labs, which is what makes notes
  // written on one page visible on the next — verified before relying on it.
  var STORE = 'smallwins.labs.review.v1';
  var state = readStore();

  function readStore() {
    try {
      var raw = localStorage.getItem(STORE);
      var s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== 'object' || !s.views || typeof s.views !== 'object') {
        return { version: 1, views: {} };
      }
      return s;
    } catch (e) {
      // Private mode, a blocked origin, or a corrupt value. The nav still works;
      // it just cannot remember anything, and it says so on first write.
      return { version: 1, views: {}, unavailable: true };
    }
  }
  // Read without creating: an export of "reviewed views" must not be padded with
  // seventeen entries the user never opened. There is no matching `touch` — entries
  // are created by `commit` below, which is the only writer.
  function peek(file) { return state.views[file] || null; }

  // Every write goes through here, and it is a read-modify-write of **one view** on
  // purpose. The obvious version — keep the whole store in memory and write it back on
  // unload — is wrong the moment two labs are open in two tabs, which is the normal way
  // to use these: tab B's `beforeunload` writes its stale snapshot over everything tab A
  // just recorded. Patching only `file` means a tab can only ever lose its own edits.
  // (Found by clearing the store from outside and watching the old values come back.)
  function commit(file, patch) {
    var fresh = readStore();
    var mine = fresh.views[file] || { reviewed: false, notes: '' };
    if (patch.reviewed !== undefined) mine.reviewed = patch.reviewed;
    if (patch.notes !== undefined) mine.notes = patch.notes;
    mine.updatedAt = new Date().toISOString();
    fresh.views[file] = mine;
    state = fresh;
    try { localStorage.setItem(STORE, JSON.stringify(fresh)); return true; }
    catch (e) { return false; }
  }
  function counts() {
    var reviewed = 0, noted = 0;
    LABS.forEach(function (lab) {
      var v = peek(lab.file);
      if (v && v.reviewed) reviewed++;
      if (v && v.notes && v.notes.trim()) noted++;
    });
    return { reviewed: reviewed, noted: noted };
  }

  // Grouped the way the doc set is — foundations, then modules, then the flows,
  // then the two labs that are cross-cutting. Order is the reading order of
  // `docs/README.md`, and it is also the order the prev/next stepper walks, so
  // the bar and the spec agree about what belongs with what.
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
  var at = -1;
  LABS.forEach(function (lab, i) { if (lab.file.toLowerCase() === here) at = i; });
  var self = at >= 0 ? LABS[at] : { name: here, file: here, group: '' };
  var back = at > 0 ? LABS[at - 1] : null;
  var fwd = at >= 0 && at < LABS.length - 1 ? LABS[at + 1] : null;

  var nav = document.createElement('nav');
  nav.className = 'labnav';
  nav.setAttribute('aria-label', 'Design labs');

  var me = peek(self.file) || {};
  var html = '<span class="labnav-brand">Small Wins — design</span>';

  // The menu. Eighteen peers is a list nobody scans, so the bar carries one door
  // and the list lives behind it, grouped and ticked.
  html += '<button class="nbtn" id="nav-menu" type="button" aria-haspopup="true" aria-expanded="false">' +
          '<span aria-hidden="true">☰</span><span class="btxt">All labs</span></button>';

  // The stepper. Anchors rather than buttons so a view can be opened in a new tab,
  // and "the sides" of the bar rather than of the title, so the two are at the two
  // ends of the thing they move through. `is-off` rather than `disabled`, because a
  // disabled anchor is not a thing and the ends still need to be readable.
  function stepAsset(id, target, glyph, ends) {
    var cls = 'nstep' + (target ? '' : ' is-off');
    var href = target ? target.file : '#';
    var off = target ? '' : ' aria-disabled="true"';
    var tip = target ? ends + ': ' + target.name + ' (' + glyph + ')' : ends;
    return '<a class="' + cls + '" id="' + id + '" href="' + href + '"' + off + ' title="' + tip + '">' + glyph + '</a>';
  }
  html += '<span class=\"navstep\">' +
          stepAsset('nav-prev', back, '[', 'Previous') +
          '<span class=\"navtitle\" id=\"nav-title\">' + self.name +
          '<span class=\"pos\">' + (at >= 0 ? (at + 1) + ' / ' + LABS.length : '') + '</span></span>' +
          stepAsset('nav-next', fwd, ']', 'Next') +
          '</span>';

  html += '<span class="labnav-grow"></span>';

  html += '<label class="nchk' + (me.reviewed ? ' on' : '') + '" id="nav-chk">' +
          '<input type="checkbox" id="nav-reviewed"' + (me.reviewed ? ' checked' : '') + '>' +
          '<span>Reviewed</span></label>';
  html += '<button class="nbtn" id="nav-notes" type="button" aria-haspopup="true" aria-expanded="false">' +
          'Notes<span class="dot" id="nav-dot"' + (me.notes && me.notes.trim() ? '' : ' hidden') + '></span></button>';
  html += '<button class="nbtn" id="nav-export" type="button" aria-haspopup="true" aria-expanded="false">Export</button>';

  // A lab whose own controls ARE the subject — the palette lab, where light/dark
  // is the experiment rather than a viewing preference — opts out with
  // `<body data-lab-toggle="off">`. Two things writing `data-mode` is one too many.
  var wantsToggle = document.body.dataset.labToggle !== 'off';
  if (wantsToggle) {
    html += '<button class="toggle" type="button" id="labnav-mode">Dark</button>';
  }
  nav.innerHTML = html;

  // The three panels live inside the nav, which is `position: sticky` and therefore
  // already a containing block — so `top: calc(100% + 6px)` anchors them under the
  // bar with no measuring, and only `left` has to be computed per button.
  //
  // Defined before the menu, because the menu embeds a second copy of it in its
  // footer and `var` is hoisted but not initialised — using it above this line is a
  // TypeError, not an empty string.
  var exportHtml = '<button type="button" data-x="current">Current view<small>this view only, reviewed or not</small></button>' +
                   '<button type="button" data-x="reviewed">Reviewed views<small>every view you have ticked</small></button>' +
                   '<button type="button" data-x="noted">Views with notes<small>notes written, ticked or not</small></button>';

  var menuHtml = '<div class="phead"><strong>Design labs</strong>' +
                 '<span class="sub" id="pop-count"></span><span class="grow"></span>' +
                 '<button class="plink" type="button" data-close>Close</button></div>' +
                 '<div class="cols">';
  var group = '';
  LABS.forEach(function (lab) {
    if (lab.group !== group) {
      if (group) menuHtml += '</div>';
      menuHtml += '<div class="grp"><p class="glab">' + lab.group + '</p>';
      group = lab.group;
    }
    var isHere = lab.file.toLowerCase() === here;
    var v = peek(lab.file) || {};
    var n = v.notes && v.notes.trim() ? v.notes.trim().split(/\s+/).length : 0;
    menuHtml += '<a href="' + lab.file + '" data-file="' + lab.file + '"' +
                (isHere ? ' aria-current="page"' : '') + '>' +
                '<span class="tick" data-tick="' + lab.file + '"' + (v.reviewed ? '' : ' hidden') + '>✓</span>' +
                lab.name +
                '<span class="n" data-n="' + lab.file + '"' + (n ? '' : ' hidden') + '>' + n + 'w</span></a>';
  });
  menuHtml += '</div>';
  menuHtml += '<div class="mfoot"><span class="mlab">Export</span>' +
              exportHtml.replace(/data-x=/g, 'data-menux=') + '</div>';
  menuHtml += '</div>';

  var notesHtml = '<div class="phead"><strong>Notes</strong>' +
                  '<span class="sub">' + self.name + '</span><span class="grow"></span>' +
                  '<button class="plink" type="button" data-close>Close</button></div>' +
                  '<textarea id="pop-notes-text" placeholder="What did this view show you? ' +
                  'Anything the spec gets wrong, or a decision you want recorded…"></textarea>' +
                  // The tick lives here as well as on the bar, so that the bar can drop it
                  // on a narrow window without the feature becoming unreachable — and
                  // because this is where a review actually finishes.
                  '<div class="pfoot"><label class="pchk" id="pop-chk">' +
                  '<input type="checkbox" id="pop-reviewed"><span>Reviewed</span></label>' +
                  '<span class="psave" id="pop-save">Autosaves</span>' +
                  '<span class="grow"></span>' +
                  '<button class="plink pdanger" type="button" id="pop-clear">Clear this view</button></div>';

  nav.insertAdjacentHTML('beforeend',
    '<div class="navpop p-menu" id="pop-menu" hidden>' + menuHtml + '</div>' +
    '<div class="navpop p-notes" id="pop-notes" hidden>' + notesHtml + '</div>' +
    '<div class="navpop p-export" id="pop-export" hidden>' + exportHtml + '</div>' +
    '<div class="navpop p-json" id="pop-json" hidden>' +
      '<div class="phead"><strong>Copy failed</strong><span class="grow"></span>' +
      '<button class="plink" type="button" data-close>Close</button></div>' +
      '<p class="psave">The clipboard refused the write, so the JSON is here instead — ' +
      'it is already selected, so Ctrl/Cmd + C will take it.</p>' +
      '<textarea id="pop-json-text" readonly></textarea></div>');

  var toast = document.createElement('div');
  toast.className = 'navtoast';
  toast.hidden = true;

  // Order matters, and this was wrong first time round: the nav has to be in the
  // document before anything can be inserted *relative* to it. `insertAdjacentElement`
  // on a detached node is a silent no-op, so the toast simply never existed and the
  // only symptom was `null` at the first `flash()`.
  document.body.insertBefore(nav, document.body.firstChild);
  nav.insertAdjacentElement('afterend', toast);

  // The bar is one fixed line, so there is nothing to bring into view any more. The
  // scrolling row this replaces needed a measured `scrollLeft` (bounding rects, not
  // `offsetLeft` — the children's `offsetParent` was the sticky nav); the menu panel
  // scrolls itself and marks the current lab, which is the same job done by the
  // container instead of by arithmetic.

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

  // ── panels ────────────────────────────────────────────────────────────────
  var pops = { menu: nav.querySelector('#pop-menu'), notes: nav.querySelector('#pop-notes'),
               export: nav.querySelector('#pop-export'), json: nav.querySelector('#pop-json') };
  var triggers = { menu: nav.querySelector('#nav-menu'), notes: nav.querySelector('#nav-notes'),
                   export: nav.querySelector('#nav-export') };
  var open = null;

  function closePop() {
    Object.keys(pops).forEach(function (k) { pops[k].hidden = true; });
    Object.keys(triggers).forEach(function (k) { triggers[k].setAttribute('aria-expanded', 'false'); });
    open = null;
  }
  function openPop(which) {
    if (open === which) { closePop(); return; }
    closePop();
    var pop = pops[which], btn = triggers[which];
    pop.hidden = false;
    // Only `left` needs computing: the panels are absolutely positioned inside the
    // sticky nav, so `top: calc(100% + 6px)` already sits them under the bar.
    var nb = nav.getBoundingClientRect(), bb = btn.getBoundingClientRect();
    var room = nb.width - 20;
    pop.style.left = Math.max(10, Math.min(bb.left - nb.left, room - pop.offsetWidth)) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    open = which;
  }

  var toastTimer = null;
  function flash(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    // Next frame, so the transition has a start value to move from.
    requestAnimationFrame(function () { toast.classList.add('on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('on');
      setTimeout(function () { toast.hidden = true; }, 200);
    }, 2600);
  }

  if (triggers.menu) triggers.menu.addEventListener('click', function () { openPop('menu'); });
  if (triggers.notes) triggers.notes.addEventListener('click', function () { openPop('notes'); });
  if (triggers.export) triggers.export.addEventListener('click', function () { openPop('export'); });
  Object.keys(pops).forEach(function (k) {
    pops[k].addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closePop();
    });
  });
  document.addEventListener('click', function (e) {
    if (open && !e.target.closest('.labnav')) closePop();
  });

  // ── reviewed ──────────────────────────────────────────────────────────────
  var chk = nav.querySelector('#nav-reviewed');
  function paintCounts() {
    var c = counts();
    var node = document.getElementById('pop-count');
    if (node) node.textContent = c.reviewed + ' of ' + LABS.length + ' reviewed' +
      (c.noted ? ' · ' + c.noted + ' with notes' : '');
  }
  function setReviewed(on) {
    commit(self.file, { reviewed: on });
    repaint();
  }
  if (chk) chk.addEventListener('change', function () { setReviewed(chk.checked); });
  var popChk = nav.querySelector('#pop-reviewed');
  if (popChk) popChk.addEventListener('change', function () { setReviewed(popChk.checked); });

  // Everything the bar and the menu show about other views, redrawn from `state`.
  // Called after a local edit and after another tab writes (see the `storage` listener
  // below), so a tick made in one tab appears in the other without a reload.
  function repaint() {
    var me = peek(self.file) || {};
    var lbl = nav.querySelector('#nav-chk');
    if (lbl) lbl.classList.toggle('on', !!me.reviewed);
    if (chk) chk.checked = !!me.reviewed;
    var panelLbl = nav.querySelector('#pop-chk');
    var panelIn = nav.querySelector('#pop-reviewed');
    if (panelLbl) panelLbl.classList.toggle('on', !!me.reviewed);
    if (panelIn) panelIn.checked = !!me.reviewed;
    var dot = nav.querySelector('#nav-dot');
    if (dot) dot.hidden = !(me.notes && me.notes.trim());
    LABS.forEach(function (lab) {
      var v = peek(lab.file) || {};
      var tick = nav.querySelector('[data-tick="' + lab.file + '"]');
      if (tick) tick.hidden = !v.reviewed;
      var n = nav.querySelector('[data-n="' + lab.file + '"]');
      if (n) {
        var words = v.notes && v.notes.trim() ? v.notes.trim().split(/\s+/).length : 0;
        n.textContent = words ? words + 'w' : '';
        n.hidden = !words;
      }
    });
    paintCounts();
  }

  // ── notes ─────────────────────────────────────────────────────────────────
  var ta = nav.querySelector('#pop-notes-text');
  var saveMsg = nav.querySelector('#pop-save');
  if (ta) ta.value = (peek(self.file) || {}).notes || '';

  var saveTimer = null;
  // The value this tab last wrote. Comparing against it means navigating away from an
  // untouched view writes nothing, which is both fewer writes and the difference
  // between a store that can be cleared from outside and one that gets repopulated by
  // the flush on every page change. (`beforeunload` fires on every navigation between
  // labs, so an unconditional save is eighteen writes for a review session.)
  var lastCommitted = (peek(self.file) || {}).notes || '';
  function saveNotes() {
    if (!ta) return;
    if (ta.value === lastCommitted) {
      if (saveMsg) saveMsg.textContent = 'Saved';
      return;
    }
    var ok = commit(self.file, { notes: ta.value });
    if (ok) lastCommitted = ta.value;
    if (saveMsg) saveMsg.textContent = ok ? 'Saved' : 'Not saved — storage is unavailable';
    repaint();
  }
  if (ta) {
    ta.addEventListener('input', function () {
      if (saveMsg) saveMsg.textContent = 'Saving…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveNotes, 250);
    });
    // Navigating to the next view is a page load, so the pending debounce would be
    // lost with the tab. Flush on the way out.
    ta.addEventListener('blur', function () { clearTimeout(saveTimer); saveNotes(); });
    window.addEventListener('beforeunload', function () { clearTimeout(saveTimer); saveNotes(); });
  }
  var clearBtn = nav.querySelector('#pop-clear');
  if (clearBtn && ta) {
    clearBtn.addEventListener('click', function () {
      ta.value = '';
      saveNotes();
      flash('Notes cleared for ' + self.name);
    });
  }

  // ── export ────────────────────────────────────────────────────────────────
  function payload(which) {
    var c = counts();
    var rows = LABS.filter(function (lab) {
      var v = peek(lab.file) || {};
      if (which === 'current') return lab.file.toLowerCase() === here;
      if (which === 'reviewed') return !!v.reviewed;
      return !!(v.notes && v.notes.trim());
    }).map(function (lab) {
      var v = peek(lab.file) || {};
      return {
        lab: lab.name,
        file: lab.file,
        group: lab.group,
        reviewed: !!v.reviewed,
        updatedAt: v.updatedAt || null,
        notes: (v.notes || '').trim()
      };
    });
    return {
      generatedAt: new Date().toISOString(),
      source: 'Small Wins — design labs',
      export: which,
      counts: { views: LABS.length, reviewed: c.reviewed, withNotes: c.noted },
      views: rows
    };
  }

  // The clipboard write can reject — `NotAllowedError: Document is not focused` is
  // what it does when the document has not been interacted with, and a blocked or
  // unfocused window does it too. So: try the async API, fall back to the legacy
  // command, and if both refuse, put the JSON on screen already selected rather
  // than telling the user it failed and leaving them nothing.
  function put(text, ok, fail) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () {
        if (legacyCopy(text)) ok(); else fail();
      });
    } else {
      if (legacyCopy(text)) ok(); else fail();
    }
  }
  function legacyCopy(text) {
    var t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;top:-2000px;left:0;opacity:0';
    document.body.appendChild(t);
    t.select();
    var done = false;
    try { done = document.execCommand('copy'); } catch (e) { done = false; }
    document.body.removeChild(t);
    return done;
  }

  // Delegated from the nav rather than from the export panel, because the same three
  // commands appear in the menu's footer for windows too narrow to carry the button.
  nav.addEventListener('click', function (e) {
    var b = e.target.closest('[data-x], [data-menux]');
    if (!b) return;
    var which = b.getAttribute('data-x') || b.getAttribute('data-menux');
    var data = payload(which);
    var text = JSON.stringify(data, null, 2);
    closePop();
    put(text, function () {
      var n = data.views.length;
      flash(n ? 'Copied ' + n + ' view' + (n === 1 ? '' : 's') + ' as JSON — paste it back to me.'
              : 'Nothing to copy: no view matches that yet.');
    }, function () {
      var box = nav.querySelector('#pop-json-text');
      box.value = text;
      pops.json.hidden = false;
      box.focus();
      box.select();
    });
  });

  // ── keys ──────────────────────────────────────────────────────────────────
  // `[` and `]`, not the arrow keys: Alt+Arrow is the browser's Back/Forward on
  // Windows, and a bare arrow is already bound by the calendar and palette labs.
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === 'Escape') { closePop(); return; }
    if (e.key === '[' && back) location.href = back.file;
    if (e.key === ']' && fwd) location.href = fwd.file;
  });

  // Another tab wrote. Re-read and redraw rather than keeping a stale copy — this is
  // what makes two labs open side by side usable.
  window.addEventListener('storage', function (e) {
    if (e.key && e.key !== STORE) return;
    state = readStore();
    if (!ta) { repaint(); return; }
    // Do not fight the field the user is typing in: only adopt the stored text when
    // this tab has no unsaved edit pending for this view.
    if (document.activeElement !== ta) {
      ta.value = (peek(self.file) || {}).notes || '';
    }
    repaint();
  });

  paintCounts();
  closePop();

  // The toggle. Every lab ships `light` + `warm` and switches to `dark` + `cool`,
  // which is the pairing the token set decided on: warm paper for light, cool ink
  // for dark. Dark and light are not a matched pair and are not meant to be.
  var btn = nav.querySelector('#labnav-mode');
  if (btn) {
    var label = function () {
      var dark = document.documentElement.dataset.mode === 'dark';
      btn.textContent = dark ? 'Light' : 'Dark';
      // "Dark" says what the button will do and nothing about what is on screen.
      // The accessible name states the action rather than the target.
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = btn.getAttribute('aria-label');
    };
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
  }
})();
