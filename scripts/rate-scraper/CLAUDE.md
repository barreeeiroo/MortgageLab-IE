# Rate Scraper

Fetches mortgage rates from lender websites and saves to data/rates/.

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
2. Register in index.ts providers array
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
