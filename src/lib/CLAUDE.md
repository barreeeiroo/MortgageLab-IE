# src/lib

Business logic layer. Components should be thin - move pure JS functions here.

## Directory Guide

| Directory    | What goes here                                                           |
| ------------ | ------------------------------------------------------------------------ |
| utils/       | Pure helper functions (currency formatting, date transforms, borrowing calcs) |
| mortgage/    | Financial math (monthly payments, APRC, overpayment allowances)          |
| stores/      | Nanostores state management                                              |
| schemas/     | Zod validation schemas (source of truth for types)                       |
| constants/   | Business rules (Central Bank limits, BER ratings)                        |
| data/        | Data fetching from JSON files                                            |
| share/       | URL compression for shareable links                                      |
| storage/     | localStorage persistence                                                 |

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

## Utils Overview

Don't overlook these - they contain reusable logic:

| File         | Key exports                                                        |
| ------------ | ------------------------------------------------------------------ |
| borrowing.ts | `calculateMaxTermByAge()`, `calculateMortgageMetrics()` (LTV/LTI)  |
| currency.ts  | `formatCurrency()`, `parseCurrency()`, `formatCurrencyShort()` (€100k) |
| date.ts      | `calculateAge()`, `formatMonthYear()`, `formatIncrementalPeriod()` |
| fees.ts      | `calculateStampDuty()` (tiered Irish rates: 1%/2%/6%)              |
| path.ts      | `getPath()` - handles base path for dev vs production              |

## Stores Overview

| File                           | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| rates-form.ts                  | Form inputs (property, mortgage, term) → computed values (LTV, deposit) |
| validation.ts                  | Form validity and error messages (all computed, no atoms) |
| custom-rates.ts                | User-created rates with localStorage persistence     |
| simulate/simulate-state.ts     | Simulation inputs and rate periods                   |
| simulate/simulate-calculations.ts | Amortization schedule derivation                  |

## Adding New Logic

1. **Pure calculation?** → mortgage/ or utils/
2. **Data transformation?** → utils/
3. **Reactive state?** → stores/
4. **Validation schema?** → schemas/
5. **Fixed config value?** → constants/
