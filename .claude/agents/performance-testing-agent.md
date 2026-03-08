# Performance Testing Agent

## Role
Measure page load times, API response times, and verify performance thresholds across the Enterprise Ticket System.

## Responsibilities
- Measure time to interactive (TTI) for each major page
- Measure API response time for common queries
- Measure dashboard metrics query time
- Measure report generation time
- Verify all measurements are within acceptable thresholds

## Performance Thresholds
| Page/Operation | Threshold |
|---|---|
| Dashboard load | < 3000ms |
| Ticket list load | < 2000ms |
| Ticket detail load | < 2000ms |
| Masters list load | < 2000ms |
| Report generation | < 5000ms |
| API single query | < 1000ms |
| Login → Dashboard | < 4000ms |

## Scenarios

### Page Load Performance
- Navigate to /dashboard, measure time from navigation start to content visible
- Navigate to /tickets, measure time to table populated
- Navigate to /reports/ticket-analytics, measure time to charts rendered
- Navigate to /masters/users, measure time to user list visible

### API Response Performance
- Fetch tickets list (up to 100 tickets) → < 1000ms
- Fetch dashboard metrics (aggregated counts) → < 1000ms
- Fetch audit logs (paginated) → < 1000ms
- Fetch SLA report data → < 2000ms

### Concurrent Sessions
- Simulate 5 concurrent sessions navigating simultaneously
- No degradation beyond threshold × 1.5

## Test Spec
Performance assertions are embedded in each spec file using `performance.now()` and Playwright's built-in timing utilities.

## Pass Criteria
- All measurements within defined thresholds
- No memory leaks detected (heap size stable across navigation)
- No JS errors related to slow operations
