import yfinance as yf, sys, json
symbol = sys.argv[1] if len(sys.argv) > 1 else 'RELIANCE'
try:
    t = yf.Ticker(f"{symbol}.NS")
    news = t.news
    if not news:
        news = []
    articles = []
    for item in news[:5]:
        if isinstance(item, dict):
            content = item.get("content") or item
            articles.append({
                "headline": content.get("title", item.get("title", "")),
                "source": content.get("publisher", item.get("publisher", "Yahoo Finance")),
                "time": content.get("pubDate", item.get("pubDate", content.get("providerPublishTime", ""))),
                "link": content.get("canonicalUrl", {}).get("url", content.get("url", item.get("link", ""))) if isinstance(content.get("canonicalUrl"), dict) else content.get("url", item.get("link", "")),
            })
    if articles:
        print(json.dumps(articles))
    else:
        sys.exit(1)
except Exception as e:
    sys.exit(1)
