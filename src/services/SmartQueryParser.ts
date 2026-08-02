interface ParsedQuery {
  pe?: { operator: string; value: number };
  roe?: { operator: string; value: number };
  pb?: { operator: string; value: number };
  volume?: { operator: string; value: number };
  marketCap?: { operator: string; value: number };
  dividend?: { operator: string; value: number };
  industry?: string;
  confidence: number;
}

export class SmartQueryParser {
  static parseQuery(query: string): ParsedQuery {
    const result: ParsedQuery = { confidence: 1.0 };
    const lowerQuery = query.toLowerCase();

    const pePatterns = [
      /p\/e\s*(?:under|less than|<|below)\s*(\d+(?:\.\d+)?)/i,
      /pe\s*(?:ratio)?\s*(?:under|less than|<|below)\s*(\d+(?:\.\d+)?)/i,
      /(?:with\s+)?p\/e\s*of\s*(?:under|less than)\s*(\d+(?:\.\d+)?)/i,
    ];

    for (const pattern of pePatterns) {
      const match = query.match(pattern);
      if (match) {
        result.pe = { operator: '<', value: parseFloat(match[1]) };
        break;
      }
    }

    const pbPatterns = [
      /p\/b\s*(?:under|less than|<)\s*(\d+(?:\.\d+)?)/i,
      /pb\s*(?:under|less than|<)\s*(\d+(?:\.\d+)?)/i,
    ];

    for (const pattern of pbPatterns) {
      const match = query.match(pattern);
      if (match) {
        result.pb = { operator: '<', value: parseFloat(match[1]) };
        break;
      }
    }

    const roePatterns = [
      /roe\s*(?:over|greater than|>|above)\s*(\d+)%?/i,
      /return\s*on\s*equity\s*(?:over|greater than|>)\s*(\d+)%?/i,
    ];

    for (const pattern of roePatterns) {
      const match = query.match(pattern);
      if (match) {
        result.roe = { operator: '>', value: parseInt(match[1]) };
        break;
      }
    }

    const volPatterns = [
      /volume\s*(?:over|greater than|>|above)\s*(\d+(?:\.\d+)?)\s*([mk])?/i,
      /(?:trading\s+)?volume\s*(?:of\s+)?(?:over|greater than|>)\s*(\d+(?:\.\d+)?)\s*([mk])?/i,
    ];

    for (const pattern of volPatterns) {
      const match = query.match(pattern);
      if (match) {
        let volume = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase();
        if (unit === 'm') volume *= 1_000_000;
        else if (unit === 'k') volume *= 1_000;
        result.volume = { operator: '>', value: volume };
        break;
      }
    }

    const mcapPatterns = [
      /market\s*cap\s*(?:over|greater than|>|above)\s*(?:₱\s*)?(\d+(?:\.\d+)?)\s*([lct])?/i,
      /m\.?cap\s*(?:over|greater than|>)\s*₱\s*(\d+(?:\.\d+)?)\s*([lct])?/i,
    ];

    for (const pattern of mcapPatterns) {
      const match = query.match(pattern);
      if (match) {
        let mcap = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase();
        if (unit === 'l') mcap *= 100_000;
        else if (unit === 'c') mcap *= 10_000_000;
        else if (unit === 't') mcap *= 1_000_000_000_000;
        result.marketCap = { operator: '>', value: mcap };
        break;
      }
    }

    const sectorPatterns = [
      /(?:in|sector|industry)\s*(?:like|of|is)\s*(\w+(?:\s+\w+)*)/i,
      /(\w+(?:\s+\w+)?)\s+stocks/i,
    ];

    for (const pattern of sectorPatterns) {
      const match = query.match(pattern);
      if (match) {
        result.industry = match[1].trim();
        break;
      }
    }

    const divPatterns = [
      /dividend\s*(?:yield)?\s*(?:over|>|above)\s*(\d+)%?/i,
      /paying\s*(?:at\s+)?least\s*(\d+)%\s*dividend/i,
    ];

    for (const pattern of divPatterns) {
      const match = query.match(pattern);
      if (match) {
        result.dividend = { operator: '>', value: parseInt(match[1]) };
        break;
      }
    }

    const parsedFieldCount = Object.keys(result).filter(k => k !== 'confidence').length;
    if (parsedFieldCount < 2) {
      result.confidence = 0.5;
    }

    return result;
  }

  static canHandleWithRegexOnly(query: string): boolean {
    const parsed = this.parseQuery(query);
    return parsed.confidence >= 0.9;
  }
}

export const smartParser = new SmartQueryParser();
