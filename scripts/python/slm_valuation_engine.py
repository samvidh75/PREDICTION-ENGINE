"""
Valuation Engine: Assesses whether a stock is cheap or expensive relative to peers.

Factors:
- P/E Ratio relative to sector median
- P/B Ratio
- EV/EBITDA multiple
- Dividend Yield
"""

from typing import Dict


class ValuationEngine:
    def __init__(self):
        self.sector_pe_medians = {
            'IT': 25,
            'Pharma': 20,
            'Auto': 18,
            'Banking': 15,
            'FMCG': 35,
            'Energy': 12
        }

    def calculate_valuation_score(self, fundamentals: Dict) -> Dict:
        pe = fundamentals.get('pe', 0)
        pb = fundamentals.get('pb', 0)
        ev_ebitda = fundamentals.get('ev_ebitda', 0)
        sector = fundamentals.get('sector', 'General')
        dividend_yield = fundamentals.get('dividend_yield', 0)

        sector_pe = self.sector_pe_medians.get(sector, 20)

        pe_score = self._score_pe(pe, sector_pe)
        pb_score = self._score_pb(pb)
        ev_ebitda_score = self._score_ev_ebitda(ev_ebitda)
        div_score = self._score_dividend(dividend_yield)

        valuation_score = (
            pe_score * 0.40
            + pb_score * 0.30
            + ev_ebitda_score * 0.20
            + div_score * 0.10
        )

        return {
            'valuation_score': int(valuation_score),
            'pe_score': pe_score,
            'pb_score': pb_score,
            'ev_ebitda_score': ev_ebitda_score,
            'dividend_score': div_score,
            'components': {
                'pe': pe,
                'sector_median_pe': sector_pe,
                'pb': pb,
                'ev_ebitda': ev_ebitda,
                'dividend_yield': dividend_yield
            }
        }

    def _score_pe(self, pe: float, sector_median: float) -> float:
        pe_ratio = pe / sector_median if sector_median > 0 else 1

        if pe_ratio < 0.6:
            return 95
        elif pe_ratio < 0.8:
            return 80
        elif pe_ratio < 1.0:
            return 65
        elif pe_ratio < 1.2:
            return 50
        elif pe_ratio < 1.5:
            return 30
        else:
            return 10

    def _score_pb(self, pb: float) -> float:
        if pb < 1.0:
            return 85
        elif pb < 1.5:
            return 70
        elif pb < 2.0:
            return 55
        elif pb < 3.0:
            return 35
        else:
            return 15

    def _score_ev_ebitda(self, ev_ebitda: float) -> float:
        if ev_ebitda < 8:
            return 80
        elif ev_ebitda < 12:
            return 65
        elif ev_ebitda < 15:
            return 50
        elif ev_ebitda < 20:
            return 35
        else:
            return 15

    def _score_dividend(self, yield_pct: float) -> float:
        if yield_pct < 0.5:
            return 30
        elif yield_pct < 1.5:
            return 60
        elif yield_pct < 3.0:
            return 80
        else:
            return min(100, 90 + (yield_pct - 3) * 2)
