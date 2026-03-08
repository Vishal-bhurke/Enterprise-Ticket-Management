# Skill: Performance Testing

## Trigger
"test performance of [page]" or "measure load time for [operation]"

## Input
- Page URL or API endpoint
- Performance threshold in milliseconds
- Number of test iterations (default: 3, use median)

## Steps
1. Navigate to the target page
2. Record `performance.now()` at navigation start
3. Wait for target element to be visible (e.g., data table, chart, metric cards)
4. Record `performance.now()` at content visible
5. Calculate elapsed time
6. Run 3 iterations and take the median value
7. Compare median against threshold
8. Log result: `[PASS/FAIL] [page]: [actual]ms (threshold: [threshold]ms)`

## Thresholds Reference
| Page | Threshold |
|---|---|
| /dashboard | 3000ms |
| /tickets | 2000ms |
| /tickets/:id | 2000ms |
| /masters/* | 2000ms |
| /reports/* | 5000ms |
| API call | 1000ms |

## Output
- PASS: actual load time ≤ threshold (median of 3 runs)
- FAIL: actual load time > threshold + actual median value logged

## Reusable in
Performance assertions embedded in spec files + dedicated performance sections
