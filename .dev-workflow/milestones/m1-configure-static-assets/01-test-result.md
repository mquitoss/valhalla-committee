# Test Result: m1-configure-static-assets

STATUS: READY

## Files Changed

- Added `.dev-workflow/milestones/m1-configure-static-assets/check-config.mjs`.
- Added `.dev-workflow/milestones/m1-configure-static-assets/01-test-result.md`.
- Appended the test-writer trace block to `.dev-workflow/00-trace.md`.
- No application, deployment configuration, manifest, lockfile, source, or generated asset was changed.

## Behaviors Covered

The milestone-scoped checker uses only Node.js built-ins and validates:

- exact `wrangler` pin `4.147.0` in `package.json` `devDependencies`, not production dependencies;
- the same root lockfile pin and resolved `node_modules/wrangler` version;
- preservation of the existing `dev`, `build`, and `check` commands;
- exact local Worker and deployment scripts required by the specification;
- required `$schema`, Worker name, compatibility date, and `./dist` assets directory;
- absence of a Worker entrypoint, account/route configuration, runtime vars, and binding categories.

The checker accepts JSONC comments and trailing commas. Wrangler's own dry-run remains the authoritative schema/runtime validation rather than duplicating the Wrangler schema in test code.

## Executable Validation Matrix

Run in this order after implementation. None of these commands publishes a Worker.

| Area | Command/check | Expected result |
| --- | --- | --- |
| Runtime precondition | `node --version` | Node satisfies `>=22.12.0`. |
| Registry precondition | `npm view wrangler@4.147.0 version --json` | Prints exactly `"4.147.0"`. |
| Reproducible install | `npm ci` | Exits zero without changing tracked manifest/lockfile. |
| Declarative contract | `node .dev-workflow/milestones/m1-configure-static-assets/check-config.mjs` | Prints `PASS` and exits zero. |
| Existing type gate | `npm run check` | Exits zero. |
| Production build | `npm run build && test -f dist/index.html` | Exits zero and produces `dist/index.html`. |
| Wrangler/schema/assets dry-run | `npm run deploy -- --dry-run` | Exits zero, identifies `./dist`, and does not authenticate or publish. |
| Worker development smoke | Use the bounded HTTP recipe below with `dev:worker`. | `/` returns HTTP success and contains the landing title. |
| Worker preview smoke | Use the bounded HTTP recipe below with `preview`. | `/` returns HTTP success and contains the landing title. |
| Scope/format | `git diff --check && git status --short && git diff -- package.json package-lock.json wrangler.jsonc` | No whitespace errors; implementation changes are limited to the expected files and `dist/` is not tracked. |

Bounded smoke recipe, run once with `script=dev:worker` and once with `script=preview` (use a free port and inspect the captured log on failure):

```sh
script=dev:worker
log="${TMPDIR:-/tmp}/valhalla-${script//:/-}.log"
npm run "$script" -- --port 8787 >"$log" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true' EXIT INT TERM
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if curl --fail --silent --show-error http://127.0.0.1:8787/ \
    | grep -Fq '<title>Valhalla — ¿Tiene que seguir siendo así?</title>'; then
    ready=1
    break
  fi
  sleep 1
done
test "$ready" -eq 1
kill "$pid" 2>/dev/null || true
wait "$pid" 2>/dev/null || true
trap - EXIT INT TERM
```

This recipe starts only local `wrangler dev`, bounds readiness to 20 seconds, verifies the landing rather than an arbitrary response, and terminates the process. Change only the `script` value for the second run.

## Execution Results

| Command | Result |
| --- | --- |
| `node --version` | PASS — `v22.23.2`, compatible with `>=22.12.0`. |
| `npm --version` | INFO — `10.9.8`. |
| `npm view wrangler@4.147.0 version --json` | PASS — returned exactly `"4.147.0"`; the implementation gate is satisfied. |
| `node .dev-workflow/milestones/m1-configure-static-assets/check-config.mjs` | EXPECTED FAIL before implementation — assertion reports that `package.json` does not pin Wrangler (`actual: undefined`, expected `4.147.0`). |
| `npm ci` | NOT RUN — explicitly excluded from this test-writing phase because it installs dependencies. |
| `npm run check`, `npm run build` | NOT RUN — deferred to implementation validation so this phase does not create or rely on installed/generated state. |
| Dry-run and HTTP smoke checks | NOT RUN — scripts, local Wrangler, and `wrangler.jsonc` do not exist yet; running them cannot provide additional pre-implementation evidence. |
| Initial `git diff --check` | PASS. |
| Initial `git status --short` | INFO — only the pre-existing untracked `.dev-workflow/` tree was reported before this report was written. |

The expected failing checker establishes the red TDD state for acceptance criteria 1, 2, and 6. Build, dry-run, and HTTP checks are integration gates that become meaningful only after the declarative implementation and dependency installation.

## Preconditions for Implementation

- Keep `wrangler@4.147.0` exact; registry availability has been confirmed.
- Use `npm install --save-dev --save-exact wrangler@4.147.0` to update manifest and lockfile coherently; do not hand-author lockfile resolution data.
- Implement the exact scripts asserted by the checker. Both local Worker scripts build before `wrangler dev`; deploy scripts do not duplicate the separate build step.
- Create an assets-only `wrangler.jsonc`; do not add `main`, account identifiers, routes, variables, secrets, or bindings.
- Run the full matrix after implementation, but never run deploy or preview-deploy without the documented non-publishing mode or an authorized Workers Builds environment.

## Assumptions

- Exact script strings in the plan are interpreted as `dev:worker` and `preview` both using `npm run build && wrangler dev`, with ports passed through by npm to Wrangler.
- The implementation may use JSONC comments or trailing commas; the local checker supports both.
- Port `8787` is available when each smoke check runs; otherwise the operator will select another free port consistently in command and URL.
- Workflow artifacts are not part of the implementation diff restriction to `package.json`, `package-lock.json`, and `wrangler.jsonc`.

## Decisions & Alternatives Considered

- **Milestone-scoped Node checker**
  - Chosen: one dependency-free `.mjs` checker for manifest, lockfile, scripts, and Wrangler invariants.
  - Alternatives considered: documentation only, shell assertions, Vitest, Playwright, or schema duplication.
  - Why: it creates a deterministic executable red/green contract using the repository's existing runtime without adding dependencies or a framework.
- **Wrangler validation boundary**
  - Chosen: statically check milestone invariants, then use `wrangler deploy --dry-run` for authoritative schema and packaging validation.
  - Alternatives considered: reimplementing the full Wrangler schema in the checker.
  - Why: avoids a brittle parallel validator while still detecting prohibited configuration before invoking Wrangler.
- **No install/build during test writing**
  - Chosen: confirm the npm version remotely and record one expected declarative failure; defer installation and integration gates.
  - Alternatives considered: run `npm ci`, build, or local servers now.
  - Why: the user explicitly prohibited dependency installation, and the missing implementation makes Worker integration checks premature.
