# Agent G — Trust Centre Automation

## Live Metrics (from database, not hardcoded)
- **365d Hit Rate**: Source = SELECT from alpha_research_registry WHERE horizon=365, Refresh = daily
- **Cheap Quality Hit Rate**: Source = JOIN quality_registry WHERE PE<15 AND ROE>15, Refresh = daily
- **Total Predictions**: Source = COUNT from alpha_research_registry, Refresh = realtime
- **Model Version**: Source = model_registry.current, Refresh = on-deploy

## No manual numbers. All metrics computed from alpha_research_registry queries.
