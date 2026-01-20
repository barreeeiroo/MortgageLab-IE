# Contributing

## Development Setup

### Prerequisites

* [Node.js](https://nodejs.org/) (v24 or later)
* [Bun](https://bun.sh/) (recommended) or npm

### Installation

```bash
bun install
```

### Running the Development Server

```bash
bun run dev
```

### Building for Production

```bash
bun run build
```

## Project Structure

```
├── src/             # Source code
│   ├── components/    # React components by feature
│   ├── pages/         # Astro pages (routes)
│   ├── layouts/       # Layout templates
│   ├── lib/           # Utilities, stores, schemas (see below)
│   └── styles/        # Global CSS
├── scripts/         # Build and utility scripts
│   └── rate-scraper/    # Mortgage rate scrapers
├── data/            # Data files
│   ├── rates/         # Lender rate JSON files (generated)
│   └── *.json         # Lender and perk metadata
└── public/          # Static assets
```

### The `src/lib/` Directory

| Directory    | Purpose                                                                            |
|--------------|------------------------------------------------------------------------------------|
| `constants/` | Business rules and configuration (Central Bank limits, BER ratings, site metadata) |
| `schemas/`   | Zod validation schemas for domain objects (rates, lenders, simulation)             |
| `stores/`    | State management with Nanostores (rates form, simulation state, custom rates)      |
| `mortgage/`  | Financial calculations (payments, APRC, overpayments, breakeven analysis)          |
| `utils/`     | Helper functions (currency formatting, date handling, borrowing calculations)      |
| `hooks/`     | React custom hooks (e.g., `useIsDesktop`)                                          |
| `data/`      | Data fetching and filtering (load rates, filter by LTV/BER/buyer type)             |
| `share/`     | URL compression for shareable links (rates, borrowing, breakeven)                  |
| `storage/`   | LocalStorage persistence for form state                                            |
| `export/`    | PDF/Excel/CSV export with lazy-loaded jsPDF and ExcelJS                            |

## Technology Stack

* **Framework:** [Astro](https://astro.build/) with React islands for interactive components
* **UI Library:** [React](https://react.dev/) 19
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) v4
* **Components:** [Radix UI](https://www.radix-ui.com/) primitives (shadcn/ui style)
* **State Management:** [Nanostores](https://github.com/nanostores/nanostores) - lightweight reactive stores
* **Validation:** [Zod](https://zod.dev/) for schema validation
* **Charts:** [Recharts](https://recharts.org/) for data visualization
* **Tables:** [TanStack Table](https://tanstack.com/table) for data tables

## Available Scripts

| Command                    | Description                      |
|----------------------------|----------------------------------|
| `bun run dev`              | Start development server         |
| `bun run build`            | Build for production             |
| `bun run preview`          | Preview production build         |
| `bun run lint`             | Check code with Biome            |
| `bun run lint:fix`         | Auto-fix linting issues          |
| `bun run format`           | Format code with Biome           |
| `bun run test`             | Run tests (watch mode)           |
| `bun run test:unit`        | Run unit tests once              |
| `bun run test:integration` | Run integration tests            |
| `bun run test:e2e`         | Run Playwright E2E tests         |
| `bun run test:run`         | Run unit + integration tests     |
| `bun run test:coverage`    | Run tests with coverage report   |
| `bun run check`            | Lint + typecheck + tests         |

## Testing

Tests use **Vitest** for unit/integration tests. See `TESTING.md` for the full strategy.

### Test Organization

```
src/lib/
├── mortgage/__tests__/     # Payment, APRC, breakeven, overpayment calculations
├── utils/__tests__/        # Currency, date, term, fees, borrowing utilities
├── stores/__tests__/       # Simulation calculation engine
└── share/__tests__/        # URL compression for shareable links

tests/
├── integration/            # Calculator logic (inputs → outputs)
└── e2e/                    # Playwright browser tests
```

### Running Tests

```bash
bun run test              # Watch mode
bun run test:unit         # Unit tests once
bun run test:coverage     # Coverage report
```

### Writing Tests

* Place unit tests in `__tests__/` next to the source file
* Test pure functions in `src/lib/` - avoid testing React components directly
* Use descriptive `describe` blocks for grouping related tests
* Name test files `<source-file>.test.ts`

### E2E Tests (Playwright)

E2E tests use **Playwright** to test full browser flows.

```bash
bun run test:e2e         # Run E2E tests (headless)
bun run test:e2e:ui      # Run with Playwright UI
```

E2E tests live in `tests/e2e/` and use `.spec.ts` extension. The test server runs `bun run preview` automatically.

## Code Style

* **Linter/Formatter:** [Biome](https://biomejs.dev/)
* Run `bun run lint:fix` before committing
* TypeScript with strict mode enabled
* React functional components
* Tailwind CSS for styling

## Image Assets

### Lender Logos

Lender logos are stored in `src/assets/logos/lenders/` as WebP files at 256x256 pixels.
This size supports up to 2x retina displays for the largest usage (72px on home page).

When adding a new lender logo:

```bash
# Convert PNG to 256x256 WebP
convert input.png -resize 256x256 -background none -gravity center -extent 256x256 -quality 85 output.webp
```

### SVG Minification

SVG files are kept in two versions: original (for editing) and minified (for production).
The project uses minified versions (`.min.svg`) in imports.

To create or update minified SVGs:

```bash
# Minify a single SVG
bunx svgo input.svg -o input.min.svg --multipass

# Minify all project SVGs
bunx svgo src/assets/logos/*.svg public/*.svg -o '[name].min.svg' --multipass
```

When adding new SVGs:

1. Add the original SVG file (e.g., `logo.svg`)
2. Create the minified version: `bunx svgo logo.svg -o logo.min.svg --multipass`
3. Import the `.min.svg` version in code

## Rate Scraping

Mortgage rate data is scraped from lender websites and stored in `data/rates/`.

| Command                         | Description                              |
|---------------------------------|------------------------------------------|
| `bun run rates:scrape <lender>`       | Scrape a specific lender                 |
| `bun run rates:scrape:all`            | Scrape all lenders                       |
| `bun run rates:scrape-historical`     | Fetch historical rates from Wayback Machine |
| `bun run rates:validate`              | Validate rate data                       |
| `bun run rates:validate-history`      | Validate history matches current rates   |

### How It Works

1. **Fetch & Parse**: Each provider in `scripts/rate-scraper/providers/` fetches HTML
   from the lender's website and parses rates using Cheerio
2. **Normalize**: Rates are converted to `MortgageRate` objects with consistent
   fields (rate, APR, LTV range, buyer types, BER eligibility)
3. **Hash & Compare**: A SHA256 hash detects actual rate changes vs formatting changes
4. **Validate**: The validator checks for duplicate IDs, invalid LTV limits, and
   missing follow-on rates for fixed products
5. **Store**: Results are saved to `data/rates/<lender>.json` with timestamps

### Rate File Format

```json
{
  "lenderId": "aib",
  "lastScrapedAt": "2026-01-05T08:07:47.510Z",
  "lastUpdatedAt": "2026-01-01T01:15:09.899Z",
  "ratesHash": "999135f7...",
  "rates": [
    {
      "id": "aib-fixed-3yr-50",
      "name": "3 Year Fixed",
      "type": "fixed",
      "rate": 3.45,
      "apr": 3.52,
      "fixedTerm": 3,
      "minLtv": 0,
      "maxLtv": 50,
      "buyerTypes": ["ftb", "mover"],
      "berEligible": ["A1", "A2", "A3"],
      "perks": ["cashback-2pct"]
    }
  ]
}
```

### Rate History

Historical rate changes are tracked in `data/rates/history/`. When rates change,
the scraper stores a diff-based changeset rather than full snapshots.

**History file format** (`data/rates/history/<lender>.json`):

```json
{
  "lenderId": "aib",
  "baseline": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "ratesHash": "abc123...",
    "rates": [/* initial full rate array */]
  },
  "changesets": [
    {
      "timestamp": "2024-03-01T10:30:00.000Z",
      "afterHash": "def456...",
      "operations": [
        { "op": "add", "rate": {/* full rate */} },
        { "op": "remove", "id": "old-rate-id" },
        { "op": "update", "id": "rate-id", "changes": { "id": "rate-id", "rate": 3.5 } }
      ]
    }
  ]
}
```

The validator (`bun run rates:validate-history`) reconstructs rates from baseline +
changesets and verifies they match the current rates file.

### Automated Updates via GitHub Actions

Rates are automatically updated daily via `.github/workflows/sync-rates.yml`:

1. Runs at 8:00 UTC every day (and can be triggered manually)
2. Executes `bun run rates:scrape:all --write-updates`
3. Validates rates and history
4. If rates changed, commits to `main` and triggers a deploy

### Adding a New Lender

1. Create `scripts/rate-scraper/providers/<lender>.ts`
2. Implement the `LenderProvider` interface with a `scrape()` function
3. Register the provider in `scripts/rate-scraper/scrape.ts`
4. Test with `bun run rates:scrape <lender>` and `bun run rates:validate`

## Rates Page

The Rates page (`/rates`) allows users to compare mortgage rates from all lenders.

### How It Works

1. **Data Loading**: On mount, fetches rates from `data/rates/*.json`, lenders from
   `data/lenders.json`, and perks from `data/perks.json`
2. **Filtering**: Users filter by LTV, fixed period, buyer type, BER rating, and lender.
   Filters are applied via `filterRates()` in `src/lib/data/index.ts`
3. **Table Display**: TanStack Table renders the filtered rates with sortable columns,
   pagination, and column visibility toggles
4. **Rate Details**: Clicking a rate opens `RateInfoModal` showing full details,
   monthly payment calculation, and action buttons

### State Management

The Rates page uses several Nanostores:

* `$ratesFormValues` - Form inputs (property value, mortgage amount, term, BER, buyer type)
* `$ratesTableState` - Column visibility, sorting, and filters
* `$storedCustomRates` - User-created custom rates for comparison
* `$compareRates` - Rates selected for side-by-side comparison

### Key Files

| File                                        | Purpose                            |
|---------------------------------------------|------------------------------------|
| `src/pages/rates/index.astro`               | Page layout                        |
| `src/components/rates/RatesInputIsland.tsx` | Form inputs                        |
| `src/components/rates/RatesTableIsland.tsx` | Rate comparison table              |
| `src/components/rates/RateInfoModal.tsx`    | Rate details modal                 |
| `src/components/rates/RateHistoryModal.tsx` | Individual rate history modal      |
| `src/lib/stores/rates-form.ts`              | Form state                         |
| `src/lib/stores/rates-table.ts`             | Table UI state                     |
| `src/lib/data/index.ts`                     | `filterRates()` and data utilities |

## Rate History

The Rate History page (`/rates/history`) tracks historical rate changes from all lenders.

### Features

* **Timeline View**: Chronological list of rate updates grouped by date, filterable by lender
* **Changes View**: Detailed change log showing rate increases/decreases/additions/removals
* **Trends View**: Interactive charts showing rate trends over time with statistics
* View individual rate history from the main rates table via `RateHistoryModal`
* Shareable URLs for specific history views and filters

### How It Works

1. **Data Loading**: Fetches history from `data/rates/history/*.json` on-demand per lender
2. **Reconstruction**: Pure functions reconstruct rate state at any point in time from
   baseline + changesets (see `reconstructRatesAtDate()`)
3. **Time Series**: Extract rate history for trend charts with `getRateTimeSeries()`
4. **Change Detection**: Compare changesets to build detailed change lists with field-level diffs

### State Management

* `$historyByLender` - Cached history data per lender (loaded on-demand)
* `$historyTab` - Active tab (timeline, changes, trends)
* `$historyFilters` - Date range, lender selection, rate type filters
* `$historyTrendsFilters` - Trend-specific filters (selected rates, chart options)

### Key Files

| File                                             | Purpose                              |
|--------------------------------------------------|--------------------------------------|
| `src/pages/rates/history.astro`                  | Page layout with tabs                |
| `src/components/rates/history/RatesUpdatesTimeline.tsx` | Timeline view component       |
| `src/components/rates/history/RateChanges.tsx`   | Changes view component               |
| `src/components/rates/history/RatesTrends.tsx`   | Trends view with charts              |
| `src/components/rates/RateHistoryModal.tsx`      | Individual rate history modal        |
| `src/lib/stores/rates/rates-history.ts`          | History data and query functions     |
| `src/lib/stores/rates/rates-history-filters.ts`  | Filter state for history views       |
| `src/lib/schemas/rate-history.ts`                | Zod schemas for history data         |
| `src/lib/share/rates-history.ts`                 | URL compression for sharing          |

## Simulation

The Simulation page (`/simulate`) models mortgage amortization with rate changes
and overpayments.

### How Calculations Work

The amortization calculation in `src/lib/stores/simulate/simulate-calculations.ts`:

1. **Monthly Loop**: Iterates through each month of the mortgage term
2. **Rate Resolution**: Determines which rate period applies to the current month
   (stack-based: periods are sequential, `durationMonths: 0` means "until end")
3. **Payment Calculation**: Uses standard amortization formula from `src/lib/mortgage/payments.ts`
4. **Overpayment Application**: Applies any configured overpayments for the month
5. **Balance Update**: Subtracts principal + overpayment from remaining balance
6. **Early Termination**: If balance reaches zero, mortgage ends early

The calculation also tracks:

* Interest saved from overpayments
* Months saved from early payoff
* Warnings (overpayment allowance exceeded, early redemption fees)
* Milestones (25%/50%/75% paid off, halfway point)

### Self-Build Mortgages

Self-build mode supports staged drawdowns during construction:

* Balance starts at first drawdown amount, increases as funds are released
* Interest-only payments during construction (on drawn amount only)
* Optional interest-only period after final drawdown
* Full amortization begins after construction/interest-only phase
* "Maximize Overpayment" delays until after full drawdown to avoid allowance issues

Key files: `src/lib/mortgage/self-build.ts`, `src/lib/schemas/simulate.ts` (SelfBuildConfig)

### State Management

Simulation state uses Nanostores with automatic localStorage persistence:

```typescript
$simulationState = {
  input: { mortgageAmount, mortgageTermMonths, propertyValue, ber },
  ratePeriods: RatePeriod[],       // Stack-based: each period follows the previous
  overpaymentConfigs: [],
  initialized: boolean
}
```

Rate periods are stack-based—each period's start month is computed from the
previous periods' durations. A `durationMonths: 0` means "until end of mortgage".

### Key Files

| File                                                    | Purpose                            |
|---------------------------------------------------------|------------------------------------|
| `src/lib/stores/simulate/simulate-state.ts`             | Simulation state and actions       |
| `src/lib/stores/simulate/simulate-calculations.ts`      | Amortization calculations          |
| `src/lib/mortgage/payments.ts`                          | Monthly payment formula            |
| `src/lib/mortgage/overpayments.ts`                      | Overpayment allowance calculations |
| `src/lib/mortgage/self-build.ts`                        | Self-build drawdown logic          |
| `src/components/simulate/chart/`                        | Chart components and shared utils  |
| `src/components/simulate/table/`                        | Monthly/yearly schedule table      |

### Rates Page Integration

The Rates and Simulate pages share data through two patterns:

**Pattern A: Start New Simulation** - When a user clicks "Simulate" on a rate:

1. `RateInfoModal` extracts rate details (lender, rate ID, fixed term)
2. Calls `initializeFromRate()` to create a new simulation
3. For fixed rates, automatically adds the follow-on variable rate
4. Navigates to `/simulate`

**Pattern B: Add to Existing Simulation** - When a user clicks "Add" in Simulate:

1. `SimulateRatesIsland` saves current context (remaining balance, term) to rates form
2. Navigates to `/rates?from=simulate-add#remortgage`
3. `SimulateRedirectAlert` detects the parameter and shows "Add to Simulation" button
4. When clicked, calls `addRatePeriod()` to append the rate
5. Navigates back to `/simulate`

## Compare Simulations

The Compare page (`/simulate/compare`) allows side-by-side comparison of saved simulations.

### Features

* Compare up to 5 simulations simultaneously
* Unified display start date overrides individual simulation dates
* Summary metrics with diff highlighting (green = better, red = worse)
* 5 chart types: Balance, Payments, Cumulative, Rates, Impact
* Expandable yearly/monthly schedule table
* Export to PDF (with/without charts) and Excel
* Shareable comparison URLs

### State Management

* `$compareState` - Selected simulation IDs, display start date
* `$compareSimulationData` - Computed amortization data for each simulation
* `$compareSummaryMetrics` - Key metrics (total interest, term, etc.) with diffs
* `$compareChartSettings` - Active chart type, granularity, visibility toggles

### Key Files

| File                                           | Purpose                              |
|------------------------------------------------|--------------------------------------|
| `src/lib/stores/simulate/simulate-compare.ts`  | Compare state and actions            |
| `src/lib/stores/simulate/simulate-compare-calculations.ts` | Computed comparison data |
| `src/lib/export/compare-export.ts`             | PDF/Excel export for comparisons     |
| `src/lib/share/simulate-compare.ts`            | URL compression for sharing          |
| `src/components/simulate/compare/chart/`       | Chart components (mirrors single sim structure) |
| `src/components/simulate/compare/table/`       | Table components (year/month rows)   |

## Breakeven Calculators

The Breakeven pages (`/breakeven`) help users analyze financial decisions.

### Available Calculators

* **Rent vs Buy** (`/breakeven/rent-vs-buy`) - Compare renting vs buying over time
* **Cashback Comparison** (`/breakeven/cashback`) - Compare mortgages with different rates and cashback offers
* **Remortgage Breakeven** (`/breakeven/remortgage`) - Calculate when switching rates pays off

### How It Works

1. **Input Collection**: User enters scenario details (current rate, new rate, fees, etc.)
2. **Calculation**: `src/lib/mortgage/breakeven.ts` computes breakeven points and projections
3. **Result Display**: `BreakevenResultCard` shows the analysis with charts
4. **Sharing**: Results can be shared via URL compression (same pattern as other pages)

### Key Files

| File                                                  | Purpose                         |
|-------------------------------------------------------|---------------------------------|
| `src/lib/mortgage/breakeven.ts`                       | All breakeven calculations      |
| `src/lib/stores/breakeven.ts`                         | Result state management         |
| `src/components/breakeven/BreakevenResultDialog.tsx`  | Shared dialog wrapper           |
| `src/components/breakeven/ChartLegend.tsx`            | Shared chart legend component   |
| `src/components/breakeven/ChartTooltip.tsx`           | Shared tooltip components       |
| `src/components/breakeven/chart-utils.ts`             | Chart data limiting utilities   |

### Component Structure

Each calculator type has its own subdirectory:

```
src/components/breakeven/
├── BreakevenResultDialog.tsx    # Shared: dialog with export/share buttons
├── ChartLegend.tsx              # Shared: consistent legend styling
├── ChartTooltip.tsx             # Shared: tooltip wrapper and row components
├── chart-utils.ts               # Shared: limitChartData(), formatPeriodLabel()
├── rent-vs-buy/
│   ├── RentVsBuyInputsIsland.tsx
│   ├── RentVsBuyResultIsland.tsx
│   ├── RentVsBuyResultCard.tsx
│   └── chart/
│       ├── NetWorthBreakevenChart.tsx
│       ├── EquityRecoveryChart.tsx
│       └── SaleBreakevenChart.tsx
├── remortgage/
│   ├── RemortgageInputsIsland.tsx
│   ├── RemortgageResultIsland.tsx
│   ├── RemortgageResultCard.tsx
│   └── chart/
│       ├── SavingsBreakevenChart.tsx
│       └── InterestComparisonChart.tsx
└── cashback/
    ├── CashbackInputsIsland.tsx
    ├── CashbackResultIsland.tsx
    ├── CashbackResultCard.tsx
    └── chart/
        └── CashbackComparisonChart.tsx
```

### Shared Components

The breakeven calculators share common UI patterns extracted into reusable components:

- **BreakevenResultDialog**: Wraps AlertDialog with export PDF button and ShareButton
- **ChartLegend**: Renders consistent legend with solid/dashed color indicators
- **ChartTooltip**: Provides `TooltipWrapper`, `TooltipHeader`, `TooltipMetricRow`, `TooltipDifferenceRow`, `TooltipSection`
- **chart-utils.ts**: `limitChartData()` switches between monthly/yearly views based on breakeven timing
