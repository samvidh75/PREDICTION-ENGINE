import type { VercelRequest, VercelResponse } from '@vercel/node'

const NEWS_CACHE = new Map<string, { items: NewsItem[]; expiresAt: number }>()
const NEWS_CACHE_TTL = 12 * 60 * 60 * 1000

interface NewsItem {
  title: string
  source: string
  date: string
  link: string
  snippet: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol
  const symbol = String(rawSymbol ?? '').toUpperCase().trim()
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  const cached = NEWS_CACHE.get(symbol)
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('X-Cache', 'HIT')
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=3600')
    return res.status(200).json({ symbol, items: cached.items, cachedAt: new Date(cached.expiresAt - NEWS_CACHE_TTL).toISOString() })
  }

  const items: NewsItem[] = []
  const seen = new Set<string>()

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(symbol + ' stock NSE India')}&hl=en-IN&gl=IN`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 StockStory/2.0' },
      signal: AbortSignal.timeout(8000),
    })

    if (response.ok) {
      const xml = await response.text()
      const titleRegex = /<title>(.*?)<\/title>/g
      const linkRegex = /<link>(.*?)<\/link>/g
      const dates: string[] = []

      let m: RegExpExecArray | null
      const titles: string[] = []
      const links: string[] = []

      while ((m = titleRegex.exec(xml)) !== null) {
        const t = m[1].trim()
        if (!t || t.includes('Google News')) continue
        if (titles.length > 15) break
        titles.push(t)
      }

      while ((m = linkRegex.exec(xml)) !== null) {
        const l = m[1].trim()
        if (l && !l.includes('google.com/news')) links.push(l)
        if (links.length > 15) break
      }

      titles.forEach((title, i) => {
        const dedupKey = title.toLowerCase().trim().slice(0, 60)
        if (seen.has(dedupKey) || items.length >= 10) return
        seen.add(dedupKey)

        const sourceMatch = title.match(/[-–—|]\s*(.*?)(\s*[-–—|]\s*|$)/)
        const source = sourceMatch ? sourceMatch[1].trim() : 'News'
        const cleanTitle = title.replace(/[-–—|].*$/, '').trim()

        items.push({
          title: cleanTitle,
          source,
          date: new Date().toISOString().split('T')[0],
          link: links[i] || '#',
          snippet: '',
        })
      })
    }
  } catch {
    // News unavailable — return empty array
  }

  NEWS_CACHE.set(symbol, { items, expiresAt: Date.now() + NEWS_CACHE_TTL })

  res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=3600')
  return res.status(200).json({
    symbol,
    items,
    cachedAt: new Date().toISOString(),
  })
}
