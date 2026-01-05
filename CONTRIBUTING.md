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
| `mortgage/`  | Financial calculations (monthly payments, APRC, overpayments)                      |
| `utils/`     | Helper functions (currency formatting, date handling, borrowing calculations)      |
| `hooks/`     | React custom hooks (e.g., `useIsDesktop`)                                          |
| `data/`      | Data fetching and filtering (load rates, filter by LTV/BER/buyer type)             |
| `share/`     | URL compression for shareable links (LZ-string encoding)                           |
| `storage/`   | LocalStorage persistence for form state                                            |

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

| Command            | Description              |
|--------------------|--------------------------|
| `bun run dev`      | Start development server |
| `bun run build`    | Build for production     |
| `bun run preview`  | Preview production build |
| `bun run lint`     | Check code with Biome    |
| `bun run lint:fix` | Auto-fix linting issues  |
| `bun run format`   | Format code with Biome   |
| `bun run test`     | Run tests (watch mode)   |
| `bun run test:run` | Run tests once           |

## Code Style

* **Linter/Formatter:** [Biome](https://biomejs.dev/)
* Run `bun run lint:fix` before committing
* TypeScript with strict mode enabled
* React functional components
* Tailwind CSS for styling

## Rate Scraping

Mortgage rate data is scraped from lender websites and stored in `data/rates/`.

| Command                         | Description              |
|---------------------------------|--------------------------|
| `bun run rates:scrape <lender>` | Scrape a specific lender |
| `bun run rates:scrape-all`      | Scrape all lenders       |
| `bun run rates:validate`        | Validate rate data       |

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

### Automated Updates via GitHub Actions

Rates are automatically updated daily via `.github/workflows/sync-rates.yml`:

1. Runs at 8:00 UTC every day (and can be triggered manually)
2. Executes `bun run rates:scrape-all --write-updates`
3. If rates changed, commits to `main` and triggers a deploy

### Adding a New Lender

1. Create `scripts/rate-scraper/providers/<lender>.ts`
2. Implement the `LenderProvider` interface with a `scrape()` function
3. Register the provider in `scripts/rate-scraper/index.ts`
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
| `src/pages/rates.astro`                     | Page layout                        |
| `src/components/rates/RatesInputIsland.tsx` | Form inputs                        |
| `src/components/rates/RatesTableIsland.tsx` | Rate comparison table              |
| `src/components/rates/RateInfoModal.tsx`    | Rate details modal                 |
| `src/lib/stores/rates-form.ts`              | Form state                         |
| `src/lib/stores/rates-table.ts`             | Table UI state                     |
| `src/lib/data/index.ts`                     | `filterRates()` and data utilities |

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
* Warnings (overpayment allowance exceeded, rate gaps, early redemption fees)
* Milestones (25%/50%/75% paid off, halfway point)

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

| File                                               | Purpose                            |
|----------------------------------------------------|------------------------------------|
| `src/lib/stores/simulate/simulate-state.ts`        | Simulation state and actions       |
| `src/lib/stores/simulate/simulate-calculations.ts` | Amortization calculations          |
| `src/lib/mortgage/payments.ts`                     | Monthly payment formula            |
| `src/lib/mortgage/overpayments.ts`                 | Overpayment allowance calculations |
| `src/components/simulate/SimulateChartIsland.tsx`  | Amortization chart                 |
| `src/components/simulate/SimulateTableIsland.tsx`  | Monthly/yearly schedule table      |

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
