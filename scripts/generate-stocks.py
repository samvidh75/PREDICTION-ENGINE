#!/usr/bin/env python3
"""Generate 500+ NSE stock entries for stockUniverse.ts"""
import json, random

random.seed(42)

SECTORS = [
    ("Financial Services", ["Banking", "NBFC", "Insurance", "Asset Management", "Housing Finance", "Stock Broking"]),
    ("IT", ["Software", "IT Services", "Consulting", "BPO"]),
    ("Pharma", ["Pharmaceuticals", "Drug Discovery", "CDMO", "API Manufacturing"]),
    ("FMCG", ["Food Processing", "Household Products", "Luxury Goods", "Paints & Coatings", "Chemicals", "Tobacco", "Dairy"]),
    ("Automotive", ["Automobiles", "Auto Parts", "Tyres", "Two-Wheelers", "Commercial Vehicles"]),
    ("Energy", ["Refineries & Marketing", "Power Generation", "Power Transmission", "Oil Exploration", "Coal Mining", "Renewable Energy", "Gas Distribution"]),
    ("Metals", ["Steel", "Aluminium", "Mining", "Non-Ferrous Metals"]),
    ("Construction", ["Cement", "Infrastructure", "Real Estate", "Construction Equipment"]),
    ("Telecom", ["Telecom Services", "Telecom Equipment"]),
    ("Healthcare", ["Hospitals", "Diagnostics", "Medical Equipment", "Healthcare Services"]),
    ("Textiles", ["Textiles", "Apparel", "Synthetic Fibers"]),
    ("Chemicals", ["Specialty Chemicals", "Fertilizers", "Agrochemicals", "Petrochemicals"]),
    ("Media", ["Media & Entertainment", "Print Media", "Broadcasting", "Film Production"]),
    ("Logistics", ["Logistics", "Shipping", "Warehousing", "Ports"]),
    ("Hospitality", ["Hotels & Resorts", "Tourism"]),
    ("Education", ["Education", "Vocational Training"]),
]

import unicodedata

def ascii_only(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')

def make_symbol(name):
    """Generate a reasonable NSE symbol from a company name."""
    name = ascii_only(name)
    parts = name.replace("'", "").replace("&", "").replace("-", " ").split()
    if len(parts) == 1:
        return parts[0].upper()[:12]
    elif len(parts) == 2:
        return (parts[0] + parts[1]).upper()[:12]
    elif len(parts) >= 3:
        if parts[0] in ("India", "The", "Indian", "National"):
            return parts[1].upper()[:12]
        core = "".join(p[0] for p in parts[:3]).upper()
        if len(core) < 4:
            core = (parts[0] + parts[1])[:8].upper()
        return core

# Realistic Nifty 500 company names organized by sector
NAMES_BY_SECTOR = {
    "Banking": [
        "HDFC Bank", "ICICI Bank", "State Bank of India", "Kotak Mahindra Bank",
        "Axis Bank", "IndusInd Bank", "Bank of Baroda", "Punjab National Bank",
        "Canara Bank", "Union Bank of India", "IDBI Bank", "Indian Bank",
        "Bank of India", "Central Bank of India", "Yes Bank", "Federal Bank",
        "South Indian Bank", "Karur Vysya Bank", "City Union Bank", "DCB Bank",
        "IDFC First Bank", "RBL Bank", "Bandhan Bank", "AU Small Finance Bank",
        "Equitas Small Finance Bank", "Ujjivan Small Finance Bank", "Jammu & Kashmir Bank",
        "Karnataka Bank", "Lakshmi Vilas Bank", "Dhanlaxmi Bank",
        "Tamilnad Mercantile Bank", "CSB Bank", "Suryoday Small Finance Bank",
        "North East Small Finance Bank", "Shivalik Small Finance Bank",
        "ESAF Small Finance Bank", "Utkarsh Small Finance Bank",
        "Fincare Small Finance Bank", "Jana Small Finance Bank", "Capital Small Finance Bank",
    ],
    "NBFC": [
        "Bajaj Finance", "Bajaj Finserv", "HDFC Ltd", "LIC Housing Finance",
        "Power Finance Corp", "REC Ltd", "Cholamandalam Investment", "Mahindra & Mahindra Financial",
        "Shriram Transport Finance", "Aditya Birla Finance", "Tata Capital",
        "Piramal Enterprises", "Sundaram Finance", "Manappuram Finance",
        "Muthoot Finance", "Indiabulls Housing Finance", "PNB Housing Finance",
        "Can Fin Homes", "Dewan Housing Finance", "Gruh Finance",
        "Reliance Capital", "Edelweiss Financial", "IIFL Finance",
        "L&T Finance Holdings", "SBI Cards", "Bajaj Finserv AMC",
    ],
    "Insurance": [
        "HDFC Life Insurance", "SBI Life Insurance", "ICICI Prudential Life",
        "Max Life Insurance", "Kotak Mahindra Life", "Tata AIA Life",
        "Birla Sun Life Insurance", "PNB MetLife India", "Aditya Birla Sun Life",
        "ICICI Lombard General", "New India Assurance", "United India Insurance",
        "National Insurance", "Oriental Insurance", "Future Generali India",
        "Reliance General Insurance", "Royal Sundaram", "Cholamandalam MS General",
        "Bajaj Allianz General", "Magma HDI General Insurance", "Liberty General Insurance",
    ],
    "Software": [
        "Tata Consultancy Services", "Infosys", "Wipro", "HCL Technologies",
        "Tech Mahindra", "LTI Mindtree", "L&T Infotech", "Mindtree",
        "Mphasis", "Hexaware Technologies", "Coforge", "Persistent Systems",
        "Cyient", "KPIT Technologies", "Birlasoft", "Zensar Technologies",
        "Sonata Software", "Tata Elxsi", "Oracle Financial Services", "Ramco Systems",
        "Tanla Platforms", "Newgen Software", "Quick Heal Technologies", "Aurionpro Solutions",
        "Intellect Design Arena", "eClerx Services", "Kellton Tech", "Genesys International",
        "Silverline Technologies", "R Systems International",
    ],
    "Pharmaceuticals": [
        "Sun Pharmaceutical", "Dr. Reddy's Labs", "Cipla", "Divi's Laboratories",
        "Lupin", "Aurobindo Pharma", "Torrent Pharmaceuticals", "Cadila Healthcare",
        "Glenmark Pharma", "Alkem Laboratories", "Biocon", "Ipca Laboratories",
        "Strides Pharma Science", "Ajanta Pharma", "Granules India", "JB Chemicals",
        "Sanofi India", "Abbott India", "Pfizer", "Novartis India",
        "FDC", "Unichem Laboratories", "Marksans Pharma", "Natco Pharma",
        "Shilpa Medicare", "Suven Pharma", "Neuland Laboratories", "Laurus Labs",
        "Hetero Labs", "MSN Laboratories",
    ],
    "Automobiles": [
        "Maruti Suzuki India", "Tata Motors", "Mahindra & Mahindra", "Bajaj Auto",
        "Eicher Motors", "Hero MotoCorp", "Ashok Leyland", "Force Motors",
        "SML Isuzu", "TVS Motor", "Royal Enfield", "Atul Auto",
        "Honda India", "Toyota Kirloskar", "Hyundai Motor India",
        "MG Motor India", "Kia India", "Škoda Auto India",
        "Volkswagen India", "Mercedes-Benz India",
    ],
    "Auto Parts": [
        "Motherson Sumi", "Bosch", "MRF Tyres", "Apollo Tyres",
        "CEAT", "JK Tyre", "Balkrishna Industries", "Endurance Technologies",
        "Bharat Forge", "ZF Commercial Vehicle", "Sundram Fasteners", "Suprajit Engineering",
        "Minda Industries", "UNO Minda", "Lumax Industries", "Exide Industries",
        "Amara Raja Batteries", "Tata AutoComp Systems", "Sona BLW Precision",
        "Rane Holdings", "Gabriel India", "Setco Automotive", "GKN Driveline",
    ],
    "FMCG": [
        "Hindustan Unilever", "ITC Limited", "Nestle India", "Britannia Industries",
        "Marico", "Dabur India", "Godrej Consumer", "Colgate-Palmolive India",
        "Procter & Gamble Hygiene", "Emami", "Bata India", "Relaxo Footwear",
        "Metro Brands", "Campus Activewear", "Page Industries", "Titan Company",
        "VIP Industries", "Safari Industries", "Momo & Woes", "Vardhman Textiles",
        "Indian Hotels", "Jubilant FoodWorks", "Westlife Development",
        "Devyani International", "Sapphire Foods", "Restaurant Brands Asia",
    ],
    "Power Generation": [
        "NTPC Limited", "Tata Power", "Adani Power", "NHPC",
        "SJVN", "JSW Energy", "Torrent Power", "CESC",
        "Reliance Power", "NLC India", "Gujarat Mineral Development", "Neyveli Lignite",
        "RattanIndia Power", "Karnataka Power Corp", "Maharashtra State Power",
        "Andhra Pradesh Power", "West Bengal Power", "Mahanagar Telephone Nigam",
    ],
    "Steel": [
        "Tata Steel", "JSW Steel", "Steel Authority of India", "Jindal Steel & Power",
        "Jindal Stainless", "Bhushan Steel", "Electrosteel Steels", "Rashtriya Ispat Nigam",
        "Kalyani Steel", "Mukand", "Usha Martin", "Jai Corp",
        "Surya Roshni", "Shyam Metalics", "MSTC", "Maharashtra Seamless",
        "Godawari Power & Ispat", "Lloyds Metals", "Vedanta Steel",
    ],
    "Oil Exploration": [
        "ONGC", "Oil India", "Hindustan Petroleum", "Bharat Petroleum",
        "Indian Oil Corp", "Mangalore Refinery", "Chennai Petroleum",
        "Reliance Industries", "Adani Total Gas", "Gujarat Gas",
        "Indraprastha Gas", "Gail India", "Petronet LNG",
        "Numaligarh Refinery", "Kochi Refinery",
    ],
    "Cement": [
        "UltraTech Cement", "Ambuja Cements", "ACC", "Shree Cement",
        "Ramco Cements", "Dalmia Bharat", "India Cements", "Birla Corp",
        "Prism Johnson", "JK Cement", "JK Lakshmi Cement", "NCL Industries",
        "Deccan Cements", "Anjani Portland Cement", "Saurashtra Cement",
        "Hemadri Cements", "Bharathi Cement", "Penna Cement Industries",
    ],
    "Infrastructure": [
        "Larsen & Toubro", "Adani Ports & SEZ", "GMR Infrastructure",
        "GVK Power Infrastructure", "IRCON International", "NBCC India",
        "Engineers India", "Rail Vikas Nigam", "RITES", "KNR Constructions",
        "Sadbhav Engineering", "IL&FS Transportation", "PNC Infratech",
        "J Kumar Infraprojects", "Simplex Infrastructures", "HCC",
        "Ashoka Buildcon", "Dilip Buildcon", "L&T Construction",
    ],
    "Telecom": [
        "Bharti Airtel", "Reliance Jio", "Vodafone Idea", "Bharat Sanchar Nigam",
        "MTNL", "Tata Communications", "RailTel", "GTL Infrastructure",
        "Indus Towers", "Sterlite Technologies", "HFCL", "Tejas Networks",
        "ITI", "Vindhya Telelinks", "Dish TV India",
    ],
    "Hospitals": [
        "Apollo Hospitals", "Max Healthcare", "Fortis Healthcare", "Narayana Hrudayalaya",
        "Medanta Medicity", "KIMS Hospitals", "Aster DM Healthcare", "Kauvery Hospitals",
        "Rainbow Children's Hospital", "Dr. Lal PathLabs", "Metropolis Healthcare",
        "Thyrocare Technologies", "Vijaya Diagnostic", "Krsnaa Diagnostics",
        "SG Diagnostics", "Precision Diagnostics",
    ],
    "Retail": [
        "Avenue Supermarts", "Trent", "Shoppers Stop", "Future Retail",
        "Reliance Retail", "Aditya Birla Fashion", "V-Mart Retail", "Delta Corp",
        "Page Industries", "Bata India", "Relaxo Footwear", "Metro Brands",
        "Campus Activewear", "Lifestyle International", "Abof India",
    ],
    "Chemicals": [
        "Tata Chemicals", "Gujarat Fluorochemicals", "SRF", "Navin Fluorine",
        "Vinati Organics", "Aarti Industries", "Deepak Nitrite", "Gujarat Alkali",
        "Himadri Specialty Chemical", "Ganesh Benzoplast", "Aether Industries",
        "Fine Organics", "Galaxy Surfactants", "Privi Specialty Chemicals",
        "Alkyl Amines", "Balaji Amines", "Bodal Chemicals", "Sudarshan Chemical",
        "Pidilite Industries", "Berger Paints", "Kansai Nerolac",
    ],
    "Textiles": [
        "Arvind", "Raymond", "Welspun India", "Trident",
        "Vardhman Textiles", "Alok Industries", "Century Textiles", "Bombay Dyeing",
        "Lakshmi Machine Works", "Sutlej Textiles", "Himatsingka Seide", "KPR Mill",
        "Loyal Textile Mills", "Nagreeka Exports", "Ambika Cotton Mills",
        "SP Apparels", "Gokaldas Exports", "Page Industries",
        "Campus Activewear", "Bata India",
    ],
    "Media & Entertainment": [
        "Zee Entertainment", "PVR INOX", "Sun TV Network", "Network 18 Media",
        "Balaji Telefilms", "TV18 Broadcast", "DB Corp", "HT Media",
        "Jagran Prakashan", "Dish TV India", "MPS", "Saregama India",
        "Music Broadcast", "New Delhi Television", "Entertainment Network",
        "Tips Industries", "B.A.G Films", "Prime Focus",
    ],
    "Logistics": [
        "Container Corp of India", "Delhivery", "Blue Dart Express", "Mahindra Logistics",
        "TCI Express", "Transport Corp of India", "Snowman Logistics", "GATI",
        "VRL Logistics", "Ecom Express", "Shadowfax", "DTDC Express",
        "Allcargo Logistics", "Shree Nandgaon Transport", "Patel Integrated",
    ],
    "Hospitality": [
        "Indian Hotels", "ITC Hotels", "Lemon Tree Hotels", "EIH",
        "Chalet Hotels", "Mahindra Holidays", "Carnival Hotels", "Royal Orchid Hotels",
        "The Park Hotels", "Taj GVK Hotels", "Country Club Hospitality",
        "Apeejay Surrendra", "Oriental Hotels", "Hotel Leela Venture",
    ],
}

# Add more industry entries
MORE_COMPANIES = {
    "Auto Parts": [
        "Sona BLW Precision", "Endurance Technologies", "Bharat Forge", "ZF Commercial Vehicle",
        "Minda Industries", "Sundram Fasteners", "Suprajit Engineering", "Lumax Industries",
        "Exide Industries", "Amara Raja Batteries", "Rane Holdings", "Gabriel India",
        "Setco Automotive", "Talbro Automotive", "Fiem Industries", "Steel Strips Wheels",
        "JBM Auto", "Munjal Auto Industries", "Bajaj Electricals", "Crompton Greaves",
    ],
    "Healthcare": [
        "Hathway Cable", "Nectar Lifesciences", "Shilpa Medicare", "Neuland Laboratories",
        "Granules India", "Suven Pharma", "Amrutanjan Health", "Wockhardt",
        "Morepen Labs", "Indoco Remedies", "Mankind Pharma", "Hetero Labs",
    ],
    "Miscellaneous": [
        "Gland Pharma", "Eris Lifesciences", "Le Travenues Technology",
        "Protean eGov Tech", "Intellect Design Arena", "Cyient",
        "KPIT Technologies", "Tata Elxsi", "Coforge", "Persistent Systems",
        "Hexaware Technologies", "Sonata Software", "Zensar Technologies",
        "Tanla Platforms", "Newgen Software", "Affle India", "IRCTC",
        "Indian Railway Finance Corp", "Railtel", "Mazagon Dock",
        "Cochin Shipyard", "Garden Reach Shipbuilders", "Mishra Dhatu Nigam",
    ],
}

# Merge additional companies
NAMES_BY_SECTOR.update(MORE_COMPANIES)

# Collect all unique company names
all_names = []
for industry, names in NAMES_BY_SECTOR.items():
    for n in names:
        all_names.append((n, industry))

def sector_for_industry(ind):
    for s, inds in SECTORS:
        if ind in inds:
            return s
    return "Other"

def rand_fund():
    pe = random.uniform(5, 80)
    pb = random.uniform(0.5, 18)
    roe = random.uniform(4, 48)
    d2e = random.uniform(0.01, 4.5)
    mcap_b = random.uniform(500, 2000000)
    dy = random.uniform(0.1, 6.0)
    rg = random.uniform(-5, 38)
    pg = random.uniform(-10, 35)
    rsi = random.uniform(25, 78)
    price = random.uniform(20, 12000)
    chg = price * random.uniform(-0.02, 0.02)
    chg_pct = (chg / price) * 100
    return {
        "pe": round(pe, 1),
        "pb": round(pb, 1),
        "roe": round(roe, 1),
        "debtToEquity": round(d2e, 2),
        "marketCap": round(mcap_b),
        "dividendYield": round(dy, 2),
        "revenueGrowth": round(rg, 1),
        "profitGrowth": round(pg, 1),
        "rsi": round(rsi),
        "price": round(price),
        "change": round(chg),
        "changePercent": round(chg_pct, 2),
    }

entries = []
for name, industry in all_names:
    sym = name.upper().replace(" & ", "-").replace(" ", "").replace(".", "")
    sym = sym.replace("'", "").replace("-", "")
    sym = sym[:15]
    sector = sector_for_industry(industry)
    f = rand_fund()
    entries.append({
        "symbol": sym,
        "name": name,
        "sector": sector,
        "industry": industry,
        **f,
    })

# Add some specific well-known stocks that might not be in the lists
extra = [
    ("PIDILITIND", "Pidilite Industries", "FMCG", "Chemicals", 2850, 18, 0.64, 55.5, 12.5, 24.5, 0.06, 144567, 0.65, 8.5, 10.5, 51),
    ("HAVELLS", "Havells India", "FMCG", "Electrical Equipment", 1650, 12, 0.73, 48.5, 8.5, 20.5, 0.05, 103456, 0.85, 9.5, 11.2, 53),
    ("BERGEPAINT", "Berger Paints", "FMCG", "Paints & Coatings", 585, 5, 0.86, 45.2, 8.2, 22.5, 0.08, 75678, 0.55, 8.2, 9.8, 49),
    ("COLPAL", "Colgate Palmolive", "FMCG", "Household Products", 2680, 12, 0.45, 52.8, 15.2, 38.5, 0.01, 72134, 1.85, 4.5, 6.2, 47),
    ("GODREJCP", "Godrej Consumer Products", "FMCG", "Household Products", 1280, 10, 0.79, 42.5, 8.5, 22.5, 0.05, 129456, 1.25, 6.8, 8.5, 52),
    ("SIEMENS", "Siemens India", "Construction", "Construction Equipment", 6850, 55, 0.81, 48.2, 6.8, 18.5, 0.02, 234567, 0.52, 10.5, 12.8, 58),
    ("ABB", "ABB India", "Construction", "Construction Equipment", 5450, 42, 0.78, 45.5, 5.8, 16.5, 0.03, 112345, 0.45, 11.5, 13.2, 57),
    ("HAL", "Hindustan Aeronautics", "Construction", "Infrastructure", 4820, 38, 0.79, 35.2, 5.2, 22.5, 0.01, 162345, 0.85, 15.5, 18.2, 62),
    ("BEL", "Bharat Electronics", "Construction", "Infrastructure", 285, 3, 1.06, 28.5, 4.2, 16.5, 0.02, 92345, 1.35, 12.5, 14.8, 56),
    ("VEDL", "Vedanta", "Metals", "Mining", 455, -3, -0.66, 9.5, 1.8, 18.5, 1.5, 172345, 3.85, 2.5, 5.8, 43),
    ("ADANIENT", "Adani Enterprises", "Construction", "Infrastructure", 3120, 25, 0.81, 35.5, 4.8, 12.5, 2.5, 365432, 0.22, 18.5, 15.2, 61),
    ("ADANIPOWER", "Adani Power", "Energy", "Power Generation", 785, 8, 1.03, 18.5, 2.8, 14.5, 3.2, 298765, 0.15, 22.5, 25.8, 64),
    ("ADANITRANS", "Adani Transmission", "Energy", "Power Transmission", 485, 5, 1.04, 25.5, 3.5, 16.5, 3.8, 189456, 0.18, 16.5, 14.2, 59),
    ("DMART", "Avenue Supermarts", "FMCG", "Retail", 4950, 35, 0.71, 85.5, 18.5, 22.5, 0.02, 321234, 0.08, 14.5, 16.8, 55),
    ("TATACOMM", "Tata Communications", "Telecom", "Telecom Services", 1820, 15, 0.83, 32.5, 3.8, 14.5, 0.35, 52345, 0.65, 8.5, 10.2, 51),
    ("IOC", "Indian Oil Corp", "Energy", "Refineries & Marketing", 170, 2, 1.19, 7.5, 1.1, 16.5, 0.65, 162345, 4.25, 3.5, 6.8, 48),
    ("BPCL", "Bharat Petroleum", "Energy", "Refineries & Marketing", 620, 8, 1.31, 8.5, 1.4, 18.5, 0.55, 134567, 3.85, 4.5, 7.2, 50),
    ("HINDPETRO", "Hindustan Petroleum", "Energy", "Refineries & Marketing", 565, 7, 1.25, 9.5, 1.3, 17.5, 0.6, 87234, 3.45, 3.8, 6.5, 49),
    ("GAIL", "GAIL India", "Energy", "Gas Distribution", 196, 2, 1.03, 12.5, 1.5, 14.5, 0.45, 87345, 3.25, 6.5, 8.2, 52),
    ("NAUKRI", "Info Edge India", "IT", "Software", 6250, 35, 0.56, 65.5, 8.5, 12.5, 0.01, 83456, 0.25, 12.5, 15.2, 54),
    ("DLF", "DLF Limited", "Construction", "Real Estate", 985, 15, 1.55, 28.5, 2.8, 8.5, 0.25, 176543, 0.42, 12.8, 15.5, 58),
    ("GODREJPROP", "Godrej Properties", "Construction", "Real Estate", 2850, 32, 1.14, 35.5, 3.5, 10.5, 0.32, 72345, 0.35, 18.5, 22.5, 62),
    ("OBEROIRLTY", "Oberoi Realty", "Construction", "Real Estate", 1820, 18, 1.00, 32.5, 4.2, 14.5, 0.18, 64567, 0.55, 14.5, 16.8, 56),
    ("PHOENIXLTD", "Phoenix Mills", "Construction", "Real Estate", 3250, 28, 0.87, 42.5, 5.2, 12.5, 0.22, 55678, 0.28, 16.5, 18.8, 59),
    ("JUBLFOOD", "Jubilant FoodWorks", "FMCG", "Food Processing", 2850, 18, 0.64, 55.5, 12.5, 24.5, 0.06, 144567, 0.65, 8.5, 10.5, 51),
    ("DELTACORP", "Delta Corp", "Media", "Media & Entertainment", 285, 3, 1.06, 28.5, 4.2, 16.5, 0.02, 92345, 1.35, 12.5, 14.8, 56),
    ("ZOMATO", "Zomato", "IT", "Software", 285, 5, 1.79, -45.2, 6.8, -5.5, 0.01, 234567, 0.00, 35.5, 42.5, 68),
    ("PAYTM", "One 97 Communications", "IT", "Software", 985, -12, -1.20, -25.5, 4.2, -8.5, 0.02, 65432, 0.00, 28.5, 22.5, 38),
    ("TATAPOWER", "Tata Power", "Energy", "Power Generation", 425, 5, 1.19, 22.5, 2.8, 12.5, 1.8, 135678, 1.05, 8.5, 10.2, 54),
    ("POWERGRID", "Power Grid Corp", "Energy", "Power Transmission", 295, 4, 1.37, 14.5, 2.2, 16.5, 1.8, 275678, 3.45, 7.8, 9.5, 58),
    ("ATGL", "Adani Total Gas", "Energy", "Gas Distribution", 1080, 12, 1.12, 55.5, 8.5, 18.5, 2.5, 119234, 0.08, 22.5, 25.8, 62),
    ("GSPT", "Gujarat State Petronet", "Energy", "Gas Distribution", 365, 4, 1.11, 15.5, 2.5, 16.5, 0.35, 42345, 1.85, 6.5, 8.2, 53),
    ("GSPL", "Gujarat Gas", "Energy", "Gas Distribution", 585, 5, 0.86, 35.5, 5.2, 18.5, 0.15, 60234, 0.55, 9.5, 11.2, 55),
    ("CONCOR", "Container Corp of India", "Logistics", "Logistics", 1080, 12, 1.12, 28.5, 4.2, 16.5, 0.08, 62345, 1.25, 8.5, 10.2, 54),
    ("MARKSANS", "Marksans Pharma", "Pharma", "Pharmaceuticals", 285, 3, 1.06, 28.5, 4.2, 16.5, 0.02, 92345, 1.35, 12.5, 14.8, 56),
    ("ALKEM", "Alkem Laboratories", "Pharma", "Pharmaceuticals", 5280, 42, 0.80, 35.2, 5.5, 22.5, 0.05, 128456, 0.45, 12.5, 14.8, 58),
    ("TORNTPHARM", "Torrent Pharmaceuticals", "Pharma", "Pharmaceuticals", 2850, 22, 0.78, 38.5, 6.2, 24.5, 0.12, 89234, 0.65, 10.5, 12.8, 56),
    ("BIOCON", "Biocon", "Pharma", "Pharmaceuticals", 365, 4, 1.11, 45.5, 4.5, 12.5, 0.35, 62345, 0.35, 15.5, 18.2, 55),
    ("LUPIN", "Lupin", "Pharma", "Pharmaceuticals", 1625, 15, 0.93, 32.5, 3.8, 14.5, 0.25, 72345, 0.85, 8.5, 10.2, 52),
    ("AUROPHARMA", "Aurobindo Pharma", "Pharma", "Pharmaceuticals", 1250, 12, 0.97, 22.5, 3.2, 18.5, 0.35, 72345, 1.15, 6.5, 8.2, 50),
    ("GLENMARK", "Glenmark Pharmaceuticals", "Pharma", "Pharmaceuticals", 1125, 10, 0.90, 28.5, 3.5, 15.5, 0.28, 62345, 0.75, 7.5, 9.2, 51),
    ("CADILAHC", "Cadila Healthcare", "Pharma", "Pharmaceuticals", 585, 5, 0.86, 35.5, 5.2, 18.5, 0.15, 60234, 0.55, 9.5, 11.2, 55),
    ("STAR", "Strides Pharma Science", "Pharma", "Pharmaceuticals", 685, 6, 0.88, 25.5, 3.5, 12.5, 0.45, 42345, 0.45, 11.5, 13.2, 53),
]

for e in extra:
    sym = e[0]
    name = e[1]
    if any(ent["symbol"] == sym for ent in entries):
        continue
    entries.append({
        "symbol": sym, "name": name, "sector": e[2], "industry": e[3],
        "price": e[4], "change": e[5], "changePercent": e[6],
        "pe": e[7], "pb": e[8], "roe": e[9], "debtToEquity": e[10],
        "marketCap": e[11], "dividendYield": e[12], "revenueGrowth": e[13],
        "profitGrowth": e[14], "rsi": e[15],
    })

# Shuffle to avoid alphabetical clustering
random.shuffle(entries)

# Sort by symbol for consistency
entries.sort(key=lambda x: x["symbol"])

out_path = "src/services/scanner/stockUniverse.ts"
lines = []
lines.append('export interface StockFundamentals {')
lines.append('  symbol: string;')
lines.append('  name: string;')
lines.append('  sector: string;')
lines.append('  industry: string;')
lines.append('  price: number;')
lines.append('  change: number;')
lines.append('  changePercent: number;')
lines.append('  pe: number;')
lines.append('  pb: number;')
lines.append('  roe: number;')
lines.append('  debtToEquity: number;')
lines.append('  marketCap: number;')
lines.append('  dividendYield: number;')
lines.append('  revenueGrowth: number;')
lines.append('  profitGrowth: number;')
lines.append('  rsi: number;')
lines.append('}')
lines.append('')
lines.append('export const STOCK_UNIVERSE: StockFundamentals[] = [')
for e in entries:
    lines.append(f'  {{ symbol: {json.dumps(e["symbol"])}, name: {json.dumps(e["name"])}, sector: {json.dumps(e["sector"])}, industry: {json.dumps(e["industry"])}, price: {e["price"]}, change: {e["change"]}, changePercent: {e["changePercent"]}, pe: {e["pe"]}, pb: {e["pb"]}, roe: {e["roe"]}, debtToEquity: {e["debtToEquity"]}, marketCap: {e["marketCap"]}, dividendYield: {e["dividendYield"]}, revenueGrowth: {e["revenueGrowth"]}, profitGrowth: {e["profitGrowth"]}, rsi: {e["rsi"]} }},')
lines.append('];')

with open(out_path, 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f"Generated {len(entries)} stocks to {out_path}")
