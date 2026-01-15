# src/lib

Business logic layer. Components should be thin - move pure JS functions here.

## Directory Guide

| Directory    | What goes here                                                           |
| ------------ | ------------------------------------------------------------------------ |
| utils/       | Pure helper functions (currency formatting, date transforms, borrowing calcs) |
| mortgage/    | Financial math (payments, APRC, overpayments, breakeven, simulation, self-build) |
| stores/      | Nanostores state management                                              |
| schemas/     | Zod validation schemas (source of truth for types)                       |
| constants/   | Business rules (Central Bank limits, BER ratings)                        |
| data/        | Data fetching from JSON files                                            |
| share/       | URL compression and shareable link generation (rates, borrowing, breakeven, simulate-compare) |
| storage/     | localStorage persistence                                                 |
| hooks/       | React custom hooks (e.g., `useIsDesktop`)                                |
| export/      | PDF/Excel/CSV export (lazy-loaded jsPDF, ExcelJS). Includes share URL in PDFs. |

## Key Patterns

### Nanostores Conventions

- Prefix atoms with `$` (e.g., `$formValues`, `$rates`)
- Computed stores derive from atoms: `$ltv = computed([$property, $mortgage], ...)`
- Actions are plain functions that call `.set()` on atoms

### Currency Precision

Currency stored in **cents** internally (×100) to avoid floating-point errors. Use `parseCurrency()` and `formatCurrency()` for conversion.

### Stack-Based Rate Periods (Simulate)

Rate periods don't store startMonth. Position in array determines start:

- Period 1 starts at month 1
- Period 2 starts after period 1's duration
- `durationMonths: 0` means "until end of mortgage"

### Overpayment Policies

Three types: percentage of balance, percentage of monthly payment, flat amount. Balance-based uses year-start balance, not current.

### Self-Build Simulation

Self-build mortgages have staged drawdowns. Key concepts:

- `SelfBuildConfig` in schemas/simulate.ts defines drawdown stages
- Balance increases during construction as drawdowns occur
- `constructionRepaymentType`: "interest_only" or "interest_and_capital"
- "Maximize Overpayment" starts after final drawdown (avoids allowance issues on partial balance)

## Utils Overview

Don't overlook these - they contain reusable logic:

| File         | Key exports                                                        |
| ------------ | ------------------------------------------------------------------ |
| borrowing.ts | `calculateMaxTermByAge()`, `calculateMortgageMetrics()` (LTV/LTI)  |
| currency.ts  | `formatCurrency()`, `parseCurrency()`, `formatCurrencyShort()` (€100k) |
| date.ts      | `DATE_LOCALE`, `formatShortMonthYear()`, `formatMonthYearShort()`, `formatMonthYear()`, `addMonthsToDateString()` |
| fees.ts      | `calculateStampDuty()` (tiered Irish rates: 1%/2%/6%)              |
| path.ts      | `getPath()` - handles base path for dev vs production              |

## Stores Overview

| File                              | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| rates-form.ts                     | Form inputs (property, mortgage, term) → computed values (LTV, deposit) |
| validation.ts                     | Form validity and error messages (all computed, no atoms) |
| custom-rates.ts                   | User-created rates with localStorage persistence     |
| custom-perks.ts                   | User-created perks with localStorage persistence     |
| breakeven.ts                      | Rent vs Buy and Remortgage breakeven result state    |
| persistence.ts                    | Generic localStorage persistence utilities           |
| simulate/simulate-state.ts        | Simulation inputs and rate periods                   |
| simulate/simulate-calculations.ts | Computed stores (uses pure functions from mortgage/simulation.ts) |
| simulate/simulate-chart.ts        | Chart display state (year range, view options)       |
| simulate/simulate-compare.ts      | Compare state (selected IDs, display start date)     |
| simulate/simulate-compare-calculations.ts | Computed comparison data and metrics        |

## Adding New Logic

1. **Pure calculation?** → mortgage/ or utils/
2. **Data transformation?** → utils/
3. **Reactive state?** → stores/
4. **Validation schema?** → schemas/
5. **Fixed config value?** → constants/

## Testing

Unit tests live in `__tests__/` directories alongside source files. Run with `bun run test:unit`.

### Test File Locations

| Directory             | What's tested                                            |
|-----------------------|----------------------------------------------------------|
| mortgage/__tests__/   | payments, aprc, breakeven, overpayments, simulation      |
| utils/__tests__/      | currency, date, term, fees, borrowing, cn, path          |
| share/__tests__/      | URL compression (common, custom-rates, custom-perks)     |
| stores/simulate/__tests__/ | simulate-compare validation and state                |

### Testing Patterns

- **Roundtrip tests**: For compression functions, test compress → decompress preserves data
- **Boundary tests**: Test edge values (0%, 100% LTV, min/max terms)
- **Precision tests**: Financial calculations should use `toBeCloseTo()` for floating point
- **Type preservation**: Verify booleans, nulls, numbers survive serialization

### Gotchas

- `formatCurrencyInput()` strips decimals - "100.50" becomes "€10,050" (treats `.` as thousands separator)
- `parseCurrency()` with multiple decimals stops at second decimal - "1.234.567" parses as 1.234
- Computed Nanostores (`computed()`) are harder to unit test without mocking the atom dependencies
- Browser-dependent functions (using `window.location`) require mocking or skip in unit tests
