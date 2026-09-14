> **SUPERSEDED — do not use for validation.** Audit prompt. See README section 21.
> Folded into `README.md`. Kept only for history.

# Verification Prompt — audit the build against BUILD.md

Paste the block below to Claude Code, with `BUILD.md` present in the repo root. It
audits the existing implementation against the spec and reports pass/fail per
requirement. It is read-and-verify first; it does not change code unless you tell it
to at the end.

---

You are auditing this repository against `BUILD.md` (the build spec) in the repo
root. Read `BUILD.md` in full first. Your job is to verify what is actually
implemented and working — not to trust file names, and not to fix anything yet.

**Rules**
- Verify by evidence: read the code, run the app, and query the data. A file
  existing is not proof a requirement is met.
- Do not modify code, migrations, or data during the audit. Hold all findings for
  the final report.
- If something cannot be checked (e.g. no Supabase credentials), mark it
  **BLOCKED** and say exactly what you need — never guess a pass.
- Treat the event tracking as the highest-stakes part: if the behavioral signal
  could be wrong, that is a critical finding regardless of how the UI looks.

**Steps**
1. **Inventory.** Map the repo to Section 4 of `BUILD.md`. List what exists, what is
   missing, and anything extra not in the spec.
2. **Build health.** Run install, `lint`, `typecheck` (if present), and `build`.
   Record failures verbatim.
3. **Data model (Section 5).** Check migrations for `shows`, `episodes`,
   `demo_profiles`, `events` and their columns/indexes/RLS. Confirm `events` accepts
   an anon insert and rejects client update/delete. Confirm a seed populates the
   catalog and that `data/catalog.seed.json` fallback exists and loads.
4. **Event schema (Section 6) — do this carefully.** For every `event_type`,
   find where it is fired and confirm the payload matches. Then run the app
   and perform a scripted click-through (select profile → view home → hover/click the
   WWYE row → open a title → use the heatmap scrubber → play). After
   it, query `events` and confirm each expected row appears exactly once, in order,
   with correct payload, and that `is_feature` distinguishes the WWYE row from
   generic rows. Flag any missing, extra, double-fired, or mis-payloaded event.
5. **Feature DoD.** Walk the Section 7.1 (WWYE) checkboxes one by one and
   mark each pass/fail with the evidence you used.
6. **Phase DoD.** For each phase in Section 9, state whether its DoD is met, partially
   met, or not met.
7. **Report (Section 8 / 10).** Confirm `/report` (or the report queries) computes
   the WWYE funnel, feature-vs-baseline CTR, dwell, and bounce. Confirm thresholds
   are read from config, not hard-coded post-hoc.
8. **Responsive & ethics.** Spot-check desktop/tablet/mobile-browser widths, the
   pseudonymous-only data rule, and the research-prototype notice.

**Output** — a single structured report:
- **Summary verdict:** overall readiness in one line (e.g. "functional, event
  tracking has 2 critical gaps").
- **Scorecard:** a table of Requirement | Status (PASS / FAIL / PARTIAL / BLOCKED) |
  Evidence, grouped by section, most severe first.
- **Critical findings:** anything that corrupts the behavioral signal or blocks a
  test session, with the exact file/line and a concrete failing scenario.
- **Gaps by phase:** what remains for each incomplete phase.
- **Open items:** which Section-11 "Open Items" are still unresolved.

After the report, ask whether I want you to fix the failing items, and in what order.
Do not start fixing until I confirm.
