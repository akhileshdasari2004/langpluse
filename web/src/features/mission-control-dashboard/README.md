# Mission Control dashboard

This feature owns the operational landing dashboard for AI agent execution.

- `hooks/` owns the project-scoped, periodically refreshed dashboard query.
- `lib/` owns display definitions and pure data-to-chart transformations.
- `components/` owns reusable dashboard cards and preset renderers.
- The existing dashboard preset registry owns placement integration.

The dashboard uses the seeded Enterprise Sales Email workflow until production
execution aggregations are connected. The API response names that source
explicitly; UI components do not imply that seeded values are production
telemetry.
