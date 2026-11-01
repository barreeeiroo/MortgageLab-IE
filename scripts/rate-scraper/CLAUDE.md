# Rate Scraper

Fetches mortgage rates from lender websites and saves to data/rates/.

## Directory Structure

- `scrape.ts` - Main scraper entry point (single lender or --all)
- `scrape-historical.ts` - Fetch historical rates from Wayback Machine
- `validate.ts` - Validate rate data integrity
- `validate-history.ts` - Validate history matches current rates
- `providers/` - Per-lender scraping implementations
- `history/` - History tracking (changeset.ts, wayback.ts, build-history.ts)
- `utils/` - Shared utilities (hash.ts, parsing.ts, types.ts)

## Adding a New Lender

1. Create providers/<lender>.ts implementing `LenderProvider`:
   ```typescript
   export const provider: LenderProvider = {
     lenderId: "lender-id", // must match data/lenders.json
     name: "Lender Name",
     url: "https://...",
     scrape: async () => MortgageRate[],
   };
   ```
2. Register in scrape.ts providers array
3. Test: `bun run rates:scrape <lender>` then `bun run rates:validate`

## Rate File Format

- `lastScrapedAt`: When scraper ran
- `lastUpdatedAt`: When rates actually changed (based on hash)
- `ratesHash`: SHA256 of rates array - detects real changes vs formatting

## History File Format

Stored in `data/rates/history/<lender>.json`. Diff-based, not full snapshots.

- `baseline`: Initial full rate array + timestamp + hash
- `changesets`: Array of `{ timestamp, afterHash, operations }` where operations are:
  - `{ op: "add", rate }` - New rate added
  - `{ op: "remove", id }` - Rate removed
  - `{ op: "update", id, changes }` - Only changed fields

Validate with `bun run rates:validate-history`.

## Gotchas

- **BER eligibility**: Some rates only for A1-B3 (green rates)
- **Buyer types**: `ftb`, `mover`, `btl`, `switcher-pdh`, `switcher-btl`
- **Follow-on rates**: Fixed rates need corresponding variable follow-on
- **LTV**: Percentages 0-100, not decimals
- **0-rate guard**: A provider parsing 0 rates never overwrites its JSON - the
  existing file is kept untouched so `lastScrapedAt` goes stale and signals a
  broken scraper needing manual attention. It doesn't fail the run, so GHA
  still commits other lenders' changes.
- **Bot protection**: AIB, EBS, Haven and Avant serve 403s to `fetch()` even
  with browser headers (TLS fingerprint blocking), and from datacenter IPs
  (GitHub runners) they 403 curl too. Their providers must use `fetchHtml()`
  from `utils/fetch.ts`, which tries curl → fetch() → headful Chromium via
  Playwright (spawning Xvfb when there is no DISPLAY). Headless Chromium also
  gets 403 - the sites detect automation; headful is required.
- **Hang protection**: every fetch tier and provider scrape is time-boxed
  (`fetch()` gets `AbortSignal.timeout`, providers a 10-minute wall clock in
  `scrape.ts`), and `main()` ends with `closeBrowser()` + explicit
  `process.exit`. Akamai sometimes parks TCP connections instead of answering,
  and one unbounded `fetch()` once hung the GHA job for its full 6h timeout.
  The sync-rates job also sets `timeout-minutes: 45` as a last resort.
- **Empty headings**: PTSB's page contains empty `<h4>` spacer headings; the
  provider maps each h4 to its next table, so empty headings must be skipped
  or a later section's table gets parsed with the wrong section flags.
