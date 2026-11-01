# GitHub and Vercel delivery

Configuration set up on **1 November 2026**, based on the open-kiln and happy-birthday projects. The page is a static Next.js page with one serverless route (`/api/telemetry`). It needs no API keys, databases, environment variables or paid add-ons.

## Project identity

- GitHub: [Perceval-Wilhelm/Valentine-Heart](https://github.com/Perceval-Wilhelm/Valentine-Heart).
- Commits: authored as `Bùi Quốc Thịnh <82101710+Perceval-Wilhelm@users.noreply.github.com>`, the owner's GitHub noreply address, and pushed as Perceval-Wilhelm.
- Vercel: [valentine-heart](https://vercel.com/perceval-wilhelms-projects/valentine-heart) (`prj_fRBKt8cVy61K3PUaOGnGy166PRKx`), in the personal `perceval-wilhelms-projects` workspace (Hobby).
- Production: [happy-valentine-from-perceval.vercel.app](https://happy-valentine-from-perceval.vercel.app). The automatic `valentine-heart-lac.vercel.app` redirects to it (308). `valentine-heart.vercel.app` belongs to someone else's project.
- Production branch: `main`. Every other branch gets a preview deployment, protected by Vercel Authentication.

## CI

`.github/workflows/check.yml` runs on pull requests to `main`, pushes to `main` and manual dispatch. Newer runs cancel older ones for the same branch or PR.

| Check                   | Verification                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Valentine Heart quality | Immutable install, high/critical dependency audit, formatting, zero-warning ESLint, route types, TypeScript, unit tests, lint and smoke-script regression tests, build                            |
| Valentine Heart browser | A fresh production build, then Playwright at phone, tablet and desktop sizes: intro, burst and name with a frozen clock, axe, reduced motion, no WebGL, no JavaScript, smoke checks, budgets, 404 |

Each job has a 15-minute limit. Browser failure reports, screenshots and traces are kept for seven days. The workflow declares `contents: read`, disables persisted checkout credentials, pins actions to full commit SHAs and uses no Vercel token.

`.github/workflows/smoke.yml` (**Valentine Heart production**) checks the live domain with `scripts/smoke.mjs`: the page, its CSP and `noindex` headers, the share image, `robots.txt`, `/2025.html`, the telemetry route and the 404. It runs:

- after every successful production deployment, waiting (up to 15 minutes) until the domain's `X-Build` header shows that deployment's commit, which confirms the deployment checks let it through;
- every day at 08:17 Asia/Ho_Chi_Minh, as uptime monitoring;
- on demand. Run `SMOKE_URL=https://happy-valentine-from-perceval.vercel.app corepack yarn smoke` locally for the same checks.

GitHub emails the repository owner when a run fails. GitHub disables scheduled workflows after 60 days without repository activity; re-enable it from the Actions tab if that happens.

Dependabot opens grouped weekly updates for npm and GitHub Actions (Monday 03:00, Asia/Ho_Chi_Minh). Dependabot PRs are never queued for auto-merge. TypeScript and `@types/node` majors need a compatibility review.

## GitHub protections

The `main` ruleset (**Protect main with verified changes**) and repository settings match happy-birthday:

- Pull requests are required, with all review conversations resolved. Required approvals: zero, for a solo owner. No bypass actors.
- **Valentine Heart quality** and **Valentine Heart browser** must pass, from GitHub Actions, on an up-to-date branch.
- Force pushes and branch deletion are blocked; history stays linear. Only squash merging is enabled, using the PR title, and merged branches are deleted.
- Auto-merge is allowed: `gh pr merge <number> --squash --auto` squash-merges once both checks pass. Queue it as the repository owner. Nothing is queued automatically.
- Secret scanning with push protection, Dependabot alerts and security updates, and CodeQL default setup are enabled.

## Vercel settings

| Setting               | Configuration                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework             | Next.js, from `vercel.json`                                                                                                                                                  |
| Install / build       | `npx --yes corepack@0.36.0 yarn install --immutable` / `… yarn build`, from `vercel.json` (Node 25+ does not bundle Corepack)                                                |
| Output directory      | Framework default (`outputDirectory: null`)                                                                                                                                  |
| Node.js               | 26.x; `.nvmrc` pins 26.13.0 and `engines` allows `>=26.13.0 <27`                                                                                                             |
| Functions             | Fluid compute in `sin1` (Singapore, nearest Vietnam), from `vercel.json`. Pages are prerendered; only `/api/telemetry` runs as a function                                    |
| Git                   | Connected to the GitHub repository; pushes create deployments                                                                                                                |
| Deployment protection | Standard Protection: Vercel Authentication on previews and deployment URLs; production domains public                                                                        |
| Environment variables | None required                                                                                                                                                                |
| Web Analytics         | On; the SDK mounts only when `VERCEL_ENV` is `production`                                                                                                                    |
| Speed Insights        | Collected from production with nothing to switch on: Hobby's free tier includes 10K events per rolling 30 days                                                               |
| Deployment checks     | Valentine Heart quality and Valentine Heart browser, from GitHub. A production deployment gets the production domains only after both pass on its commit (20-minute timeout) |
| Firewall              | AI crawlers denied, AI assistants logged. Custom rule "Rate limit error reports": 20 requests per minute per IP to `/api/telemetry`                                          |
| Deployment retention  | Deployments expire after 30 days; the 10 newest production deployments are kept                                                                                              |

These settings live in Vercel, not in this repository. Change them with the CLI (`vercel project web-analytics`, `vercel project checks`, `vercel firewall`, `vercel api`) or the dashboard. Do not run `vercel project speed-insights enable` or `vercel project observability enable`: they turn on the paid Plus tiers. Keep build settings in `vercel.json` rather than as dashboard overrides.

Not used: Vercel CI (beta) would repeat the GitHub Actions jobs, whose results already gate production. Bot Protection's challenge could block the chat apps that fetch the share preview. Skew Protection, Rolling Releases, alerts, drains and longer log retention need a paid plan.

## Monitoring and logs

- **Web Analytics → Pages:** `/` counts visits. `/moments/heart-formed`, `/moments/love-sent`, `/moments/name-held`, `/moments/sound-on`, `/moments/replayed`, `/moments/opened-2025` and `/moments/no-webgl` show how the heart was used; each counts once per visit. Hobby plans drop custom events, so milestones are virtual page views.
- **Speed Insights:** Core Web Vitals from real devices. The message is the largest element and is server-rendered, so it is what LCP measures.
- **Firewall:** denied AI crawlers and rate-limited telemetry bursts; `vercel firewall overview` prints the last day.
- **Logs / Observability:** browser errors (`source: window | promise | boundary`) and server errors (`source: server`) arrive as one JSON line each with the commit. Hobby keeps runtime logs for one hour, so check soon after a problem.
- **Production smoke:** the workflow above; its runs are the uptime history.

## Routine release

1. Branch from `main`. Edit `src/content/valentine.ts` for a new message or recipient.
2. Run `corepack yarn verify`.
3. Review the whole diff, including the lockfile, then push and open a PR.
4. Wait for both checks and the Vercel preview. Open the preview while signed in to Vercel; try it on a phone: the intro, Send love, holding the heart and the sound.
5. Squash-merge, or queue auto-merge. Vercel builds `main` and moves the production domains to it once both checks pass on that commit; **Valentine Heart production** then confirms the domain serves the new commit and still passes the smoke checks.

## Recovery

A `main` commit whose checks fail never takes over the production domains; the previous deployment stays live. For a problem the checks missed, use Vercel's **Instant Rollback** (Hobby can return only to the previous production deployment), then fix forward with a PR. Rollback moves the domain; it does not change Git history. Do not bypass required checks or force-push `main`.

## Setup notes

Two Vercel behaviours met while setting this up, worth knowing for the next project:

- **A new project's first deployment is always production**, whatever its branch. Here it was a push to the pull request branch, which would have taken the production domain once its checks passed. That deployment (`dpl_62xoFBtZmr9BmB4J2R6aPLJMAi3o`) was cancelled before it built, and the preview was created through the API (`POST /v13/deployments` with a `gitSource` and no `target`). Pull request pushes have built previews since.
- **`vercel curl` creates a deployment protection bypass token** for the project the first time it reaches a protected preview, without asking. The token created on 1 November 2026 was revoked straight after use. Check with `vercel api /v9/projects/valentine-heart` (`protectionBypass` should be empty) and revoke any leftover token with `PATCH /v1/projects/valentine-heart/protection-bypass`.
