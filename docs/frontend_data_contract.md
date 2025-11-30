# Static Fallback Contract

## Data Layers

1. API: `/api/...`
2. Static fallback: `public/data/*.json`
3. UI: React

## Files

### public/data/metrics.json

- Fallback for `/api/v1/leverage`
- Schema must match backend response

### public/data/valuation.json

- Fallback for `/api/v1/valuation`
- Schema must match backend response