# ADR 0034 — Deployed on Vercel, For Now

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** [founder]

## Context

ADR 0018 chose **Cloudflare Workers** as the host and gave its reasons: an official
TanStack Start partner, a free tier that is usable commercially (unlike Vercel's
Hobby plan, which is not), one dashboard with the registrar, DNS and inbound mail,
and Durable Objects for the sync engine's WebSocket path. It also gated the actual
purchase on the domain, which is still unbought — every reference to it reads
`in.<domain>`.

Nothing in the repository deployed the app. `gh-pages` publishes the design labs as
static HTML and the app has no host at all: no adapter, no platform manifest, no CI.
So "deploy it" needed a target before it could need a command.

**The target chosen is Vercel**, which contradicts ADR 0018 on one of its stated
grounds. That is the founder's call rather than a doc error, so it is recorded here
rather than silently folded into the stack table.

## Decision

**The app deploys to Vercel from `vite build --mode deploy`.**

**Nitro's `vercel` preset is added only in that mode.** TanStack Start emits a
`{ fetch }` handler and no `index.html`, so there is nothing static to upload: the
host has to run the handler, and Vercel's shape for that is its Build Output API
directory. `--mode deploy` is a Vite build mode rather than an environment variable
so the command is identical on every platform, and the **default build is
untouched** — which is what keeps `vite preview`, and therefore the Playwright
suite, working.

**`vercel deploy --prebuilt` takes that directory as it is.** No Vercel build runs,
so the platform's framework detection cannot disagree with ours about how the app
is built.

**`vercel.json` names the build command for the deploys that are not prebuilt.**
Linking the project also connected the GitHub repository, so a push triggers a Vercel
build — and the detector reads this app as Nitro, whose `nitro build` is not a script
here. `framework: null` turns the detection off and `buildCommand` points at
`pnpm build:deploy`, which produces the same Build Output API directory in Vercel's
own build as `pnpm deploy` produces locally. The file is inert for `--prebuilt`.

**Cloudflare stays the plan.** This ADR does not supersede ADR 0018: it names a
working target for now, and the migration to Workers is a change of preset and a
`wrangler.jsonc` when the domain is bought. What ADR 0018 gets right is unchanged —
including the Hobby plan's terms, which is the one cost this decision takes on.

## Consequences

**Positive.**

- The app has a URL, and the deploy is one command that runs the same build the
  suite already tests.
- The default build, `vite preview` and `pnpm e2e` are unaffected, so the deploy
  target cannot rot quietly: nothing about it is in the path the tests take.
- No secrets are in the repository. `.vercel/`, `.nitro/` and `.env.local` are
  ignored; authentication is the CLI's.

**Negative.**

- **The Hobby plan is not licensed for commercial use**, and the app is intended
  for a store listing (`05-modules/…`, ADR 0015). This is the trade ADR 0018
  rejected, taken knowingly: it is fine while the app has no paying users and is a
  blocker the day it does.
- **Two hosts to keep in mind.** The design labs publish to `gh-pages` and the app
  publishes to Vercel, so "where does the project live" now has two answers.
- **Deployment protection is on by default**, which makes the production URL
  viewable only by the account that owns it. That is a project setting rather than
  a code property, and disabling it is a decision with a security meaning — so it
  is not in the build.
- The project was created with the GitHub repository connected, so a push triggers a
  Vercel build. `vercel.json` is what keeps those builds honest — the detector reads
  this app as Nitro, and `nitro build` is not a script here.

**Neutral.**

- `nitro@2` is marked deprecated in favour of a v3 release candidate. The TanStack
  plugin for it is still `nitro-v2-vite-plugin`, so the pair matches today and will
  move together.

## Alternatives considered

- **Cloudflare Workers, as ADR 0018 says.** Not rejected — deferred. It needs an
  account-side setup and a `wrangler` configuration, and the founder chose Vercel.
- **A static export.** Rejected: Start produces no `index.html`, and the version in
  the repository has no SPA mode, so there is no static artifact to serve. Forcing
  one would be an architectural change to the app to suit a host it did not choose.
- **A hand-written Vercel function wrapping `dist/server/server.js`.** Rejected: it
  re-implements what Nitro emits (the function, its chunks, the filesystem-then-
  fallback routes) and would break on the next Start upgrade, silently.
- **Deploying with Vercel's own build.** Rejected: the platform would have to know
  the app needs `--mode deploy`, and its auto-detection says `nitro build`, which is
  not a script here.
