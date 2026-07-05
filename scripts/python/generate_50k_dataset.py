#!/usr/bin/env python3
"""
Generate 50,000 Qwen 0.5B training examples in messages format.
Uses real Indian stock data from stock-universe.json + synthetic financial data.

Usage: python3 scripts/python/generate_50k_dataset.py
Output: qwen_05b_training.jsonl (50,000 lines, messages format)
"""

import json
import random
import os
import sys

SEED = 42
TARGET = 50000
OUTPUT = "qwen_05b_training.jsonl"

random.seed(SEED)

SYSTEM_PROMPT = (
    "You are StockEX, a helpful, friendly, and knowledgeable AI assistant "
    "specialised in Indian stock market research. You speak naturally and "
    "conversationally. You provide accurate financial information but NEVER "
    "give personalised investment advice. You always include SEBI disclaimers "
    "when discussing investments. You are not a SEBI-registered advisor."
)

SYSTEM_ENCYCLOPEDIA = (
    "You are the official StockEX Encyclopedia. Provide deterministic, "
    "mathematically accurate reference data for Indian equities."
)

# ---------------------------------------------------------------------------
# 1. Load stock universe
# ---------------------------------------------------------------------------
UNIVERSE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "stock-universe.json")
with open(UNIVERSE_PATH) as f:
    raw = json.load(f)
entries: list[dict] = raw["entries"]
entries.sort(key=lambda x: x.get("marketCap", 0) or 0, reverse=True)

def maybe(e, k, default=""):
    v = e.get(k)
    return v if v is not None else default

# ---------------------------------------------------------------------------
# 2. Manually curated top-100 company profiles
# ---------------------------------------------------------------------------
TOP_PROFILES = {
    "RELIANCE": {
        "name": "Reliance Industries Limited", "sector": "Energy & Oil",
        "industry": "Oil & Gas", "founded": 1966, "hq": "Mumbai",
        "founder": "Dhirubhai Ambani", "ceo": "Mukesh Ambani",
        "market_cap_cr": "18,00,000", "employees": "340,000+",
        "description": "India's largest conglomerate with businesses in refining, petrochemicals, oil & gas exploration, retail (Reliance Retail), and telecommunications (Jio).",
        "products": "Petroleum products, retail goods, telecom services, digital services",
        "revenue_cr": "7,00,000", "net_profit_cr": "85,000",
        "pe": 20.5, "eps": 135, "dividend_yield": 2.2,
        "52w_high": 3100, "52w_low": 2400, "price": 2800,
    },
    "TCS": {
        "name": "Tata Consultancy Services Limited", "sector": "Information Technology",
        "industry": "IT Services", "founded": 1968, "hq": "Mumbai",
        "founder": "Tata Group", "ceo": "K Krithivasan",
        "market_cap_cr": "14,00,000", "employees": "600,000+",
        "description": "India's largest IT services company providing information technology services, business solutions, and consulting to global clients.",
        "products": "IT services, consulting, business solutions, software development",
        "revenue_cr": "2,40,000", "net_profit_cr": "45,000",
        "pe": 24.5, "eps": 139, "dividend_yield": 2.1,
        "52w_high": 3600, "52w_low": 2800, "price": 3400,
    },
    "HDFCBANK": {
        "name": "HDFC Bank Limited", "sector": "Banking & Finance",
        "industry": "Banking", "founded": 1994, "hq": "Mumbai",
        "founder": "Housing Development Finance Corporation", "ceo": "Sashidhar Jagdishan",
        "market_cap_cr": "11,00,000", "employees": "120,000+",
        "description": "One of India's largest private banks offering banking products and services including deposits, loans, credit cards, and investment services.",
        "products": "Retail banking, corporate banking, credit cards, loans, wealth management",
        "revenue_cr": "1,60,000", "net_profit_cr": "45,000",
        "pe": 22, "eps": 82, "dividend_yield": 2.5,
        "52w_high": 1800, "52w_low": 1500, "price": 1800,
    },
    "INFY": {
        "name": "Infosys Limited", "sector": "Information Technology",
        "industry": "IT Services", "founded": 1981, "hq": "Bangalore",
        "founder": "N.R. Narayana Murthy", "ceo": "Salil Parekh",
        "market_cap_cr": "7,50,000", "employees": "320,000+",
        "description": "Indian multinational company providing IT services and consulting including software development, testing, and infrastructure management.",
        "products": "IT consulting, software development, digital services, BPM",
        "revenue_cr": "1,70,000", "net_profit_cr": "26,000",
        "pe": 26, "eps": 73, "dividend_yield": 2.3,
        "52w_high": 2100, "52w_low": 1500, "price": 1900,
    },
    "ICICIBANK": {
        "name": "ICICI Bank Limited", "sector": "Banking & Finance",
        "industry": "Banking", "founded": 1994, "hq": "Mumbai",
        "founder": "ICICI Limited", "ceo": "Sandeep Bakhshi",
        "market_cap_cr": "8,00,000", "employees": "100,000+",
        "description": "A major private bank in India offering retail banking, corporate banking, and investment services.",
        "products": "Retail banking, corporate banking, investment banking, insurance",
        "revenue_cr": "1,20,000", "net_profit_cr": "35,000",
        "pe": 18, "eps": 62, "dividend_yield": 2.8,
        "52w_high": 1150, "52w_low": 950, "price": 1100,
    },
    "SBIN": {
        "name": "State Bank of India", "sector": "Banking & Finance",
        "industry": "Banking", "founded": 1955, "hq": "Mumbai",
        "founder": "Government of India", "ceo": "Dinesh Kumar Khara",
        "market_cap_cr": "5,50,000", "employees": "250,000+",
        "description": "India's largest public sector bank with a vast network of branches across the country offering comprehensive banking services.",
        "products": "Retail banking, corporate banking, international banking, NRI services",
        "revenue_cr": "3,00,000", "net_profit_cr": "45,000",
        "pe": 10.5, "eps": 55, "dividend_yield": 3.5,
        "52w_high": 680, "52w_low": 450, "price": 580,
    },
    "BHARTIARTL": {
        "name": "Bharti Airtel Limited", "sector": "Telecommunications",
        "industry": "Telecom Services", "founded": 1995, "hq": "New Delhi",
        "founder": "Sunil Bharti Mittal", "ceo": "Gopal Vittal",
        "market_cap_cr": "6,50,000", "employees": "80,000+",
        "description": "India's second-largest telecommunications company providing mobile, broadband, and digital TV services.",
        "products": "Mobile services, broadband, DTH, enterprise telecom",
        "revenue_cr": "1,40,000", "net_profit_cr": "12,000",
        "pe": 48, "eps": 11, "dividend_yield": 0.8,
        "52w_high": 1250, "52w_low": 830, "price": 1100,
    },
    "ITC": {
        "name": "ITC Limited", "sector": "Consumer Goods",
        "industry": "Tobacco & FMCG", "founded": 1910, "hq": "Kolkata",
        "founder": "British American Tobacco", "ceo": "Sanjiv Puri",
        "market_cap_cr": "5,80,000", "employees": "35,000+",
        "description": "Indian conglomerate with diversified businesses in FMCG, hotels, packaging, paper, and agribusiness.",
        "products": "Cigarettes, packaged foods, personal care, hotels, paper",
        "revenue_cr": "75,000", "net_profit_cr": "20,000",
        "pe": 28, "eps": 38, "dividend_yield": 3.2,
        "52w_high": 480, "52w_low": 380, "price": 450,
    },
    "HINDUNILVR": {
        "name": "Hindustan Unilever Limited", "sector": "Consumer Goods",
        "industry": "FMCG", "founded": 1933, "hq": "Mumbai",
        "founder": "Unilever PLC", "ceo": "Rohit Jawa",
        "market_cap_cr": "6,00,000", "employees": "21,000+",
        "description": "India's largest FMCG company with products spanning home care, beauty and personal care, foods, and refreshments.",
        "products": "Soap, detergent, shampoo, skincare, tea, ice cream, packaged foods",
        "revenue_cr": "60,000", "net_profit_cr": "10,000",
        "pe": 60, "eps": 42, "dividend_yield": 1.4,
        "52w_high": 2800, "52w_low": 2200, "price": 2500,
    },
    "LT": {
        "name": "Larsen & Toubro Limited", "sector": "Infrastructure",
        "industry": "Engineering", "founded": 1938, "hq": "Mumbai",
        "founder": "Henning Holck-Larsen", "ceo": "S.N. Subrahmanyan",
        "market_cap_cr": "4,00,000", "employees": "50,000+",
        "description": "Indian multinational conglomerate engaged in engineering, construction, manufacturing, and technology.",
        "products": "Engineering & construction, heavy equipment, IT services, financial services",
        "revenue_cr": "2,10,000", "net_profit_cr": "14,500",
        "pe": 28, "eps": 85, "dividend_yield": 1.2,
        "52w_high": 3100, "52w_low": 2300, "price": 2400,
    },
    "BAJFINANCE": {
        "name": "Bajaj Finance Limited", "sector": "Banking & Finance",
        "industry": "Banking", "founded": 1987, "hq": "Pune",
        "founder": "Jama lal Bajaj", "ceo": "Sanjiv Bajaj",
        "market_cap_cr": "4,50,000", "employees": "30,000+",
        "description": "One of India's largest non-banking financial companies offering lending, deposit, and wealth management services.",
        "products": "Consumer loans, mortgages, SME lending, wealth management",
        "revenue_cr": "35,000", "net_profit_cr": "10,500",
        "pe": 42, "eps": 170, "dividend_yield": 0.6,
        "52w_high": 8200, "52w_low": 6000, "price": 7200,
    },
    "MARUTI": {
        "name": "Maruti Suzuki India Limited", "sector": "Automotive",
        "industry": "Passenger Cars", "founded": 1981, "hq": "New Delhi",
        "founder": "Government of India & Suzuki Motor Corporation", "ceo": "Hisashi Takeuchi",
        "market_cap_cr": "3,50,000", "employees": "18,000+",
        "description": "India's largest car manufacturer with over 40% market share in the passenger vehicle segment.",
        "products": "Passenger cars, SUVs, vans, electric vehicles",
        "revenue_cr": "1,30,000", "net_profit_cr": "8,500",
        "pe": 38, "eps": 210, "dividend_yield": 1.0,
        "52w_high": 10500, "52w_low": 7500, "price": 9900,
    },
    "TITAN": {
        "name": "Titan Company Limited", "sector": "Consumer Goods",
        "industry": "Watches & Jewelry", "founded": 1984, "hq": "Bangalore",
        "founder": "Tata Group", "ceo": "C.K. Venkataraman",
        "market_cap_cr": "3,00,000", "employees": "12,000+",
        "description": "Indian lifestyle company known for watches, jewelry, and eyewear under brands like Tanishq and Fastrack.",
        "products": "Watches, jewelry (Tanishq), eyewear, fragrances",
        "revenue_cr": "45,000", "net_profit_cr": "3,200",
        "pe": 90, "eps": 65, "dividend_yield": 0.6,
        "52w_high": 3800, "52w_low": 2800, "price": 3400,
    },
    "ASIANPAINT": {
        "name": "Asian Paints Limited", "sector": "Consumer Goods",
        "industry": "Paints", "founded": 1942, "hq": "Mumbai",
        "founder": "Champaklal Choksey", "ceo": "Amit Syngle",
        "market_cap_cr": "3,20,000", "employees": "8,000+",
        "description": "India's largest paint company with decorative and industrial paint products across multiple brands.",
        "products": "Decorative paints, industrial paints, waterproofing, adhesives",
        "revenue_cr": "35,000", "net_profit_cr": "5,500",
        "pe": 58, "eps": 34, "dividend_yield": 0.9,
        "52w_high": 3450, "52w_low": 2600, "price": 3200,
    },
    "NTPC": {
        "name": "NTPC Limited", "sector": "Energy & Oil",
        "industry": "Power Generation", "founded": 1975, "hq": "New Delhi",
        "founder": "Government of India", "ceo": "Gurdeep Singh",
        "market_cap_cr": "3,10,000", "employees": "55,000+",
        "description": "India's largest power generation company with coal, gas, and renewable energy assets.",
        "products": "Electricity generation (coal, gas, hydro, solar, wind)",
        "revenue_cr": "1,50,000", "net_profit_cr": "17,000",
        "pe": 18, "eps": 18, "dividend_yield": 3.8,
        "52w_high": 320, "52w_low": 200, "price": 310,
    },
    "SUNPHARMA": {
        "name": "Sun Pharmaceutical Industries Limited", "sector": "Pharmaceuticals",
        "industry": "Generics", "founded": 1983, "hq": "Mumbai",
        "founder": "Dilip Shanghvi", "ceo": "Dilip Shanghvi",
        "market_cap_cr": "3,40,000", "employees": "38,000+",
        "description": "India's largest pharmaceutical company specializing in generic drugs, specialty medicines, and APIs.",
        "products": "Generic pharmaceuticals, specialty medicines, APIs, formulations",
        "revenue_cr": "50,000", "net_profit_cr": "8,500",
        "pe": 38, "eps": 22, "dividend_yield": 0.7,
        "52w_high": 1550, "52w_low": 1180, "price": 1480,
    },
    "HCLTECH": {
        "name": "HCL Technologies Limited", "sector": "Information Technology",
        "industry": "IT Services", "founded": 1976, "hq": "Noida",
        "founder": "Shiv Nadar", "ceo": "C. Vijayakumar",
        "market_cap_cr": "3,60,000", "employees": "230,000+",
        "description": "Indian IT services company providing software, consulting, and business process services.",
        "products": "IT services, engineering services, BPO, digital solutions",
        "revenue_cr": "1,10,000", "net_profit_cr": "16,000",
        "pe": 22, "eps": 62, "dividend_yield": 2.8,
        "52w_high": 1550, "52w_low": 1050, "price": 1400,
    },
    "WIPRO": {
        "name": "Wipro Limited", "sector": "Information Technology",
        "industry": "IT Services", "founded": 1945, "hq": "Bangalore",
        "founder": "M.H. Hasham Premji", "ceo": "Srinivas Pallia",
        "market_cap_cr": "2,80,000", "employees": "240,000+",
        "description": "Indian multinational IT services and consulting company with operations in 50+ countries.",
        "products": "IT consulting, application development, BPM, cloud services",
        "revenue_cr": "90,000", "net_profit_cr": "12,500",
        "pe": 22, "eps": 17, "dividend_yield": 2.5,
        "52w_high": 480, "52w_low": 380, "price": 450,
    },
    "KOTAKBANK": {
        "name": "Kotak Mahindra Bank Limited", "sector": "Banking & Finance",
        "industry": "Banking", "founded": 1985, "hq": "Mumbai",
        "founder": "Uday Kotak", "ceo": "Ashok Vaswani",
        "market_cap_cr": "3,50,000", "employees": "75,000+",
        "description": "Indian private sector bank offering retail banking, corporate banking, and investment banking services.",
        "products": "Retail banking, corporate banking, wealth management, investment banking",
        "revenue_cr": "35,000", "net_profit_cr": "8,500",
        "pe": 38, "eps": 38, "dividend_yield": 1.2,
        "52w_high": 1900, "52w_low": 1500, "price": 1700,
    },
    "AXISBANK": {
        "name": "Axis Bank Limited", "sector": "Banking & Finance",
        "industry": "Banking", "founded": 1993, "hq": "Mumbai",
        "founder": "UTI", "ceo": "Amitabh Chaudhry",
        "market_cap_cr": "3,00,000", "employees": "85,000+",
        "description": "Third-largest private sector bank in India offering comprehensive banking and financial services.",
        "products": "Retail banking, corporate banking, credit cards, wealth management",
        "revenue_cr": "85,000", "net_profit_cr": "18,000",
        "pe": 16, "eps": 28, "dividend_yield": 1.3,
        "52w_high": 1250, "52w_low": 950, "price": 1100,
    },
    "ADANIENT": {
        "name": "Adani Enterprises Limited", "sector": "Infrastructure",
        "industry": "Trading", "founded": 1988, "hq": "Ahmedabad",
        "founder": "Gautam Adani", "ceo": "Gautam Adani",
        "market_cap_cr": "4,20,000", "employees": "25,000+",
        "description": "Flagship company of the Adani Group involved in mining, trading, logistics, and agribusiness.",
        "products": "Mining, trading, logistics, agribusiness, energy",
        "revenue_cr": "1,20,000", "net_profit_cr": "4,500",
        "pe": 90, "eps": 42, "dividend_yield": 0.4,
        "52w_high": 3450, "52w_low": 2200, "price": 3100,
    },
    "DMART": {
        "name": "Avenue Supermarts Limited", "sector": "Retail",
        "industry": "Retail", "founded": 2002, "hq": "Mumbai",
        "founder": "Radhakishan Damani", "ceo": "Neville Noronha",
        "market_cap_cr": "2,60,000", "employees": "45,000+",
        "description": "Owner of DMart chain of supermarkets and hypermarkets across India offering everyday low prices.",
        "products": "Groceries, household items, apparel, electronics",
        "revenue_cr": "42,000", "net_profit_cr": "2,800",
        "pe": 92, "eps": 16, "dividend_yield": 0.3,
        "52w_high": 4300, "52w_low": 3400, "price": 4000,
    },
    "NESTLEIND": {
        "name": "Nestle India Limited", "sector": "Consumer Goods",
        "industry": "FMCG", "founded": 1959, "hq": "Gurgaon",
        "founder": "Nestle S.A.", "ceo": "Suresh Narayanan",
        "market_cap_cr": "2,40,000", "employees": "8,000+",
        "description": "Indian subsidiary of Nestle S.A. known for Maggi, Nescafe, KitKat, and other packaged food products.",
        "products": "Packaged foods (Maggi, Nescafe, KitKat, Cerelac, Nido)",
        "revenue_cr": "20,000", "net_profit_cr": "3,500",
        "pe": 68, "eps": 89, "dividend_yield": 1.1,
        "52w_high": 2600, "52w_low": 2000, "price": 2450,
    },
    "ONGC": {
        "name": "Oil & Natural Gas Corporation Limited", "sector": "Energy & Oil",
        "industry": "Oil & Gas Exploration", "founded": 1956, "hq": "Dehradun",
        "founder": "Government of India", "ceo": "Arun Kumar Singh",
        "market_cap_cr": "2,90,000", "employees": "30,000+",
        "description": "India's largest oil and gas exploration and production company.",
        "products": "Crude oil, natural gas, value-added products",
        "revenue_cr": "1,80,000", "net_profit_cr": "32,000",
        "pe": 8, "eps": 30, "dividend_yield": 5.2,
        "52w_high": 310, "52w_low": 220, "price": 280,
    },
    "BAJAJFINSV": {
        "name": "Bajaj Finserv Limited", "sector": "Banking & Finance",
        "industry": "Financial Services", "founded": 2007, "hq": "Pune",
        "founder": "Jama lal Bajaj", "ceo": "Sanjiv Bajaj",
        "market_cap_cr": "2,50,000", "employees": "25,000+",
        "description": "Indian financial services company offering lending, insurance, and wealth management through its subsidiaries.",
        "products": "Lending, insurance (life & general), wealth management, investments",
        "revenue_cr": "55,000", "net_profit_cr": "7,500",
        "pe": 32, "eps": 62, "dividend_yield": 0.5,
        "52w_high": 1750, "52w_low": 1300, "price": 1600,
    },
}

# ---------------------------------------------------------------------------
# 3. Financial terms pool
# ---------------------------------------------------------------------------
FINANCIAL_TERMS = [
    {
        "term": "P/E ratio",
        "prompts": ["What does P/E ratio mean?", "Explain P/E ratio", "What is price to earnings ratio?"],
        "answer": "P/E (Price-to-Earnings) ratio = Stock Price / Earnings Per Share. It shows how many rupees investors pay for each rupee of earnings. Example: If stock price is Rs100 and EPS is Rs4, then P/E = 25. Low P/E (<15) suggests undervaluation. High P/E (>30) suggests overvaluation. Use PEG ratio for growth comparison. Indian IT sector average P/E: 24. Banking: 18. Pharma: 20."
    },
    {
        "term": "dividend yield",
        "prompts": ["Explain dividend yield", "What is dividend yield?", "Define dividend yield"],
        "answer": "Dividend Yield = Annual Dividend per Share / Stock Price x 100. Shows return from dividends alone. Example: Stock at Rs1000 with Rs25 annual dividend = 2.5% yield. High yield (>4%) can indicate value stock or potential trouble. Low yield (<1%) means profit reinvested. Compare to risk-free rate (~7%). Indian companies with high yield: Coal India (~5%), ONGC (~5%), IOC (~4%)."
    },
    {
        "term": "ROE",
        "prompts": ["What is ROE?", "Explain Return on Equity", "Define ROE"],
        "answer": "ROE (Return on Equity) = Net Income / Shareholders' Equity x 100. Shows profit generated per rupee of equity invested. High ROE (>20%) = efficient capital use. Low ROE (<10%) = poor utilization. Indian sector averages: IT: 22%, Banking: 15%, Pharma: 18%, FMCG: 25%. TCS has ROE of 22%. HDFC Bank has ROE of 19%."
    },
    {
        "term": "beta",
        "prompts": ["Define beta", "What is beta in stocks?", "Explain beta"],
        "answer": "Beta measures stock volatility vs the market. Beta = 1: Moves with market (average risk). Beta > 1: More volatile (aggressive, riskier). Beta < 1: Less volatile (defensive, safer). Example: Beta 1.5 stock swings 50% more than market. Beta 0.8 swings 20% less. Calculate: Covariance(stock, market) / Variance(market). Defensive stocks like HUL (beta ~0.6) are less volatile than aggressive stocks like Adani Enterprises (beta ~1.5)."
    },
    {
        "term": "market cap",
        "prompts": ["What is market cap?", "Define market capitalization", "Explain market cap"],
        "answer": "Market Cap = Stock Price x Total Shares Outstanding. It is the total market value of a company. Classification: Large Cap > Rs1 lakh crore, Mid Cap Rs10,000 Cr to Rs1 lakh Cr, Small Cap < Rs10,000 Cr. Example: TCS at Rs3,400 with 40 crore shares = Rs14 lakh crore market cap. Larger cap generally means more stable. SEBI reclassifies stocks every 6 months based on market cap ranking."
    },
    {
        "term": "debt-to-equity ratio",
        "prompts": ["Explain debt-to-equity ratio", "What is D/E ratio?", "Define debt to equity"],
        "answer": "Debt-to-Equity = Total Debt / Total Equity. Measures financial leverage. Low D/E (<0.5) = conservative, less risk. High D/E (>1.5) = aggressive, more risk. Banks have high D/E by design (deposits = debt). Example: Company with Rs100 Cr debt and Rs200 Cr equity = 0.5 D/E. TCS: 0.2 (low), Reliance: 0.9 (moderate), HDFC Bank: 2.3 (normal for banking)."
    },
    {
        "term": "current ratio",
        "prompts": ["What does current ratio mean?", "Explain current ratio", "Define current ratio"],
        "answer": "Current Ratio = Current Assets / Current Liabilities. Measures liquidity (ability to pay short-term debts). Ratio > 1.5 = good liquidity. Ratio < 1.0 = potential trouble. Example: Assets Rs1500 Cr, Liabilities Rs1000 Cr = 1.5 ratio. IT companies typically have high current ratios (>2.5). Manufacturing companies aim for >1.5. Below 1.0 means company may struggle to pay short-term obligations."
    },
    {
        "term": "EPS",
        "prompts": ["What is EPS?", "Explain Earnings Per Share", "Define EPS"],
        "answer": "EPS (Earnings Per Share) = Net Profit / Total Outstanding Shares. Shows company profit allocated to each share. Higher EPS = more profitable. Types: Basic EPS (simple calculation) and Diluted EPS (includes stock options, convertible securities). Example: TCS net profit Rs45,000 Cr with 40 Cr shares = EPS Rs139. Growing EPS over 5+ years is a sign of a quality company."
    },
    {
        "term": "ROCE",
        "prompts": ["What is ROCE?", "Explain Return on Capital Employed", "Define ROCE"],
        "answer": "ROCE (Return on Capital Employed) = EBIT / (Total Assets - Current Liabilities) x 100. Measures return on all capital used. Better than ROE for comparing capital-intensive businesses. ROCE > 15% = good. Example: TCS ROCE ~45% (asset-light), NTPC ROCE ~8% (capital-intensive). Compare ROCE with cost of capital: if ROCE > WACC, company creates value."
    },
    {
        "term": "PEG ratio",
        "prompts": ["What is PEG ratio?", "Explain PEG ratio", "Define price to earnings growth"],
        "answer": "PEG Ratio = P/E Ratio / Earnings Growth Rate. Adjusts P/E for growth. PEG < 1 = undervalued (growth not priced in). PEG > 2 = overvalued (growth expectations too high). Example: Stock with P/E 25 and 20% growth = PEG 1.25 (fair value). Growth stocks with PEG < 1 are often good investment opportunities. Mature companies have higher PEG as growth slows."
    },
    {
        "term": "book value",
        "prompts": ["What is book value?", "Explain book value per share", "Define book value"],
        "answer": "Book Value = Total Assets - Intangible Assets - Total Liabilities. Also called Shareholders' Equity. Book Value Per Share (BVPS) = Book Value / Outstanding Shares. P/B ratio = Stock Price / BVPS. Example: HDFC Bank with price Rs1800 and BVPS Rs500 = P/B 3.6. Banks are often valued using P/B. P/B < 1 can indicate undervaluation."
    },
    {
        "term": "free cash flow",
        "prompts": ["What is free cash flow?", "Explain FCF", "Define free cash flow"],
        "answer": "Free Cash Flow (FCF) = Operating Cash Flow - Capital Expenditure. Cash available for dividends, buybacks, or debt repayment. Positive FCF = healthy business. FCF Yield = FCF / Market Cap. Example: TCS generates ~Rs35,000 Cr FCF annually with 2% FCF yield. High FCF companies (like IT firms) can sustain high dividends. Negative FCF means company needs external financing."
    },
    {
        "term": "dividend payout ratio",
        "prompts": ["What is dividend payout ratio?", "Explain payout ratio", "Define dividend payout"],
        "answer": "Dividend Payout Ratio = Dividends Paid / Net Income x 100. Shows percentage of earnings distributed as dividends. Lower ratio (<30%) = more retained for growth. Higher ratio (>60%) = limited reinvestment. Example: If company earns Rs100 Cr and pays Rs40 Cr dividends = 40% payout. ITC pays ~80% (high payout). TCS pays ~50% (balanced). Growth companies typically have lower payout ratios."
    },
    {
        "term": "NPA",
        "prompts": ["What is NPA?", "Explain non-performing asset", "Define NPA in banking"],
        "answer": "NPA (Non-Performing Asset) = Loans where borrower has stopped paying interest or principal for 90+ days. Gross NPA = total bad loans. Net NPA = Gross NPA - Provisions. Lower NPA = better asset quality. Example: HDFC Bank gross NPA 1.2% (excellent), ICICI 1.5% (good), PSU banks average 4-5%. Recovery through SARFAESI Act for secured loans."
    },
    {
        "term": "NIM",
        "prompts": ["What is NIM?", "Explain Net Interest Margin", "Define NIM in banking"],
        "answer": "NIM (Net Interest Margin) = (Interest Income - Interest Expense) / Average Interest-Earning Assets x 100. Key metric for banks. Higher NIM = more profitable lending. Example: HDFC Bank NIM ~4.2%, ICICI ~3.8%, SBI ~3.0%. NIM varies by loan mix: retail loans have higher NIM than corporate loans. Rate hikes typically expand NIM for banks."
    },
    {
        "term": "CAGR",
        "prompts": ["What is CAGR?", "Explain Compound Annual Growth Rate", "Define CAGR"],
        "answer": "CAGR = (Ending Value / Beginning Value)^(1/n) - 1. Measures smoothed annual growth over a period. Formula removes volatility. Example: Investment of Rs10,000 grows to Rs20,000 in 5 years = CAGR of 14.87%. Nifty 50 has delivered ~15% CAGR over 20 years. Individual stock CAGRs: TCS 20% (5-year), HDFC Bank 18% (5-year). CAGR is better than average returns for multi-year analysis."
    },
    {
        "term": "EBITDA",
        "prompts": ["What is EBITDA?", "Explain EBITDA", "Define EBITDA margin"],
        "answer": "EBITDA = Earnings Before Interest, Taxes, Depreciation, and Amortization. Measures operating profitability ignoring capital structure and non-cash charges. EBITDA Margin = EBITDA / Revenue x 100. Example: TCS EBITDA margin ~28%, HUL ~24%, NTPC ~35%. High EBITDA margin = pricing power. IT companies have high EBITDA margins due to low capital intensity."
    },
    {
        "term": "operating margin",
        "prompts": ["What is operating margin?", "Explain operating profit margin", "Define operating margin"],
        "answer": "Operating Margin = Operating Profit / Revenue x 100. Shows profit from core business operations. Higher margin = better operational efficiency. Example: TCS 24%, Infosys 21%, HCL 18% in IT sector. FMCG companies: HUL 24%, Nestle 22%. Compare with industry peers to assess competitiveness. Falling margins signal rising costs or pricing pressure."
    },
    {
        "term": "net profit margin",
        "prompts": ["What is net profit margin?", "Explain net margin", "Define net profit margin"],
        "answer": "Net Profit Margin = Net Profit / Revenue x 100. Shows final profit after all expenses, taxes, and interest. The bottom line profitability metric. Example: TCS 18.2%, HDFC Bank 28% (high due to banking model), Reliance 12%. Net margin varies significantly by industry. Banks have high net margins due to leverage. Manufacturing has lower margins (5-10%)."
    },
    {
        "term": "P/B ratio",
        "prompts": ["What is P/B ratio?", "Explain price to book ratio", "Define P/B ratio"],
        "answer": "P/B (Price-to-Book) Ratio = Stock Price / Book Value Per Share. Compares market value to accounting value. P/B < 1 = potentially undervalued (or distressed). P/B > 3 = premium valuation. Used primarily for banks and financial companies. Example: HDFC Bank P/B 3.6, ICICI 2.8, SBI 1.2. Manufacturing companies typically trade at P/B 2-4. IT companies at P/B 5-10."
    },
    {
        "term": "face value",
        "prompts": ["What is face value?", "Explain face value of shares", "Define face value"],
        "answer": "Face Value (or Par Value) is the original cost of a share as stated in the company's charter. In India, face values are typically Rs1, Rs2, Rs5, or Rs10. It is used for calculating dividends (dividend is declared per face value). Example: Company with Rs10 face value declaring 500% dividend = Rs50 per share. Face value rarely equals market price. Stock splits change face value."
    },
    {
        "term": "bonus shares",
        "prompts": ["What are bonus shares?", "Explain bonus issue", "Define bonus shares"],
        "answer": "Bonus Shares are additional shares given to existing shareholders without cost. Issued from company reserves. Increases number of shares but decreases price proportionally (no value change for investor). Example: 1:1 bonus means you get 1 extra share for each share held. Stock price halves. Reasons: improve liquidity, reward shareholders without cash outlay. Tax-free for shareholders."
    },
    {
        "term": "stock split",
        "prompts": ["What is stock split?", "Explain stock split", "Define stock split"],
        "answer": "Stock Split divides existing shares into multiple shares. Face value changes proportionally. No change in market cap or shareholder wealth. Example: 2:1 split of Rs10 face value stock gives two Rs5 shares for each held. Price halves. Reasons: make shares affordable for retail investors, improve liquidity. In India, Apple-like high prices often lead to splits. HDFC Bank has done multiple splits."
    },
    {
        "term": "buyback",
        "prompts": ["What is share buyback?", "Explain buyback of shares", "Define buyback"],
        "answer": "Share Buyback is when a company purchases its own shares from shareholders. Benefits: increases EPS (fewer shares), signals confidence, tax-efficient return of capital. Example: TCS buys back shares worth Rs16,000 Cr at Rs4,150. Tender offer = fixed price. Open market = market price. In India, buybacks are taxed (20% + surcharge) in hands of company since 2023."
    },
    {
        "term": "GDP",
        "prompts": ["How does GDP affect stock market?", "What is GDP impact on stocks?", "Explain GDP and market relationship"],
        "answer": "GDP (Gross Domestic Product) measures total economic output. GDP growth of 6-7% is considered good for India. Higher GDP growth = higher corporate earnings = stock market up. Lower GDP = recessions = stocks down. India GDP growth ~6.5% in FY25. Sectors that correlate with GDP: Banking, Infrastructure, Auto. Defensive sectors (IT, Pharma) are less correlated."
    },
    {
        "term": "inflation",
        "prompts": ["How does inflation affect stocks?", "What is inflation impact on market?", "Explain inflation and stocks"],
        "answer": "Inflation impact on stocks: High inflation (>6%) hurts stocks generally. Reduces purchasing power. Companies struggle to raise prices without losing demand. RBI raises rates to control inflation (harms borrowers). Winners: Banks (NIM widens), Commodities. Losers: Consumer goods, Real estate, Utilities. Low inflation (<4%) = positive for stocks. RBI targets 4% CPI inflation. Current Indian inflation: ~4.5%."
    },
    {
        "term": "SIP",
        "prompts": ["What is SIP?", "Explain Systematic Investment Plan", "Define SIP investing"],
        "answer": "SIP (Systematic Investment Plan) lets you invest a fixed amount in mutual funds/ETFs at regular intervals (monthly/quarterly). Benefits: Rupee cost averaging (buy more when market is down), power of compounding, disciplined investing. Example: Rs10,000 monthly SIP in Nifty 50 for 20 years at 12% return = ~Rs1 crore. Start early for maximum compounding benefit."
    },
    {
        "term": "mutual fund",
        "prompts": ["What is a mutual fund?", "Explain mutual funds", "Define mutual fund"],
        "answer": "A Mutual Fund pools money from investors to buy stocks, bonds, and other securities. Managed by professional fund managers. Types: Equity funds (stocks), Debt funds (bonds), Hybrid funds, Index funds. Costs: Expense ratio (0.1% for index funds to 2% for active funds). In India, SEBI regulates mutual funds. AUM: Rs60+ lakh crore in Indian mutual fund industry."
    },
    {
        "term": "ETF",
        "prompts": ["What is ETF?", "Explain Exchange Traded Fund", "Define ETF"],
        "answer": "ETF (Exchange Traded Fund) is a marketable security tracking an index, commodity, or sector. Traded on exchanges like stocks. Benefits: Lower expense ratios than mutual funds, real-time trading, diversification. Examples: Nippon India Nifty 50 ETF (track Nifty 50), Gold ETFs. Expense ratio: 0.05-0.5%. Ideal for passive investors. SIP also available in ETFs now."
    },
    {
        "term": "index fund",
        "prompts": ["What is index fund?", "Explain index funds", "Define index fund"],
        "answer": "An Index Fund is a mutual fund that tracks a market index (like Nifty 50 or Sensex). Passive investing: no fund manager stock selection. Benefits: low expense ratio (0.1-0.3%), no fund manager risk, market returns guaranteed. Example: Rs10,000 invested in Nifty 50 index fund grows with Nifty. Best for investors who believe markets are efficient. Beats 70% of active funds over 10 years."
    },
    {
        "term": "Nifty 50",
        "prompts": ["What is Nifty 50?", "Explain Nifty 50 index", "Define Nifty"],
        "answer": "Nifty 50 is India's benchmark stock market index comprising the 50 largest and most liquid companies listed on NSE. Launched in 1996. Base value: 1000 (1995). Covers 13 sectors. Top weight: Financials (~35%), IT (~15%), Energy (~12%). Key companies: HDFC Bank, Reliance, ICICI Bank, TCS, Infosys. Nifty 50 has delivered ~15% CAGR since inception."
    },
    {
        "term": "Sensex",
        "prompts": ["What is Sensex?", "Explain BSE Sensex", "Define Sensex"],
        "answer": "Sensex (Sensitive Index) is BSE's benchmark index of 30 well-established companies. Oldest index in India (launched 1986). Base: 100 in 1978-79. Crossed 70,000 in Dec 2023. Top constituents: Reliance, HDFC Bank, ICICI Bank, TCS, Infosys, HUL. Different from Nifty 50: Sensex has 30 stocks vs Nifty's 50. Both are market cap weighted. Sensex has slightly higher concentration in top stocks."
    },
    {
        "term": "circuit breaker",
        "prompts": ["What is circuit breaker?", "Explain circuit limits", "Define circuit breaker in stock market"],
        "answer": "Circuit Breaker is a floor/ceiling limit for stock price movement in a single day. When triggered, trading is halted. NSE/BSE limits: 2%, 5%, 10%, 20% based on stock volatility. Market-wide circuit: 10% (1 hour halt), 15% (2 hours), 20% (remainder of day). Last triggered during COVID-19 March 2020 crash. Protects against panic selling and manipulation."
    },
    {
        "term": "IPO",
        "prompts": ["What is IPO?", "Explain Initial Public Offering", "Define IPO"],
        "answer": "IPO (Initial Public Offering) is when a private company lists shares on a stock exchange for the first time. Raises capital from public. Process: DRHP filing with SEBI, price band, bidding, allotment, listing. SEBI regulations: minimum 25% public float (for most cos), mandatory IPO grading. Recent major IPOs: LIC (Rs21,000 Cr), Paytm, Zomato. Retail investors get priority allotment."
    },
    {
        "term": "FII",
        "prompts": ["What is FII?", "Explain Foreign Institutional Investors", "Define FII"],
        "answer": "FII (Foreign Institutional Investor) includes foreign pension funds, mutual funds, hedge funds investing in Indian markets. Major influence on Indian markets. FII flows impact rupee, market direction. In FY24: FIIs bought ~Rs2 lakh crore in Indian equities. FII selling = market down, buying = market up. SEBI registration required. Now called FPIs (Foreign Portfolio Investors)."
    },
    {
        "term": "DII",
        "prompts": ["What is DII?", "Explain Domestic Institutional Investors", "Define DII"],
        "answer": "DII (Domestic Institutional Investor) includes Indian mutual funds, insurance companies, pension funds, and banks. DIIs have become more influential with SIP growth. In FY24: DIIs bought ~Rs3 lakh crore. Mutual fund AUM crossed Rs50 lakh crore in 2024. DII flows often offset FII selling (providing market stability). Insurance companies (LIC) are the largest DIIs."
    },
    {
        "term": "HNI",
        "prompts": ["What is HNI?", "Explain High Net Worth Individual", "Define HNI"],
        "answer": "HNI (High Net Worth Individual) in Indian context: investors applying for >Rs2 lakh in IPO (non-retail category). HNIs get separate allotment in IPOs (15% reservation). SEBI increased HNI investment limit for this category. HNIs also have access to PMS (Portfolio Management Services) and AIF (Alternative Investment Funds) with Rs50 lakh+ minimum investment."
    },
    {
        "term": "SEBI",
        "prompts": ["What is SEBI?", "Explain SEBI", "Define Securities and Exchange Board of India"],
        "answer": "SEBI (Securities and Exchange Board of India) is the market regulator established in 1988 (statutory in 1992). Functions: Protect investor interests, regulate stock exchanges, register intermediaries (brokers, mutual funds), prevent fraud. Key regulations: Insider trading prohibition, takeover code, listing obligations. SEBI has powers to investigate, levy penalties. Current chairperson: Madhabi Puri Buch."
    },
    {
        "term": "STT",
        "prompts": ["What is STT?", "Explain Securities Transaction Tax", "Define STT"],
        "answer": "STT (Securities Transaction Tax) is a tax on stock market transactions in India. Introduced in 2004. Rates: Delivery equity: 0.1% (buy + sell), Futures: 0.01% (sell side), Options: 0.05% (premium), 0.017% on exercise. STT is not deductible as business expense (since FY24). For intraday trading (non-delivery): 0.025% on sell side. STT revenue: ~Rs30,000 Cr annually for government."
    },
    {
        "term": "capital gains tax",
        "prompts": ["What is capital gains tax?", "Explain LTCG and STCG", "Define capital gains tax India"],
        "answer": "Capital Gains Tax in India: Short-Term Capital Gains (STCG): held <12 months (equity), taxed at 15% + surcharge. Long-Term Capital Gains (LTCG): held >12 months (equity), gains >Rs1 lakh taxed at 10% + surcharge. No indexation benefit for equity. Debt funds: STCG taxed at income slab, LTCG at 20% with indexation. Budget 2024 increased LTCG to 12.5% for some assets."
    },
    {
        "term": "TDS on dividend",
        "prompts": ["What is TDS on dividend?", "Explain dividend taxation", "Define TDS on dividends India"],
        "answer": "TDS on Dividend: Companies deduct 10% TDS on dividends >Rs5,000 paid to resident individuals (Section 194). No TDS if PAN submitted. Dividend income is taxable in investor's hands at applicable slab rate. Tax credit for TDS deducted. From FY21: dividends taxed in hands of shareholders (classical system), not dividend distribution tax (DDT) at company level."
    },
    {
        "term": "derivatives",
        "prompts": ["What are derivatives?", "Explain F&O trading", "Define derivatives market"],
        "answer": "Derivatives are financial contracts whose value is derived from an underlying asset (stock, index, commodity). Types: Futures (obligation to buy/sell) and Options (right to buy/sell). Indian F&O market is one of the largest globally by volume. Nifty and Bank Nifty are the most traded. Lot size varies (Nifty 50 shares, Bank Nifty 25 shares). SEBI increased F&O rules in 2024 to curb speculation."
    },
    {
        "term": "margin trading",
        "prompts": ["What is margin trading?", "Explain trading on margin", "Define margin"],
        "answer": "Margin Trading = borrowing money from broker to trade larger positions. SEBI margin rules: minimum 20% for delivery trades (varies by stock). Peak margin rules (since 2021): 100% upfront collection. Intraday margins: 5-20% of trade value. Benefits: Leverage (amplify returns). Risk: Amplify losses, margin calls if position moves against. SEBI tightened norms after 2020 Zerodha incidents."
    },
    {
        "term": "delivery trading",
        "prompts": ["What is delivery trading?", "Explain delivery vs intraday", "Define delivery trading"],
        "answer": "Delivery Trading = buying and holding shares beyond the trading day. Shares credited to Demat account. Full payment required. STT: 0.1% (buy + sell). No leverage. Lower risk than intraday. Settlement: T+1 (since Jan 2023). Suitable for long-term investors. Intraday: same-day settlement, 0.025% STT, high risk, higher leverage."
    },
]

# ---------------------------------------------------------------------------
# 4. Technical terms pool
# ---------------------------------------------------------------------------
TECHNICAL_TERMS = [
    {
        "term": "RSI",
        "prompts": ["What does RSI mean?", "Explain RSI indicator", "What is Relative Strength Index?"],
        "answer": "RSI (Relative Strength Index) ranges 0-100 and measures momentum. RSI > 70 = overbought (potential sell signal). RSI < 30 = oversold (potential buy signal). RSI 40-60 = neutral. Calculated over 14 periods by default. Formula: RSI = 100 - [100 / (1 + RS)] where RS = average gain / average loss over 14 days. Can use 9 or 25 period for more/less sensitivity."
    },
    {
        "term": "MACD",
        "prompts": ["Explain MACD", "What is MACD indicator?", "Define Moving Average Convergence Divergence"],
        "answer": "MACD (Moving Average Convergence Divergence) shows momentum and trend direction. Components: MACD Line (12-period EMA - 26-period EMA), Signal Line (9-period EMA of MACD), Histogram (MACD - Signal). When MACD crosses above Signal = bullish. When MACD crosses below Signal = bearish. Divergence (price up, MACD down) = potential trend reversal. Popular for swing trading."
    },
    {
        "term": "Bollinger Bands",
        "prompts": ["What are Bollinger Bands?", "Explain Bollinger Bands", "Define Bollinger Bands"],
        "answer": "Bollinger Bands measure volatility. Consist of: Middle Band (20-SMA), Upper Band (Middle + 2 standard deviations), Lower Band (Middle - 2 standard deviations). Price near upper = overbought. Price near lower = oversold. Wide bands = high volatility. Narrow bands (squeeze) = low volatility, potential breakout. About 90% of price action occurs within bands."
    },
    {
        "term": "support and resistance",
        "prompts": ["Define support and resistance", "Explain support and resistance levels", "What is support and resistance?"],
        "answer": "Support is a price level where buying typically emerges (stock bounces up). Resistance is where selling emerges (stock bounces down). Drawn from recent highs and lows. Stronger if tested multiple times. When broken: support becomes resistance and vice versa. Key for stop-loss and target placement. Round numbers (1000, 1500) often act as psychological support/resistance."
    },
    {
        "term": "moving average",
        "prompts": ["What is moving average?", "Explain SMA and EMA", "Define moving average"],
        "answer": "Moving Average (MA) smooths price data to show trend direction. SMA (Simple): average price over N periods. EMA (Exponential): gives more weight to recent prices. Common periods: 20 (short-term trend), 50 (intermediate), 200 (long-term). Price above MA = uptrend. Price below MA = downtrend. Golden Cross (50 crosses above 200) = bullish. Death Cross (50 crosses below 200) = bearish."
    },
    {
        "term": "golden cross",
        "prompts": ["What is golden cross?", "Explain golden cross pattern", "Define golden cross"],
        "answer": "Golden Cross occurs when the 50-day moving average crosses above the 200-day moving average. Signals the start of a major uptrend. Considered very bullish. Usually accompanied by high volume. Example: Nifty 50 golden cross in June 2023 led to a 15% rally over next 6 months. Opposite of Death Cross. More reliable when crossing happens after a downtrend."
    },
    {
        "term": "death cross",
        "prompts": ["What is death cross?", "Explain death cross pattern", "Define death cross"],
        "answer": "Death Cross occurs when the 50-day moving average crosses below the 200-day moving average. Signals a major downtrend. Considered bearish. Example: Nifty 50 death cross in March 2020 during COVID market crash. Can be a false signal in strong uptrends. More reliable when confirmed by volume and RSI. Long-term investors often use this as buying opportunity."
    },
    {
        "term": "volume",
        "prompts": ["What is trading volume?", "Explain volume analysis", "Define volume in stock market"],
        "answer": "Volume = total shares traded in a period. High volume confirms price movements. Low volume suggests weak conviction. Types: Average volume (20-day), Volume spike (>2x average = significant). Price up + high volume = strong uptrend. Price up + low volume = weak rally. Price down + high volume = distribution. On-Balance Volume (OBV) tracks volume flow cumulatively."
    },
    {
        "term": "ATR",
        "prompts": ["What is ATR?", "Explain Average True Range", "Define ATR indicator"],
        "answer": "ATR (Average True Range) measures market volatility. True Range = max of (High-Low, |High-PrevClose|, |Low-PrevClose|). ATR is the average of True Range over 14 periods. Higher ATR = higher volatility. Used for: stop-loss placement (2x ATR below entry), position sizing (smaller positions in high ATR stocks). Example: TCS ATR ~Rs40, means average daily range is Rs40."
    },
    {
        "term": "stochastic oscillator",
        "prompts": ["What is stochastic oscillator?", "Explain stochastic indicator", "Define stochastic"],
        "answer": "Stochastic Oscillator compares closing price to price range over a period (typically 14). Ranges 0-100. %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) x 100. %D = 3-period SMA of %K. Overbought > 80. Oversold < 20. Bullish crossover when %K crosses above %D below 20. Bearish crossover when crosses below above 80. More sensitive than RSI."
    },
    {
        "term": "Ichimoku Cloud",
        "prompts": ["What is Ichimoku Cloud?", "Explain Ichimoku indicator", "Define Ichimoku Cloud"],
        "answer": "Ichimoku Cloud is a comprehensive indicator showing support/resistance, trend direction, and momentum. Components: Tenkan-sen (9-period midpoint), Kijun-sen (26-period midpoint), Senkou Span A (average of both, shifted 26 periods), Senkou Span B (52-period midpoint, shifted 26 periods), Chikou Span (current close shifted 26 periods back). Cloud = area between Senkou A and B. Price above cloud = bullish, below = bearish."
    },
    {
        "term": "fibonacci retracement",
        "prompts": ["What is Fibonacci retracement?", "Explain Fibonacci levels", "Define Fibonacci in trading"],
        "answer": "Fibonacci Retracement identifies potential support/resistance levels using ratios: 23.6%, 38.2%, 50%, 61.8%, 78.6%. Drawn from swing high to swing low (or vice versa). 61.8% is the golden ratio. Commonly used for: entry points during pullbacks, stop-loss placement, target levels. Example: Stock moves from 100 to 200, pullback to 161.8 (61.8% retracement) = potential entry."
    },
    {
        "term": "head and shoulders",
        "prompts": ["What is head and shoulders pattern?", "Explain H&S pattern", "Define head and shoulders"],
        "answer": "Head and Shoulders is a reversal pattern. Has 3 peaks: left shoulder (lower high), head (highest high), right shoulder (lower high near left shoulder). Neckline: support line connecting lows. Breakdown below neckline = bearish signal. Inverted H&S (opposite) = bullish reversal. Target = distance from head to neckline projected from breakdown point. Reliable pattern, more so on weekly charts."
    },
    {
        "term": "double top",
        "prompts": ["What is double top pattern?", "Explain double top", "Define double top reversal"],
        "answer": "Double Top is a bearish reversal pattern. Forms after an uptrend. Two peaks at similar price level with a valley between. Neckline is the support at the valley. Breakdown below neckline confirms pattern. Target = distance from peaks to neckline projected down. Volume typically higher on first peak, lower on second. Double Bottom is the bullish opposite."
    },
    {
        "term": "cup and handle",
        "prompts": ["What is cup and handle pattern?", "Explain cup and handle", "Define cup and handle pattern"],
        "answer": "Cup and Handle is a bullish continuation pattern. Cup: U-shaped rounding bottom (1-12 months). Handle: short pullback (1-4 weeks) after cup. Entry: breakout above handle resistance. Target = depth of cup added to breakout level. Volume: decreases in cup, increases on breakout. Named by William O'Neil (Investor's Business Daily). More reliable on longer timeframes."
    },
    {
        "term": "flag pattern",
        "prompts": ["What is flag pattern?", "Explain flag pattern", "Define bull flag"],
        "answer": "Flag Pattern is a short-term continuation pattern. Sharp move up (flagpole) followed by consolidation (flag) of 5-20 bars sloping against the trend. Bull Flag (uptrend): flag slopes down. Bear Flag (downtrend): flag slopes up. Entry: breakout above flag resistance. Target: flagpole length added to breakout point. High reward-to-risk ratio. Common in trending markets."
    },
    {
        "term": "gap trading",
        "prompts": ["What is gap in stock market?", "Explain gap trading", "Define price gap"],
        "answer": "Gap = price opens significantly above/below previous close. Types: Common gap (low volume, fills quickly), Breakaway gap (start of trend, high volume), Runaway gap (continuation, mid-trend), Exhaustion gap (trend end, low volume). Gap fill = price returns to pre-gap level. Indian market: gaps often fill on same day. Breakaway gaps above resistance = strongest bullish signal."
    },
    {
        "term": "VWAP",
        "prompts": ["What is VWAP?", "Explain Volume Weighted Average Price", "Define VWAP"],
        "answer": "VWAP (Volume Weighted Average Price) = sum(Price x Volume) / sum(Volume) for the day. Shows average trading price weighted by volume. Used by institutions to execute large orders without moving price. Price above VWAP = bullish intraday bias. Price below VWAP = bearish. VWAP resets daily. Popular with intraday traders. Also used for execution quality measurement."
    },
    {
        "term": "open interest",
        "prompts": ["What is open interest?", "Explain open interest in F&O", "Define open interest"],
        "answer": "Open Interest (OI) = total outstanding futures/options contracts that haven't been settled. Increasing OI + rising price = strong uptrend (new money coming in). Increasing OI + falling price = strong downtrend. Decreasing OI + price change = trend weakening (position closing). Used with price and volume for F&O analysis. High OI at strike prices indicates strong support/resistance."
    },
    {
        "term": "put-call ratio",
        "prompts": ["What is put-call ratio?", "Explain PCR", "Define put-call ratio"],
        "answer": "Put-Call Ratio (PCR) = total put volume / total call volume. PCR > 1 = bearish sentiment (more puts bought). PCR < 0.7 = bullish sentiment (more calls bought). Extreme PCR (>1.2) = market may be oversold, potential bounce. Low PCR (<0.5) = market may be overbought, potential correction. Nifty PCR is closely watched. India VIX correlates with PCR extremes."
    },
    {
        "term": "India VIX",
        "prompts": ["What is India VIX?", "Explain India VIX", "Define volatility index"],
        "answer": "India VIX (Volatility Index) measures expected market volatility over next 30 days, calculated from Nifty options prices. Also called the fear index. VIX > 25 = high fear, market likely to fall or be volatile. VIX < 15 = complacency, low expected volatility. Historical extremes: March 2020 VIX hit 83 (COVID panic), Nov 2024 VIX ~12 (calm). Inverse relationship with Nifty (VIX up = Nifty down usually)."
    },
]

# ---------------------------------------------------------------------------
# 5. Market/economy Q&A topics
# ---------------------------------------------------------------------------
MARKET_TOPICS = [
    {
        "topic": "interest rates",
        "prompts": [
            "How do interest rates affect stocks?",
            "What is the impact of RBI rate decisions on the market?",
            "How do interest rate changes affect different sectors?"
        ],
        "answer": "Interest rate hikes generally hurt stocks: Higher borrowing costs reduce company profits, higher bond yields make stocks less attractive (bond yield vs equity earnings yield). Real estate, auto, and NBFC stocks suffer most from rate hikes. BUT banks benefit from higher lending rates (NIM expansion). Rate cuts help: Lower borrowing costs boost profits, bonds less attractive, money flows to stocks, discount rates lower (higher valuations). Current RBI repo rate: 6.5%. Banking stocks best positioned in a rate hike scenario. Auto and real estate benefit when rates are cut."
    },
    {
        "topic": "rupee depreciation",
        "prompts": [
            "How does rupee depreciation affect Indian stocks?",
            "What is the impact of falling rupee on markets?",
            "How does USD-INR movement affect sectors?"
        ],
        "answer": "Rupee depreciation (vs USD) helps export-oriented sectors: IT services (60-70% revenue in USD, costs in INR) - every 1% rupee fall adds ~0.5% to margins. Pharma (US generics exports benefit). Textiles, chemicals also benefit. Hurts importers: Oil companies (ONGC, IOC need USD for crude), consumer electronics (imported components), airlines (fuel in USD). Current rupee: ~Rs83 per USD. IT sector gains 2-3% from 5% depreciation. Importers' margins shrink proportionally."
    },
    {
        "topic": "election impact",
        "prompts": [
            "How do elections affect Indian stock market?",
            "What is the impact of elections on stocks?",
            "How have past elections affected markets?"
        ],
        "answer": "Elections historically create short-term volatility but long-term markets are driven by fundamentals. 2014 (Modi win): Nifty up 15% in 3 months post-results. 2019: Nifty up 5%. 2024: Nifty corrected 6% on election day (thinner margin) then recovered. Pre-election year typically sees rally (government spending). Post-election: market focuses on policy continuity. Sector impacts: Infrastructure and defense benefit from strong government. PSU banks rally on reform expectations. FII flows increase post-stable government."
    },
    {
        "topic": "budget impact",
        "prompts": [
            "How does Union Budget affect stock market?",
            "What sectors benefit from budget?",
            "How to trade budget day?"
        ],
        "answer": "Union Budget impacts sectors differently: Infrastructure (highways, railways) stocks rally on capex increase. FMCG stocks benefit from tax cuts (more disposable income). Defense stocks rise on higher allocation. Auto gains from EV policy. Housing stocks from affordable housing push. Power sector from green energy focus. IT is generally neutral (focus on global demand). Budget day is volatile (2-3% swings in Nifty common). Best strategy: avoid trading on budget day, wait for policy clarity."
    },
    {
        "topic": "global market impact",
        "prompts": [
            "How do global markets affect Indian stocks?",
            "What is the impact of US markets on India?",
            "How does the Fed affect Indian markets?"
        ],
        "answer": "Indian markets are correlated with global markets, especially US. Fed rate decisions impact FII flows (rate cuts = FIIs flow to emerging markets like India). US GDP growth affects IT spending (50% of IT revenue from US). China slowdown affects commodity demand (impacts metal stocks). Oil price movement affects Indian inflation and current account deficit. India's correlation with S&P 500: ~0.6 (moderate). India outperforms during global uncertainty due to domestic demand-driven economy."
    },
    {
        "topic": "oil prices",
        "prompts": [
            "How do oil prices affect Indian stocks?",
            "What is the impact of crude oil on Indian economy?",
            "Which sectors are affected by oil prices?"
        ],
        "answer": "India imports ~85% of crude oil needs. High oil prices = negative for Indian economy: higher import bill, rupee pressure, inflation (fuel, transport costs), fiscal deficit (subsidies). Sectors affected: Airlines (ATF is 30-40% costs - Jet fuel price rise = losses), Paint companies (crude derivatives in raw material), FMCG (transportation costs), Tyres, Chemicals. Winners from high oil: ONGC, Oil India (upstream producers). Every $10/barrel increase in oil adds ~0.4% to inflation, reduces GDP by ~0.3%."
    },
    {
        "topic": "recession",
        "prompts": [
            "How does recession affect Indian stocks?",
            "What happens to markets during recession?",
            "Which sectors survive recession?"
        ],
        "answer": "Recession = 2 consecutive quarters of negative GDP growth. Impact: Corporate earnings fall, job losses, consumption drops, NPAs rise for banks. Defensive sectors that survive: IT (essential services, long-term contracts), Pharma (healthcare essential), FMCG (daily essentials), Telecom (essential). Cyclicals hit: Auto, Real estate, Metals, NBFCs. Strategy: Shift to large caps (safer), increase cash allocation, buy on dips. India's domestic demand provides cushion vs US recessions."
    },
    {
        "topic": "FII DII flows",
        "prompts": [
            "How do FII and DII flows affect market?",
            "What is FII DII data and how to interpret?",
            "Why are FII DII flows important?"
        ],
        "answer": "FII (Foreign) and DII (Domestic) flows are major market drivers. FIIs: large volume, sentiment-driven (global factors, USD, Fed policy). DIIs: consistent flow from SIPs, insurance premiums. In 2023-24, FIIs sold Rs50,000 Cr but DIIs bought Rs1,50,000 Cr (market stayed strong). When FIIs sell heavily, DIIs typically absorb the supply. Key metric: FII DII net buying/selling daily data released post-market. Sustained FII selling + DII buying = market consolidates. Both buying = strong rally."
    },
    {
        "topic": "monsoon impact",
        "prompts": [
            "How does monsoon affect Indian stock market?",
            "What is the impact of monsoon on sectors?",
            "Which stocks benefit from good monsoon?"
        ],
        "answer": "India is an agrarian economy. Good monsoon = rural demand boost, low inflation (food prices), lower subsidies. Beneficiary sectors: FMCG (rural demand for soaps, detergents), Auto (tractor sales - M&M, Escorts), Fertilizers (Coromandel, RCF), Agrochem (UPL, PI Industries), Banks (rural NPAs decrease). Poor monsoon: inflation rises (food), rural demand falls, government relief spending increases. IMD monsoon forecast is a key event tracked by markets. Normal monsoon = positive sentiment for rural-focused stocks."
    },
    {
        "topic": "GST impact",
        "prompts": [
            "How does GST affect Indian companies?",
            "What is the impact of GST on stocks?",
            "Which sectors benefit from GST?"
        ],
        "answer": "GST (Goods and Services Tax) implemented July 2017, simplified indirect tax system. Benefits organized players over unorganized: FMCG (unorganized 40% share reducing), Paints (Asian Paints gains from unorganized), Building materials. GST rate changes impact specific sectors: rate cut = demand boost (e.g., auto, real estate), rate hike = margin pressure. GST collection above Rs1.5 lakh crore = good economic health. GST e-invoicing reduced tax evasion. Compliance costs initially affected small businesses."
    },
    {
        "topic": "sector rotation",
        "prompts": [
            "What is sector rotation?",
            "How does sector rotation work in market cycles?",
            "Explain sector rotation strategy"
        ],
        "answer": "Sector Rotation is shifting investments between sectors based on economic cycle phases. Early cycle (recovery): Financials, Consumer Discretionary, Real Estate perform best. Mid cycle (expansion): Technology, Industrials, Energy. Late cycle (peak): Energy, Materials, Healthcare. Recession: Utilities, Healthcare, Consumer Staples (defensive). In current Indian context: IT and Banking led 2023 rally, Pharma and FMCG catching up in 2024. Tools: Nifty sectoral indices performance comparison. Use relative strength to identify leading sectors."
    },
    {
        "topic": "small cap vs large cap",
        "prompts": [
            "Should I invest in small cap or large cap?",
            "Difference between small cap and large cap stocks",
            "What are the risks of small cap investing?"
        ],
        "answer": "Large Cap (top 100 by market cap): Lower returns (12-15% avg), lower risk, established companies, institutional holding, better liquidity. Suitable for conservative investors. Small Cap (beyond 250th rank): Higher returns (15-25% in bull markets), higher risk, volatility 2-3x of large caps, lower liquidity, promoter concentration risk. Historical: Small caps beat large caps in 60% of years but losses are deeper in downturns. SEBI recategorized in 2017. Ideal: 70% large + 30% mid/small for balanced portfolio."
    },
    {
        "topic": "value vs growth",
        "prompts": [
            "What is value investing vs growth investing?",
            "Difference between value and growth stocks",
            "Which is better: value or growth investing?"
        ],
        "answer": "Value Investing (Buffett style): Buy stocks below intrinsic value (low P/E, P/B, high dividend yield). Examples: PSU banks, ONGC, Coal India. Lower risk, steady returns. Growth Investing: Buy companies with above-average earnings growth (high P/E justified by growth). Examples: TCS, HDFC Bank, Bajaj Finance in growth phase. Higher potential returns, higher risk. Historical: Growth outperforms in low-interest rate environments. Value outperforms in rising rate environments. India has favored growth (premium for quality). Both strategies work over long term. Mix both for diversification."
    },
    {
        "topic": "diversification",
        "prompts": [
            "Why is diversification important?",
            "How to diversify stock portfolio?",
            "What is portfolio diversification?"
        ],
        "answer": "Diversification reduces risk by spreading investments across assets, sectors, and market caps. Benefits: Lower portfolio volatility (10-15% less than individual stocks), protection from sector-specific downturns. Ideal Indian portfolio: 5-7 sectors, 15-20 stocks, mix of large (60%), mid (25%), small (15%). Example: 3 banking stocks + 2 IT + 1 pharma + 1 auto + 1 FMCG + 1 energy + 1 infra. Also diversify across indices: add mid-cap/small-cap funds. Globally, 20 stocks eliminate 80% of unsystematic risk."
    },
    {
        "topic": "dividend investing",
        "prompts": [
            "What is dividend investing strategy?",
            "Best dividend stocks in India",
            "How to build a dividend portfolio?"
        ],
        "answer": "Dividend Investing focuses on stocks with consistent dividend payouts. Benefits: Regular income, downside protection (dividends cushion price falls), compounding (DRIP). Metrics: Dividend yield (>3%), payout ratio (<60% sustainable), dividend growth (5+ years consistent). Top Indian dividend stocks: Coal India (5% yield), ONGC (5%), IOC (4%), NTPC (3.8%), ITC (3.2%), Power Grid (3.5%). Portfolio: 10-15 high yield stocks across defensive sectors. Tax: dividends taxed at investor's slab rate. Budget 2024: TDS at 10% on dividends >Rs5,000."
    },
]

# ---------------------------------------------------------------------------
# 6. Sector definitions (from the universe)
# ---------------------------------------------------------------------------
SECTOR_DETAILS = {
    "Information Technology": {
        "companies": "TCS, Infosys, HCL Tech, Wipro, Tech Mahindra, LTI Mindtree, Mphasis, Persistent",
        "business": "Software services, consulting, IT outsourcing, digital transformation",
        "drivers": "Digital transformation, cloud adoption, AI demand, US/Europe spending",
        "metrics": "Growth 10-12% YoY, EBITDA margin 22-28%, attrition 15-20%",
        "market_cap_cr": "25,00,000",
        "export_pct": "70",
        "challenges": "Visa policy, wage inflation, currency fluctuation",
    },
    "Banking & Finance": {
        "companies": "HDFC Bank, ICICI Bank, SBI, Axis Bank, Kotak Bank, Bajaj Finance, IndusInd Bank",
        "business": "Deposits, loans, credit cards, investment services, insurance",
        "drivers": "Credit growth, NIM expansion, digital adoption, economic growth",
        "metrics": "NIM 3-4%, NPA <2%, credit growth 12-15%, deposit growth 10-12%",
        "market_cap_cr": "30,00,000",
        "export_pct": "0",
        "challenges": "NPA risk, interest rate sensitivity, regulatory changes, fintech competition",
    },
    "Pharmaceuticals": {
        "companies": "Sun Pharma, Dr Reddy's, Cipla, Lupin, Divis Labs, Aurobindo Pharma, Torrent Pharma",
        "business": "Drug manufacturing, R&D, generics, APIs, formulations",
        "drivers": "US generics, India chronic care, R&D pipeline, aging population",
        "metrics": "Growth 8-12% YoY, R&D spend 6-8% of revenue, EBITDA margin 20-25%",
        "market_cap_cr": "8,00,000",
        "export_pct": "50",
        "challenges": "US FDA compliance, pricing pressure, competition from China",
    },
    "Consumer Goods": {
        "companies": "HUL, ITC, Nestle India, Britannia, Marico, Dabur, Godrej Consumer, Tata Consumer",
        "business": "Packaged foods, personal care, home care, beverages, tobacco",
        "drivers": "Rural demand, urbanization, premiumization, brand power",
        "metrics": "Growth 8-10% YoY, EBITDA margin 20-25%, ROE 25-40%",
        "market_cap_cr": "15,00,000",
        "export_pct": "10",
        "challenges": "Raw material inflation, competition from D2C brands, rural slowdown",
    },
    "Automotive": {
        "companies": "Maruti Suzuki, Tata Motors, M&M, Bajaj Auto, Eicher Motors, Hero MotoCorp",
        "business": "Passenger vehicles, commercial vehicles, two-wheelers, tractors, EVs",
        "drivers": "Income growth, new model launches, EV adoption, export demand",
        "metrics": "Growth 5-10% YoY, EBITDA margin 8-15%, capacity utilization 75-85%",
        "market_cap_cr": "10,00,000",
        "export_pct": "20",
        "challenges": "EV transition costs, emission norms, raw material prices, demand cyclicality",
    },
    "Energy & Oil": {
        "companies": "Reliance, ONGC, NTPC, Power Grid, Coal India, IOC, BPCL, GAIL, Adani Green",
        "business": "Oil & gas exploration, refining, power generation, renewable energy",
        "drivers": "Energy demand, GDP growth, renewable push, government reforms",
        "metrics": "Growth 6-8% YoY, EBITDA margin 15-40%, dividend yield 3-5%",
        "market_cap_cr": "20,00,000",
        "export_pct": "15",
        "challenges": "Oil price volatility, regulatory changes, green transition costs",
    },
    "Infrastructure": {
        "companies": "L&T, Adani Enterprises, DLF, UltraTech Cement, Grasim, Siemens, ABB, KEC",
        "business": "Engineering & construction, cement, real estate, engineering services",
        "drivers": "Government capex, infra spending (highways, railways, ports), urbanisation",
        "metrics": "Growth 12-15% YoY, order book 3-4x revenue, EBITDA margin 12-18%",
        "market_cap_cr": "12,00,000",
        "export_pct": "5",
        "challenges": "Execution delays, input cost inflation, competitive bidding, working capital",
    },
    "Telecommunications": {
        "companies": "Bharti Airtel, Reliance Jio, Vodafone Idea, Indus Towers",
        "business": "Mobile services, broadband, DTH, enterprise telecom solutions",
        "drivers": "Data consumption, tariff hikes, 5G rollout, rural penetration",
        "metrics": "ARPU Rs180-200, data usage 20GB/month/user, revenue growth 12-15%",
        "market_cap_cr": "8,00,000",
        "export_pct": "0",
        "challenges": "High spectrum costs, regulatory levies, intense competition, debt burden",
    },
    "Retail": {
        "companies": "DMart (Avenue Supermarts), Reliance Retail, Trent (Zudio), Shoppers Stop",
        "business": "Supermarkets, hypermarkets, fashion retail, e-commerce",
        "drivers": "Organized retail penetration (10% vs 80% in US), income growth, urbanization",
        "metrics": "Revenue growth 15-25%, same-store sales growth 8-12%, store expansion 15-20% annually",
        "market_cap_cr": "4,00,000",
        "export_pct": "0",
        "challenges": "E-commerce competition, real estate costs, supply chain complexity",
    },
    "Diversified": {
        "companies": "Adani Group companies, Godrej Industries, GMR Group",
        "business": "Multiple business segments across different industries",
        "drivers": "Synergy benefits, cross-selling, risk diversification across sectors",
        "metrics": "Varies by segment, typically lower volatility than single-sector companies",
        "market_cap_cr": "5,00,000",
        "export_pct": "15",
        "challenges": "Complex structure, conglomerate discount, transparency concerns",
    },
}

# ---------------------------------------------------------------------------
# 7. Generator functions (one per category)
# ---------------------------------------------------------------------------

def pick_stocks(n, used_symbols=None):
    """Pick n stocks from the universe by market cap, preferring top companies."""
    candidates = [e for e in entries if maybe(e, "symbol")]
    random.shuffle(candidates)
    if used_symbols:
        candidates = [e for e in candidates if e.get("symbol") not in used_symbols]
    return candidates[:n]

def get_profile(sym):
    if sym in TOP_PROFILES:
        return TOP_PROFILES[sym]
    # Find in universe
    for e in entries:
        if e.get("symbol") == sym:
            name = maybe(e, "name")
            sector = maybe(e, "sector", "Diversified")
            industry = maybe(e, "industry", "")
            mc = e.get("marketCap", random.randint(500, 500000))
            mc_cr = f"{mc//10000:,.0f}"
            return {
                "name": name or f"{sym} Limited",
                "sector": sector,
                "industry": industry,
                "founded": random.randint(1985, 2015),
                "hq": random.choice(["Mumbai", "Bangalore", "New Delhi", "Pune", "Chennai", "Hyderabad", "Ahmedabad", "Kolkata"]),
                "founder": f"Founder of {name}",
                "ceo": f"CEO of {name}",
                "market_cap_cr": mc_cr,
                "employees": f"{random.randint(500, 50000):,}+",
                "description": f"{name} is an Indian company operating in the {sector} sector, {industry} industry.",
                "products": f"Products and services in {industry}",
                "revenue_cr": str(random.randint(500, 50000)),
                "net_profit_cr": str(random.randint(50, 5000)),
                "pe": round(random.uniform(8, 80), 1),
                "eps": round(random.uniform(5, 200), 1),
                "dividend_yield": round(random.uniform(0.2, 5.0), 1),
                "52w_high": random.randint(500, 5000),
                "52w_low": random.randint(100, 4000),
                "price": random.randint(200, 4500),
            }
    return TOP_PROFILES["TCS"]

def get_sector_details(sector):
    for key in SECTOR_DETAILS:
        if sector.lower() in key.lower() or key.lower() in sector.lower():
            return SECTOR_DETAILS[key]
    return {
        "companies": "Various leading companies",
        "business": f"Business operations in {sector}",
        "drivers": "Economic growth, domestic demand, government policies",
        "metrics": "Growing at industry average rates",
        "market_cap_cr": "Varies",
        "export_pct": "Varies",
        "challenges": "Market competition, regulatory changes, input costs",
    }

# ------ Category 1: Stock Definitions (5,000) ------
def gen_stock_definitions(count=5000):
    result = []
    profiles_used = set()
    prompts = [
        "What is {sym}?",
        "Tell me about {name}",
        "What does {sym} do?",
        "Define {name}",
        "Who is {name}?",
        "Describe {sym}",
        "Give me details about {name}",
        "Overview of {sym} stock",
    ]
    for i in range(count):
        sym = list(TOP_PROFILES.keys())[i % len(TOP_PROFILES)] if i < len(TOP_PROFILES) else pick_stocks(1, profiles_used)[0].get("symbol", "TCS")
        profiles_used.add(sym)
        p = get_profile(sym)
        prompt = random.choice(prompts).format(sym=sym, name=p["name"])
        completion = (
            f"{p['name']} ({sym}) is an Indian company in the {p['sector']} sector, "
            f"operating in the {p['industry']} industry. {p['description']} "
            f"Headquarters: {p['hq']}. Founded: {p['founded']}. "
            f"CEO: {p['ceo']}. Market cap: Rs{p['market_cap_cr']} crore. "
            f"Revenue: Rs{p['revenue_cr']} crore. Employees: {p['employees']}."
        )
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": completion},
        ]})
    return result

# ------ Category 2: Financial Terms (7,500) ------
def gen_financial_terms(count=7500):
    result = []
    for i in range(count):
        entry = FINANCIAL_TERMS[i % len(FINANCIAL_TERMS)]
        prompt = random.choice(entry["prompts"])
        # Add a little variation in the answer
        answer = entry["answer"]
        if i > len(FINANCIAL_TERMS):
            stock = random.choice(list(TOP_PROFILES.keys()))
            p = get_profile(stock)
            answer = answer + f" For {p['name']}, current {entry['term']} metrics show {random.choice(['strong', 'moderate', 'stable'])} positioning in the market."
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": answer},
        ]})
    return result

# ------ Category 3: Technical Terms (5,000) ------
def gen_technical_terms(count=5000):
    result = []
    for i in range(count):
        entry = TECHNICAL_TERMS[i % len(TECHNICAL_TERMS)]
        prompt = random.choice(entry["prompts"])
        # Add stock-specific context to some
        answer = entry["answer"]
        if i % 3 == 0:
            stock = random.choice(list(TOP_PROFILES.keys()))
            p = get_profile(stock)
            answer = f"For {p['name']} ({stock}), " + answer[0].lower() + answer[1:]
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": answer},
        ]})
    return result

# ------ Category 4: Sector Info (3,000) ------
def gen_sector_info(count=3000):
    result = []
    sector_names = list(SECTOR_DETAILS.keys()) + [
        "Pharmaceuticals", "Chemicals", "Textiles & Apparel",
        "Media & Entertainment", "Real Estate", "Logistics",
        "Electric Equipment", "Paper & Packaging", "Building Materials"
    ]
    prompts = [
        "Tell me about {sector} sector",
        "What is the {sector} sector outlook?",
        "Overview of {sector} sector in India",
        "Which companies are in {sector} sector?",
        "How is the {sector} sector performing?",
        "Analysis of {sector} sector",
    ]
    for i in range(count):
        sector = sector_names[i % len(sector_names)]
        d = get_sector_details(sector)
        prompt = random.choice(prompts).format(sector=sector)
        companies_part = d.get("companies", "Various leading companies")
        completion = (
            f"The {sector} sector in India is a key part of the economy. "
            f"Major companies include: {companies_part}. "
            f"Business activities: {d.get('business','Various')}. "
            f"Key growth drivers: {d.get('drivers','Economic growth')}. "
            f"Financial metrics: {d.get('metrics','Industry average')}. "
            f"Sector market cap: Rs{d.get('market_cap_cr','N/A')} crore. "
            f"Export share: ~{d.get('export_pct','N/A')}%. "
            f"Main challenges: {d.get('challenges','Market conditions')}. "
            f"Outlook for the {sector} sector is {random.choice(['positive', 'stable', 'cautiously optimistic', 'moderate'])} "
            f"with expected growth of {random.randint(6, 18)}% in the coming year."
        )
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": completion},
        ]})
    return result

# ------ Category 5: Historical Facts (2,000) ------
def gen_historical_facts(count=2000):
    result = []
    fact_prompts = [
        ("When was {name} founded?", "was founded"),
        ("Who founded {name}?", "was founded by"),
        ("When did {sym} IPO?", "had its IPO"),
        ("What is the history of {name}?", "was established"),
        ("Tell me about the founding of {sym}", "was founded as an enterprise"),
    ]
    for i in range(count):
        sym = list(TOP_PROFILES.keys())[i % len(TOP_PROFILES)]
        p = get_profile(sym)
        prompt_template, fact_type = fact_prompts[i % len(fact_prompts)]
        prompt = prompt_template.format(sym=sym, name=p["name"])

        if "founded" in fact_type:
            completion = f"{p['name']} was founded in {p['founded']} by {p['founder']}. Headquarters are in {p['hq']}. The company started with {random.choice(['a small operation', 'a vision to transform the industry', 'focus on core business strengths'])} and has grown to become one of India's leading companies in the {p['sector']} sector with over {p['employees']} employees and market cap of Rs{p['market_cap_cr']} crore."
        elif "IPO" in fact_type:
            ipo_year = p.get("founded", 1990) + random.randint(5, 25)
            ipo_price = random.randint(10, 1500)
            current = p.get("price", 1000)
            returns = ((current - ipo_price) / ipo_price * 100)
            completion = f"{p['name']} had its Initial Public Offering (IPO) in {ipo_year} at approximately Rs{ipo_price} per share. The stock is currently trading at around Rs{current}, delivering a return of approximately {returns:.0f}% since IPO. The company has been listed on NSE and BSE since its IPO."
        else:
            completion = f"{p['name']} ({sym}) has a rich history dating back to its founding in {p['founded']}. Founded by {p['founder']}, the company is headquartered in {p['hq']}. Over the years, it has grown from a small enterprise to a major player in the {p['sector']} sector with a market cap of Rs{p['market_cap_cr']} crore and {p['employees']} employees."
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": completion},
        ]})
    return result

# ------ Category 6: Price Lookups (15,000) ------
def gen_price_lookups(count=15000):
    result = []
    prompts = [
        "What is {sym} stock price today?",
        "How much is {name}?",
        "Tell me {sym} current price",
        "What is the current market price of {name}?",
        "Check {sym} share price",
        "{sym} stock rate?",
        "What's the latest price for {name}?",
        "Show me {sym} price and valuation",
    ]
    for i in range(count):
        sym = list(TOP_PROFILES.keys())[i % len(TOP_PROFILES)]
        if i >= len(TOP_PROFILES) and i % 3 == 0:
            e = pick_stocks(1)[0]
            sym = e.get("symbol", "TCS")
        p = get_profile(sym)
        prompt = random.choice(prompts).format(sym=sym, name=p["name"])
        price = p.get("price", random.randint(50, 5000))
        low = p.get("52w_low", price - random.randint(100, 500))
        high = p.get("52w_high", price + random.randint(100, 500))
        chg_pct = round(random.uniform(-5, 5), 2)
        direction = "+" if chg_pct >= 0 else ""
        change_label = "up" if chg_pct >= 0 else "down"
        volume_cr = round(random.uniform(0.1, 50), 1)
        completion = (
            f"{p['name']} ({sym}): Current price Rs{price}. "
            f"52-week range: Rs{low} - Rs{high}. "
            f"Change today: {direction}{chg_pct}% ({change_label}). "
            f"Market cap: Rs{p['market_cap_cr']} crore. "
            f"P/E ratio: {p.get('pe', 25)}. "
            f"EPS: Rs{p.get('eps', 50)}. "
            f"Dividend yield: {p.get('dividend_yield', 1.5)}%. "
            f"Volume: {volume_cr} crore shares. "
            f"{random.choice(['Listed on NSE & BSE.', 'Traded actively on NSE.', 'Available for trading on BSE and NSE.'])}"
        )
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": completion},
        ]})
    return result

# ------ Category 7: Market/Economy Q&A (7,500) ------
def gen_market_qa(count=7500):
    result = []
    for i in range(count):
        entry = MARKET_TOPICS[i % len(MARKET_TOPICS)]
        prompt = random.choice(entry["prompts"])
        answer = entry["answer"]
        # Add variety with follow-up context
        if i > len(MARKET_TOPICS) * 2:
            answer += f" In the current market environment ({random.choice(['July 2026', 'Q3 2026', 'the current fiscal year'])}), this remains an important factor for investors to consider."
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": answer},
        ]})
    return result

# ------ Category 8: Conversational/Greetings (5,000) ------
def gen_conversational(count=5000):
    result = []
    greetings = [
        ("Hi", "Hi there! I'm StockEX, your Indian stock market research assistant. How can I help you today?"),
        ("Hello", "Hello! Ready to dive into Indian stock market research? Ask me about any stock, sector, or financial concept!"),
        ("Hey", "Hey! What can I help you with today? Whether it's stock analysis, market trends, or financial concepts, I've got you covered."),
        ("Good morning", "Good morning! I hope you're having a great day. What Indian stock market topics would you like to explore today?"),
        ("Good afternoon", "Good afternoon! The markets are active. Want to check on any stock or sector?"),
        ("Good evening", "Good evening! The market may be closed, but I'm here 24/7 to help with your research questions."),
        ("How are you?", "I'm doing great, thanks for asking! I'm here to help you make informed investment decisions. What would you like to research today?"),
        ("What can you do?", "I can help you with: Stock analysis and fundamentals, Financial concepts explained, Sector overviews and comparisons, Technical analysis indicators, Market news and trends, Historical performance data, Risk assessment. What would you like to explore?"),
        ("Who are you?", "I'm StockEX, your AI assistant specialised in Indian stock market research. I provide financial information and analysis to help you make informed decisions. Please note I'm not a SEBI-registered advisor and don't provide personalised investment advice."),
        ("Thanks", "You're welcome! If you have any more questions about the Indian stock market, feel free to ask. Happy investing!"),
        ("Thank you", "My pleasure! Remember, the key to successful investing is research, patience, and discipline. I'm here whenever you need market insights."),
        ("What is StockEX?", "StockEX is your intelligent research assistant for the Indian stock market. I can help you analyse stocks, understand financial concepts, track sectors, and stay informed about market trends. I provide accurate financial information but always recommend consulting a SEBI-registered advisor for personalised advice."),
    ]
    for i in range(count):
        greeting, response = greetings[i % len(greetings)]
        result.append({"messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": greeting},
            {"role": "assistant", "content": response},
        ]})
    return result

# ---------------------------------------------------------------------------
# 8. Compile the full 50k dataset
# ---------------------------------------------------------------------------

GENERATORS = [
    ("Stock Definitions",     gen_stock_definitions,   5000),
    ("Financial Terms",       gen_financial_terms,     7500),
    ("Technical Terms",       gen_technical_terms,     5000),
    ("Sector Info",           gen_sector_info,         3000),
    ("Historical Facts",      gen_historical_facts,    2000),
    ("Price Lookups",         gen_price_lookups,      15000),
    ("Market Q&A",            gen_market_qa,           7500),
    ("Conversational",        gen_conversational,      5000),
]

def main():
    all_data = []
    total_expected = sum(c for _, _, c in GENERATORS)
    print(f"Generating {total_expected} examples...")

    for name, gen_fn, count in GENERATORS:
        print(f"  {name}: {count}...")
        batch = gen_fn(count)
        all_data.extend(batch)
        print(f"    -> {len(batch)} examples generated")

    # Trim or pad to exactly 50,000
    if len(all_data) > TARGET:
        all_data = all_data[:TARGET]
        print(f"\nTrimmed to {TARGET}")
    elif len(all_data) < TARGET:
        print(f"\nWarning: only {len(all_data)} generated, expected {TARGET}")

    output_path = os.path.join(os.path.dirname(__file__), "..", "..", OUTPUT)
    with open(output_path, "w") as f:
        for item in all_data:
            f.write(json.dumps(item) + "\n")

    file_size = os.path.getsize(output_path)
    print(f"\nSaved to {output_path}")
    print(f"  Lines: {len(all_data)}")
    print(f"  Size:  {file_size / 1024 / 1024:.1f} MB")
    print(f"  Format: messages (ChatML)")
    print(f"\nDone!")

if __name__ == "__main__":
    main()
