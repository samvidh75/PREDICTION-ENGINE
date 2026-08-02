"""
MasterDatasetBuilder — Indian Stock Market Training Dataset Engine
==================================================================
Extracts raw financial context, maps to structured training nodes,
and exports to fine-tuning format compatible with Unsloth.

Usage:
    python dataset_builder.py
    Produces master_indian_market_train.json
"""

import json
import os
import random
from datetime import datetime


class MasterDatasetBuilder:
    def __init__(self, output_path="master_indian_market_train.json"):
        self.output_path = output_path
        self.training_pool = []

    def _has_adverse_audit(self, notes):
        lower = notes.lower()
        if "clean" in lower or "best-in-class" in lower or "no material" in lower or "unqualified" in lower or "robust" in lower:
            return False
        for keyword in ["going concern", "resignation", "multi-layered shell", "related party", "flagged"]:
            if keyword in lower:
                return True
        return False

    def _is_clean_audit(self, notes):
        lower = notes.lower()
        for phrase in ["clean", "best-in-class", "robust internal controls", "consistent"]:
            if phrase in lower:
                return True
        return False

    def compile_fundamental_node(self, ticker, balance_sheet_dict, auditor_notes, sector=""):
        instruction = "Evaluate corporate governance and fundamental sustainability for an Indian equity."
        pe = balance_sheet_dict.get("pe", 0)
        debt_to_equity = balance_sheet_dict.get("debt_to_equity", 0)
        promoter_pledge = balance_sheet_dict.get("promoter_pledged_pct", 0)
        roce = balance_sheet_dict.get("roce", 0)
        revenue_growth = balance_sheet_dict.get("revenue_growth", 0)

        input_context = (
            f"Ticker: {ticker} | Sector: {sector} | P/E: {pe} | Debt/Equity: {debt_to_equity} | "
            f"Promoter Pledging: {promoter_pledge}% | ROCE: {roce}% | Revenue Growth: {revenue_growth}% | "
            f"Auditor Commentary: {auditor_notes}"
        )

        adverse = self._has_adverse_audit(auditor_notes)
        clean = self._is_clean_audit(auditor_notes)

        if promoter_pledge > 40 or adverse:
            score = 25
            risk = "Severe"
            reasons = []
            if promoter_pledge > 40:
                reasons.append(f"High promoter pledging ({promoter_pledge}%)")
            if adverse:
                reasons.append("adverse auditor commentary")
            narrative = (
                f"{ticker} exhibits critical corporate governance warnings. "
                f"{' and '.join(reasons)} signals high probability of institutional capital flight."
            )
        elif debt_to_equity > 2.0 and revenue_growth < 5:
            score = 45
            risk = "Elevated"
            narrative = (
                f"{ticker} carries elevated financial leverage with slowing revenue momentum. "
                f"Debt servicing costs may pressure margins in a rising rate environment."
            )
        elif roce > 20 and debt_to_equity < 1.0 and promoter_pledge < 10 and (clean or revenue_growth > 0):
            score = 85
            risk = "Managed"
            narrative = (
                f"{ticker} demonstrates a stable fundamental core with strong capital efficiency. "
                f"Return on capital employed at {roce}% with unencumbered promoter equity holding structures."
            )
        elif roce > 16 and debt_to_equity < 0.5 and promoter_pledge == 0 and clean:
            score = 78
            risk = "Low"
            narrative = (
                f"{ticker} shows solid fundamentals with efficient capital allocation and "
                f"clean audit assurance. "
            )
        else:
            score = 68
            risk = "Moderate"
            narrative = (
                f"{ticker} maintains moderate fundamental positioning with balanced financial leverage. "
                f"Operational metrics are within acceptable ranges for the sector."
            )

        output_response = f"{narrative}Calculated Healthometer: {score}/100. Risk: {risk}."
        self._append_to_pool(instruction, input_context, output_response)

    def compile_technical_anomaly_node(self, ticker, ohlc_history, order_flow_notes, sector=""):
        instruction = "Analyze technical price structures and institutional order flow anomalies on the NSE."

        df = [{"close": c, "volume": v} for c, v in ohlc_history]
        current_price = df[-1]["close"]
        avg_vol = sum(d["volume"] for d in df) / len(df)
        last_vol = df[-1]["volume"]
        vol_expansion = round(last_vol / (avg_vol + 1e-9), 1)
        avg_price_5 = sum(d["close"] for d in df[-5:]) / min(5, len(df))

        delivery_pct = order_flow_notes.get("delivery_pct", 0)
        notes = order_flow_notes.get("notes", "").lower()
        block_deal = "block deal" in notes
        bulk_deal = "bulk deal" in notes
        insider_selling = "insider selling" in notes or "profit booking" in notes or "reducing" in notes
        accumulation = "accumulation" in notes or "increased allocation" in notes or "buying streak" in notes or "buying" in notes
        distribution = "delivery selling" in notes or "net sellers" in notes or "reduced stake" in notes

        input_context = (
            f"Ticker: {ticker} | Sector: {sector} | Last Price: {current_price} | "
            f"Volume Expansion: {vol_expansion}x | Delivery %: {delivery_pct}% | "
            f"Order Flow: {order_flow_notes.get('notes', '')}"
        )

        if block_deal and vol_expansion > 2.0 and delivery_pct > 60:
            output_response = (
                f"{ticker} indicates significant institutional accumulation. The {vol_expansion}x volume "
                f"breakout is directly validated by block deal footprints and high delivery percentage "
                f"({delivery_pct}%), confirming a strong structural support floor. "
                f"Calculated Healthometer: 82/100. Conviction: Strong."
            )
        elif accumulation and (vol_expansion > 1.5 or delivery_pct > 70):
            output_response = (
                f"{ticker} shows strong institutional accumulation with elevated delivery "
                f"({delivery_pct}%) and volume expansion of {vol_expansion}x. Momentum likely to sustain. "
                f"Calculated Healthometer: 75/100. Conviction: Moderate-High."
            )
        elif distribution and (delivery_pct < 35 or current_price < avg_price_5):
            output_response = (
                f"{ticker} exhibits distribution by institutional holders. Low delivery percentage "
                f"({delivery_pct}%) combined with declining price action indicates weak hands. "
                f"Calculated Healthometer: 35/100. Conviction: Low."
            )
        elif insider_selling and delivery_pct < 40:
            output_response = (
                f"{ticker} shows insider selling with declining delivery quality. "
                f"Promoter or early investor profit booking suggests limited near-term upside. "
                f"Calculated Healthometer: 40/100. Conviction: Cautious."
            )
        elif vol_expansion < 0.6 and current_price < avg_price_5:
            output_response = (
                f"{ticker} exhibits contracting volumes and declining price action, indicating distribution "
                f"by institutional holders. Lack of participation signals weak hands. "
                f"Calculated Healthometer: 35/100. Conviction: Low."
            )
        else:
            output_response = (
                f"{ticker} maintains routine technical distribution with standard volume profiles. "
                f"No major institutional liquidity walls or order book imbalances detected. "
                f"Calculated Healthometer: 60/100. Conviction: Neutral."
            )

        self._append_to_pool(instruction, input_context, output_response)

    def compile_regulatory_node(self, sector, sebi_circular_text, impacted_tickers):
        instruction = "Assess the structural impact of a SEBI regulatory circular on market mechanics."
        input_context = f"Sector: {sector} | SEBI Action: {sebi_circular_text} | Impacted Assets: {impacted_tickers}"

        lower_text = sebi_circular_text.lower()
        if "ban" in lower_text or "restrict" in lower_text or "surveillance" in lower_text:
            output_response = (
                f"The unexpected SEBI regulatory intervention instantly shifts sector dynamics for {sector}. "
                f"Imposing strict margin ceilings or altered indexing parameters compresses short-term "
                f"speculative volume across {impacted_tickers}, forcing institutional capital reallocation. "
                f"Calculated Healthometer for affected names: 30/100. Elevated caution advised."
            )
        elif "liberalise" in lower_text or "relax" in lower_text or "permit" in lower_text:
            output_response = (
                f"SEBI's deregulatory step expands the addressable opportunity for {impacted_tickers} in {sector}. "
                f"Lower compliance burdens and relaxed operating norms are likely to attract increased "
                f"retail and institutional participation. "
                f"Calculated Healthometer for affected names: 75/100. Constructive outlook."
            )
        elif "mandate" in lower_text or "require" in lower_text:
            output_response = (
                f"This SEBI circular introduces procedural compliance requirements for {sector}. "
                f"While the intent is structural improvement, near-term compliance costs may create headwinds. "
                f"Calculated Healthometer for affected names: 55/100. Neutral near-term."
            )
        else:
            output_response = (
                f"This SEBI circular introduces procedural changes to {sector} market mechanics. "
                f"Market participants will require 2-3 trading sessions to fully price in the new "
                f"operating parameters. Calculated Healthometer: 55/100. Neutral near-term."
            )

        self._append_to_pool(instruction, input_context, output_response)

    def compile_sector_rotation_node(self, sector, macro_data, fii_dii_flow):
        instruction = "Analyze sector rotation dynamics and capital flow trends in Indian markets."
        fii = fii_dii_flow.get("fii", "Neutral")
        dii = fii_dii_flow.get("dii", "Neutral")

        input_context = (
            f"Sector: {sector} | FII Flow: {fii} | "
            f"DII Flow: {dii} | "
            f"Macro Trigger: {macro_data}"
        )

        if fii == "Buying" and dii == "Buying":
            output_response = (
                f"Broad-based institutional accumulation detected in {sector}. Both FII and DII "
                f"participation signals strong conviction. Sector likely to outperform over the next quarter. "
                f"Calculated Healthometer: 80/100. Conviction: High."
            )
        elif fii == "Selling" and dii == "Selling":
            output_response = (
                f"Broad-based institutional distribution detected in {sector}. Both FII and DII "
                f"reducing exposure suggests sector headwinds. Avoid until reversal signals emerge. "
                f"Calculated Healthometer: 30/100. Conviction: Low."
            )
        elif fii == "Selling" and dii == "Buying":
            output_response = (
                f"Divergent capital flows in {sector}: FIIs reducing exposure while domestic institutions "
                f"absorb supply. This pattern historically leads to sector consolidation before a recovery. "
                f"Calculated Healthometer: 55/100. Conviction: Cautious."
            )
        elif fii == "Buying" and dii == "Neutral":
            output_response = (
                f"Selective FII buying detected in {sector} while DIIs remain on the sidelines. "
                f"Foreign institutional interest may signal early-stage recovery. "
                f"Calculated Healthometer: 70/100. Conviction: Moderate."
            )
        else:
            output_response = (
                f"Mixed institutional activity in {sector}. Capital flows are evenly balanced, suggesting "
                f"stock-specific rather than sector-wide conviction. "
                f"Calculated Healthometer: 65/100."
            )

        self._append_to_pool(instruction, input_context, output_response)

    def compile_earnings_node(self, ticker, earnings_data, sector=""):
        instruction = "Analyze quarterly earnings performance and management commentary for an Indian equity."
        beat_miss = earnings_data.get("result", "Inline")
        revenue_growth = earnings_data.get("revenue_growth", 0)
        margin_change = earnings_data.get("margin_change", 0)
        guidance = earnings_data.get("guidance", "Maintained")
        commentary = earnings_data.get("commentary", "Standard")

        input_context = (
            f"Ticker: {ticker} | Sector: {sector} | Result: {beat_miss} | "
            f"Revenue Growth: {revenue_growth}% | Margin Change: {margin_change}bps | "
            f"Guidance: {guidance} | Management Commentary: {commentary}"
        )

        if beat_miss == "Beat" and revenue_growth > 15 and margin_change > 100:
            output_response = (
                f"{ticker} delivered a strong earnings beat with accelerating revenue (+{revenue_growth}%) "
                f"and significant margin expansion (+{margin_change}bps). Management commentary confident "
                f"and guidance raised. Calculated Healthometer: 88/100. Upgrade expected."
            )
        elif beat_miss == "Beat" and revenue_growth > 10:
            output_response = (
                f"{ticker} reported a solid earnings beat with revenue growth of {revenue_growth}% "
                f"and margin improvement. Management guidance positive. "
                f"Calculated Healthometer: 78/100. Outlook positive."
            )
        elif beat_miss == "Miss" and revenue_growth < 3:
            output_response = (
                f"{ticker} reported a significant earnings miss with sluggish revenue (+{revenue_growth}%) "
                f"and margin compression ({margin_change}bps). Guidance cut compounds concerns. "
                f"Calculated Healthometer: 30/100. De-rating risk."
            )
        elif beat_miss == "Miss":
            output_response = (
                f"{ticker} missed expectations with moderate revenue growth ({revenue_growth}%) "
                f"and margin headwinds ({margin_change}bps). Execution concerns remain. "
                f"Calculated Healthometer: 50/100. Risk of downgrade."
            )
        else:
            output_response = (
                f"{ticker} reported inline results with steady operational performance. "
                f"Calculated Healthometer: 65/100. No material revision expected."
            )

        self._append_to_pool(instruction, input_context, output_response)

    def compile_corporate_action_node(self, ticker, action_type, details, sector=""):
        instruction = "Evaluate the impact of a corporate action on shareholder value."
        input_context = f"Ticker: {ticker} | Sector: {sector} | Action: {action_type} | Details: {details}"

        action_lower = action_type.lower()

        if "buyback" in action_lower:
            output_response = (
                f"{ticker}'s buyback signals management confidence in intrinsic value. "
                f"The share repurchase at a premium reduces outstanding equity and signals undervaluation. "
                f"Calculated Healthometer: 78/100. Positive signal."
            )
        elif "dividend" in action_lower:
            output_response = (
                f"{ticker}'s dividend declaration reflects strong cash generation and shareholder-friendly "
                f"capital allocation policy. Consistent payout history reinforces income profile. "
                f"Calculated Healthometer: 75/100. Positive signal."
            )
        elif "rights issue" in action_lower:
            output_response = (
                f"{ticker}'s rights issue creates near-term dilution for existing shareholders. "
                f"While the capital raise strengthens the balance sheet, execution risk exists. "
                f"Calculated Healthometer: 45/100. Monitor execution."
            )
        elif "stock split" in action_lower:
            output_response = (
                f"{ticker}'s stock split improves retail accessibility and liquidity. "
                f"No fundamental value change, but often signals management confidence in sustained growth. "
                f"Calculated Healthometer: 60/100. Neutral."
            )
        elif "bonus issue" in action_lower:
            output_response = (
                f"{ticker}'s bonus issue rewards existing shareholders from accumulated reserves. "
                f"Reflects strong retained earnings but does not create economic value. "
                f"Calculated Healthometer: 60/100. Neutral."
            )
        else:
            output_response = (
                f"{ticker}'s {action_type} has moderate implications. "
                f"The strategic rationale aligns with long-term objectives. "
                f"Calculated Healthometer: 60/100."
            )

        self._append_to_pool(instruction, input_context, output_response)

    def _append_to_pool(self, instruction, input_str, output_str):
        self.training_pool.append({
            "instruction": instruction,
            "input": input_str,
            "output": output_str
        })

    def export_dataset(self):
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(self.training_pool, f, indent=2, ensure_ascii=False)
        print(f"Generated {len(self.training_pool)} training rows in {self.output_path}")
        return self.training_pool


def generate_master_dataset():
    """Generate a comprehensive master training dataset."""
    builder = MasterDatasetBuilder(output_path="master_indian_market_train.json")

    # ── Fundamental Nodes (21) ──────────────────────────
    fundamental_cases = [
        ("RELIANCE", {"pe": 32.4, "debt_to_equity": 0.8, "promoter_pledged_pct": 0, "roce": 16.2, "revenue_growth": 12}, "Standard audit opinion. All entities consolidated.", "Energy/Telco/Retail"),
        ("TATAMOTORS", {"pe": 28.5, "debt_to_equity": 1.2, "promoter_pledged_pct": 0, "roce": 14.8, "revenue_growth": 18}, "Audit opinion unqualified. JLR subsidiary audited separately.", "Auto"),
        ("ADANIENT", {"pe": 45.2, "debt_to_equity": 1.8, "promoter_pledged_pct": 52.4, "roce": 8.5, "revenue_growth": 22}, "Auditor noted multi-layered shell entities handling capital distribution streams.", "Diversified"),
        ("HDFCBANK", {"pe": 18.2, "debt_to_equity": 0.4, "promoter_pledged_pct": 0, "roce": 14.5, "revenue_growth": 16}, "Clean audit report. Provisioning coverage maintained at 74%.", "Banking"),
        ("INFY", {"pe": 22.1, "debt_to_equity": 0.1, "promoter_pledged_pct": 0, "roce": 32.4, "revenue_growth": 5}, "Auditor notes no material discrepancies. Revenue recognition policy consistent.", "IT"),
        ("TCS", {"pe": 26.3, "debt_to_equity": 0.05, "promoter_pledged_pct": 0, "roce": 48.2, "revenue_growth": 8}, "Clean audit with robust internal financial controls.", "IT"),
        ("SBIN", {"pe": 9.6, "debt_to_equity": 0.6, "promoter_pledged_pct": 0, "roce": 12.2, "revenue_growth": 14}, "Audit flagged agri-loan slippages due to uneven monsoon. CET-1 at 13.6%.", "Banking"),
        ("VEDL", {"pe": 12.8, "debt_to_equity": 1.5, "promoter_pledged_pct": 38.2, "roce": 18.5, "revenue_growth": 8}, "Auditor draws attention to related party transactions with promoter group entities.", "Metals"),
        ("PAYTM", {"pe": 0, "debt_to_equity": 0.2, "promoter_pledged_pct": 0, "roce": -5.2, "revenue_growth": -15}, "Auditor highlights going concern uncertainty due to regulatory restrictions on payments bank.", "Fintech"),
        ("DMART", {"pe": 72.3, "debt_to_equity": 0.0, "promoter_pledged_pct": 0, "roce": 22.8, "revenue_growth": 12}, "Clean audit. Cash-rich balance sheet with zero debt.", "Retail"),
        ("LT", {"pe": 32.5, "debt_to_equity": 0.3, "promoter_pledged_pct": 0, "roce": 18.2, "revenue_growth": 20}, "Auditor notes order book execution risk on international projects.", "Infrastructure"),
        ("JUBLFOOD", {"pe": 55.2, "debt_to_equity": 0.6, "promoter_pledged_pct": 0, "roce": 12.5, "revenue_growth": 6}, "Audit notes increasing store payback period and franchisee profitability concerns.", "QSR"),
        ("ZOMATO", {"pe": 0, "debt_to_equity": 0.0, "promoter_pledged_pct": 0, "roce": -2.1, "revenue_growth": 62}, "First-time PAT positive. Auditor notes competition risks in quick-commerce.", "Internet"),
        ("HINDALCO", {"pe": 14.5, "debt_to_equity": 1.2, "promoter_pledged_pct": 0, "roce": 11.5, "revenue_growth": -3}, "Audit notes impact of LME price volatility on inventory valuation.", "Metals"),
        ("ICICIBANK", {"pe": 17.8, "debt_to_equity": 0.3, "promoter_pledged_pct": 0, "roce": 15.8, "revenue_growth": 18}, "Best-in-class asset quality report. Provision coverage at 80%.", "Banking"),
        ("MARUTI", {"pe": 28.5, "debt_to_equity": 0.1, "promoter_pledged_pct": 0, "roce": 19.8, "revenue_growth": 11}, "Clean audit. Strong operating cash flows with capex for EV transition.", "Auto"),
        ("ITC", {"pe": 25.2, "debt_to_equity": 0.0, "promoter_pledged_pct": 0, "roce": 28.5, "revenue_growth": 7}, "Clean audit with consistent dividend payout for 15 consecutive years.", "FMCG/Cigarettes"),
        ("TATASTEEL", {"pe": 22.1, "debt_to_equity": 1.8, "promoter_pledged_pct": 0, "roce": 9.5, "revenue_growth": -5}, "Audit flagged impact of EU carbon border tax on export profitability.", "Metals"),
        ("ASIANPAINT", {"pe": 48.2, "debt_to_equity": 0.05, "promoter_pledged_pct": 0, "roce": 35.2, "revenue_growth": 9}, "Clean audit with strong internal financial controls and stable margins.", "Consumer"),
        ("TITAN", {"pe": 62.3, "debt_to_equity": 0.08, "promoter_pledged_pct": 0, "roce": 28.8, "revenue_growth": 18}, "Clean audit. Management commentary confident about jewellery demand outlook.", "Consumer/Retail"),
        ("SUNPHARMA", {"pe": 22.5, "debt_to_equity": 0.4, "promoter_pledged_pct": 0, "roce": 16.8, "revenue_growth": 14}, "Clean audit. USFDA compliance status normal. R&D pipeline progressing.", "Pharma"),
    ]
    for ticker, bsheet, notes, sector in fundamental_cases:
        builder.compile_fundamental_node(ticker, bsheet, notes, sector)

    # ── Technical Anomaly Nodes (17) ─────────────────────
    technical_cases = [
        ("RELIANCE", [(2400, 100000), (2420, 120000), (2450, 95000), (2480, 110000), (2490, 450000)], {"delivery_pct": 72, "notes": "Institutional block deal detected via NSE co-location server window tracking."}, "Energy"),
        ("TATAMOTORS", [(850, 200000), (870, 180000), (890, 220000), (910, 350000), (920, 520000)], {"delivery_pct": 68, "notes": "FII bought 2.3M shares via bulk deal. Delivery volume at 68%."}, "Auto"),
        ("ADANIPORTS", [(1250, 300000), (1230, 280000), (1200, 350000), (1180, 420000), (1150, 510000)], {"delivery_pct": 32, "notes": "Continued delivery selling. DIIs reducing stake."}, "Infrastructure"),
        ("HDFCBANK", [(1620, 150000), (1640, 140000), (1650, 160000), (1660, 155000), (1670, 148000)], {"delivery_pct": 58, "notes": "Normal trading pattern. No unusual block activity."}, "Banking"),
        ("INFY", [(1450, 250000), (1430, 350000), (1410, 420000), (1400, 380000), (1390, 310000)], {"delivery_pct": 45, "notes": "US-based fund reduced stake by 1.2% via open market."}, "IT"),
        ("ZOMATO", [(220, 800000), (235, 1200000), (248, 950000), (250, 1500000), (268, 2500000)], {"delivery_pct": 76, "notes": "Mutual funds increased allocation. Delivery percentage elevated."}, "Internet"),
        ("DMART", [(5100, 300000), (5050, 450000), (4980, 600000), (4920, 550000), (4800, 480000)], {"delivery_pct": 38, "notes": "Insider selling by promoter entity via bulk deal window."}, "Retail"),
        ("TRENT", [(5500, 120000), (5400, 180000), (5300, 250000), (5200, 350000), (5100, 420000)], {"delivery_pct": 35, "notes": "Profit booking by early-stage investors. Delivery ratio declining."}, "Retail"),
        ("LT", [(3400, 180000), (3500, 220000), (3550, 280000), (3600, 350000), (3640, 420000)], {"delivery_pct": 71, "notes": "Block deal of 4.2M shares between two large institutional funds."}, "Infrastructure"),
        ("COALINDIA", [(460, 900000), (465, 850000), (470, 920000), (475, 880000), (480, 950000)], {"delivery_pct": 62, "notes": "Steady accumulation by dividend yield funds."}, "Mining"),
        ("WIPRO", [(560, 310000), (550, 380000), (540, 420000), (530, 480000), (520, 520000)], {"delivery_pct": 33, "notes": "Contributed delivery selling post weak Q4. FIIs net sellers."}, "IT"),
        ("ICICIBANK", [(1050, 250000), (1060, 280000), (1070, 320000), (1080, 350000), (1100, 400000)], {"delivery_pct": 74, "notes": "FII buying streak for 8 consecutive sessions. Delivery at 74%."}, "Banking"),
        ("HINDALCO", [(645, 350000), (635, 420000), (640, 380000), (630, 510000), (620, 580000)], {"delivery_pct": 41, "notes": "LME price decline triggered FII sell-off. Delivery moderate."}, "Metals"),
        ("MARUTI", [(11500, 280000), (11600, 320000), (11700, 300000), (11750, 350000), (11800, 380000)], {"delivery_pct": 69, "notes": "Institutional accumulation ahead of CNG model launch. Delivery elevated."}, "Auto"),
        ("BAJFINANCE", [(7100, 180000), (7200, 220000), (7250, 250000), (7300, 280000), (7350, 310000)], {"delivery_pct": 72, "notes": "MFs increased AUM allocation. Consistent delivery above 70%."}, "Financial"),
        ("POWERGRID", [(325, 2000000), (330, 2400000), (335, 2200000), (340, 2800000), (345, 3100000)], {"delivery_pct": 65, "notes": "Steady buying by infrastructure-themed funds. Delivery stable."}, "Power"),
        ("TATASTEEL", [(170, 2500000), (168, 2800000), (165, 3200000), (163, 3500000), (160, 3800000)], {"delivery_pct": 36, "notes": "Global steel price concerns triggering delivery-based selling."}, "Metals"),
    ]
    for ticker, ohlc, flow, sector in technical_cases:
        builder.compile_technical_anomaly_node(ticker, ohlc, flow, sector)

    # ── Regulatory Nodes (12) ────────────────────────────
    regulatory_cases = [
        ("Midcap Derivatives", "SEBI increases minimum contract value to 15 Lakhs and restricts weekly expiries to 1 per exchange.", "Volatility Index, Nifty Midcap Select, BSE Midcap"),
        ("F&O Segment", "SEBI bans new F&O entries in 10 illiquid stocks citing excessive speculation.", "Repco Home Finance, South Indian Bank, 8 others"),
        ("ASM Framework", "SEBI expands Graded Surveillance Measure to include 150 additional stocks with price band of 5%.", "Small-cap universe, 150 newly added names"),
        ("ESG Disclosure", "SEBI mandates BRSR core assurance for top 250 listed entities from FY25.", "Nifty 50, Nifty Next 50 constituents"),
        ("IPO Framework", "SEBI relaxes anchor investor lock-in period from 90 to 30 days for mainboard IPOs.", "Primary market pipeline, HNI investors"),
        ("Mutual Fund", "SEBI introduces New Fund Offer (NFO) guideline limiting sectoral fund launches to 2 per AMC per year.", "Mutual fund industry, Sectoral fund managers"),
        ("Corporate Bonds", "SEBI permits FPIs to trade corporate bonds on Request for Quote platform with same-day settlement.", "Corporate bond market, FPI community"),
        ("Stock Lending", "SEBI relaxes SLBM norms allowing retail participation in securities lending.", "Retail broking, Market making firms"),
        ("REITs/InvITs", "SEBI mandates minimum public unitholding of 25% for all REITs and InvITs within 3 years.", "REITs, InvITs, HNI investors"),
        ("M&A Disclosure", "SEBI tightens disclosure norms for related party transactions requiring shareholder approval above 5% threshold.", "Corporate India, Minority shareholders"),
        ("Digital Payments", "SEBI permits UPI-based block mechanism for secondary market trading with auto-payment settlement.", "Retail investors, Stock brokers, Clearing corporations"),
        ("Rights Issue", "SEBI reduces rights issue timeline from 317 days to 23 days via automated fast-track mechanism.", "Listed companies, Existing shareholders"),
    ]
    for sector, circular, tickers in regulatory_cases:
        builder.compile_regulatory_node(sector, circular, tickers)

    # ── Sector Rotation Nodes (12) ───────────────────────
    rotation_cases = [
        ("Banking", "RBI rate cut expectations + strong credit growth of 15% YoY", {"fii": "Buying", "dii": "Buying"}),
        ("IT", "Global uncertainty + US dollar depreciation concern", {"fii": "Selling", "dii": "Buying"}),
        ("Pharma", "USFDA approvals picking up + China API price stabilization", {"fii": "Buying", "dii": "Neutral"}),
        ("FMCG", "Rural recovery signs + input cost moderation", {"fii": "Neutral", "dii": "Buying"}),
        ("Auto", "EV policy push + CNG conversion wave + rural demand uptick", {"fii": "Buying", "dii": "Buying"}),
        ("Metals", "Global recession fears + LME price correction", {"fii": "Selling", "dii": "Selling"}),
        ("Real Estate", "Affordable housing push + stable interest rates", {"fii": "Neutral", "dii": "Buying"}),
        ("PSU", "Government capex push + dividend yield focus", {"fii": "Buying", "dii": "Buying"}),
        ("Telecom", "Tariff hike cycle + ARPU improvement + 5G monetization", {"fii": "Buying", "dii": "Neutral"}),
        ("Healthcare", "Insurance coverage expansion + hospital occupancy recovery", {"fii": "Neutral", "dii": "Buying"}),
        ("Chemicals", "China+1 supply chain shift + European energy cost advantage", {"fii": "Selling", "dii": "Neutral"}),
        ("Renewable Energy", "Green H2 policy push + PLI scheme for solar manufacturing", {"fii": "Buying", "dii": "Buying"}),
    ]
    for sector, macro, flows in rotation_cases:
        builder.compile_sector_rotation_node(sector, macro, flows)

    # ── Earnings Nodes (13) ──────────────────────────────
    earnings_cases = [
        ("TCS", {"result": "Beat", "revenue_growth": 8.2, "margin_change": 120, "guidance": "Positive", "commentary": "Demand environment improving. BFSI vertical returning to growth."}, "IT"),
        ("TATAMOTORS", {"result": "Beat", "revenue_growth": 18.5, "margin_change": 250, "guidance": "Raised", "commentary": "JLR margins at 9-year high. EV volumes accelerating."}, "Auto"),
        ("WIPRO", {"result": "Miss", "revenue_growth": 2.1, "margin_change": -80, "guidance": "Cut", "commentary": "Client discretionary spending remains weak. Consulting revenue down."}, "IT"),
        ("HDFCBANK", {"result": "Inline", "revenue_growth": 16.2, "margin_change": 10, "guidance": "Maintained", "commentary": "NIM steady at 3.6%. Asset quality stable."}, "Banking"),
        ("DMART", {"result": "Miss", "revenue_growth": 8.0, "margin_change": -40, "guidance": "Maintained", "commentary": "Same-store sales growth decelerated to 8% from 16% YoY."}, "Retail"),
        ("RELIANCE", {"result": "Inline", "revenue_growth": 12.5, "margin_change": 30, "guidance": "Positive", "commentary": "Telecom ARPU improving. Retail EBITDA margins expanding."}, "Diversified"),
        ("ICICIBANK", {"result": "Beat", "revenue_growth": 19.5, "margin_change": 45, "guidance": "Raised", "commentary": "Retail loan growth at 22%. Fee income diversification strong."}, "Banking"),
        ("BAJFINANCE", {"result": "Beat", "revenue_growth": 24.5, "margin_change": 15, "guidance": "Positive", "commentary": "AUM crossing 4L Cr mark. Rural disbursements outperforming."}, "Financial"),
        ("MARUTI", {"result": "Inline", "revenue_growth": 9.5, "margin_change": 20, "guidance": "Positive", "commentary": "CNG variant mix improving. EV transition on track."}, "Auto"),
        ("INFY", {"result": "Miss", "revenue_growth": 3.8, "margin_change": -30, "guidance": "Maintained", "commentary": "Client cautious on discretionary spends. Deal pipeline healthy."}, "IT"),
        ("TITAN", {"result": "Beat", "revenue_growth": 18.5, "margin_change": 150, "guidance": "Raised", "commentary": "Wedding season demand robust. Studded jewellery mix improving."}, "Consumer"),
        ("SBIN", {"result": "Beat", "revenue_growth": 14.2, "margin_change": 35, "guidance": "Positive", "commentary": "Net interest margin stable. Slippage ratio improved to 0.8%."}, "Banking"),
        ("HINDUNILVR", {"result": "Miss", "revenue_growth": 4.2, "margin_change": -60, "guidance": "Maintained", "commentary": "Rural volumes recovering slowly. Input cost pressure easing."}, "FMCG"),
    ]
    for ticker, edata, sector in earnings_cases:
        builder.compile_earnings_node(ticker, edata, sector)

    # ── Corporate Action Nodes (12) ──────────────────────
    action_cases = [
        ("TCS", "Buyback", "INR 18,000 Cr buyback at 10% premium to market price.", "IT"),
        ("RELIANCE", "Dividend", "Interim dividend of INR 14 per share. Record date set.", "Diversified"),
        ("VEDL", "Buyback", "INR 3,500 Cr buyback to reduce promoter pledge via open market.", "Metals"),
        ("SBIN", "Rights Issue", "INR 20,000 Cr rights issue to bolster capital adequacy ratios.", "Banking"),
        ("LT", "Stock Split", "1:2 stock split to improve liquidity for retail participation.", "Infrastructure"),
        ("HINDUNILVR", "Dividend", "Final dividend of INR 22 per share. Consistent payout for 25 years.", "FMCG"),
        ("TRENT", "Bonus Issue", "1:1 bonus issue from free reserves. Record date Q3.", "Retail"),
        ("ADANIPORTS", "Rights Issue", "INR 5,000 Cr rights issue partially subscribed by promoter group.", "Infrastructure"),
        ("WIPRO", "Buyback", "INR 12,000 Cr buyback via tender offer at 15% premium.", "IT"),
        ("ITC", "Dividend", "Special dividend of INR 12 per share on strong cash flows.", "FMCG"),
        ("M&M", "Stock Split", "1:2 stock split announced alongside EV vertical spin-off plans.", "Auto"),
        ("TATAPOWER", "Rights Issue", "INR 3,000 Cr rights issue for renewable energy capex funding.", "Power"),
    ]
    for ticker, action, details, sector in action_cases:
        builder.compile_corporate_action_node(ticker, action, details, sector)

    # Export
    dataset = builder.export_dataset()
    print(f"\nCategory breakdown:")
    print(f"  Fundamental: {sum(1 for d in dataset if 'fundamental' in d['instruction'].lower())}")
    print(f"  Technical:   {sum(1 for d in dataset if 'technical' in d['instruction'].lower())}")
    print(f"  Regulatory:  {sum(1 for d in dataset if 'regulatory' in d['instruction'].lower())}")
    print(f"  Rotation:    {sum(1 for d in dataset if 'rotation' in d['instruction'].lower())}")
    print(f"  Earnings:    {sum(1 for d in dataset if 'earnings' in d['instruction'].lower())}")
    print(f"  Corp Action: {sum(1 for d in dataset if 'corporate action' in d['instruction'].lower())}")
    return dataset


if __name__ == "__main__":
    dataset = generate_master_dataset()
