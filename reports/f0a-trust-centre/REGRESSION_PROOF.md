# F0A Regression Proof

## Regression Guard

`src/pages/TrustCentrePage.test.tsx` includes a failed-request regression test:

```ts
it("renders error state and no fabricated values after API failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

  render(<TrustCentrePage />);

  await screen.findByText("Data state: error");
  expect(screen.getAllByText("Data unavailable").length).toBeGreaterThanOrEqual(6);
  for (const value of oldStaticValues) {
    expect(screen.queryByText(value)).toBeNull();
  }
});
```

The forbidden static values are:

- `0.12`
- `0.68`
- `1.85`
- `0.72`
- `106,920`
- `493,200`

## Static Scan Evidence

The only remaining references to the old values are inside the regression test denylist:

```text
src/pages/TrustCentrePage.test.tsx:5:const oldStaticValues = ["0.12", "0.68", "1.85", "0.72", "106,920", "493,200"];
```

No old static values remain in `src/pages/TrustCentrePage.tsx`.

## Route Envelope Proof

`src/backend/web/routes/__tests__/intelligence.trustMetrics.test.ts` verifies that the backend route:

- returns `status`
- returns `dataState`
- mirrors `asOf`
- mirrors `lineage`
- mirrors `missingInputs`
- returns `isSynthetic: false`
- returns `isFallback: false`
- returns null metric fields on query failure instead of fallback numbers

## Focused Test Result

```bash
npm run test:unit -- src/pages/TrustCentrePage.test.tsx src/backend/web/routes/__tests__/intelligence.trustMetrics.test.ts
```

```text
Test Files  2 passed (2)
Tests  9 passed (9)
```
