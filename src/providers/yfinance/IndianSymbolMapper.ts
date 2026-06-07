/**
 * TRACK-38A — IndianSymbolMapper
 * Maps Indian stock symbols to Yahoo Finance .NS/.BO suffixes.
 *
 * Yahoo Finance symbol format for Indian equities:
 *   NSE (National Stock Exchange): SYMBOL.NS
 *   BSE (Bombay Stock Exchange):   SYMBOL.BO
 */

export class IndianSymbolMapper {
  /** Yahoo Finance suffix for NSE-listed stocks. */
  static readonly NSE_SUFFIX = '.NS';

  /** Yahoo Finance suffix for BSE-listed stocks. */
  static readonly BSE_SUFFIX = '.BO';

  /**
   * NIFTY 50 component stocks mapped to Yahoo Finance NSE symbols.
   * These are the 50 largest Indian companies by market capitalisation
   * listed on the National Stock Exchange, weighted by free-float market cap.
   */
  static readonly NIFTY50_SYMBOLS: string[] = [
    'RELIANCE.NS',
    'TCS.NS',
    'HDFCBANK.NS',
    'INFY.NS',
    'ICICIBANK.NS',
    'HINDUNILVR.NS',
    'ITC.NS',
    'KOTAKBANK.NS',
    'SBIN.NS',
    'BHARTIARTL.NS',
    'LT.NS',
    'AXISBANK.NS',
    'BAJFINANCE.NS',
    'ASIANPAINT.NS',
    'HCLTECH.NS',
    'MARUTI.NS',
    'SUNPHARMA.NS',
    'TITAN.NS',
    'WIPRO.NS',
    'ULTRACEMCO.NS',
    'NTPC.NS',
    'POWERGRID.NS',
    'ONGC.NS',
    'COALINDIA.NS',
    'NESTLEIND.NS',
    'TECHM.NS',
    'BAJAJFINSV.NS',
    'JSWSTEEL.NS',
    'TATASTEEL.NS',
    'GRASIM.NS',
    'HDFCLIFE.NS',
    'SBILIFE.NS',
    'ADANIPORTS.NS',
    'ADANIENT.NS',
    'BRITANNIA.NS',
    'BPCL.NS',
    'CIPLA.NS',
    'DIVISLAB.NS',
    'DRREDDY.NS',
    'EICHERMOT.NS',
    'HEROMOTOCO.NS',
    'HINDALCO.NS',
    'INDUSINDBK.NS',
    'M&M.NS',
    'TATAMOTORS.NS',
    'TATACONSUM.NS',
    'UPL.NS',
    'BAJAJ-AUTO.NS',
    'HDFC.NS',
    'APOLLOHOSP.NS',
  ];

  /**
   * NIFTY 100 component stocks — NIFTY50 + NIFTY Next 50.
   * The NIFTY 100 represents the top 100 companies listed on the NSE
   * by full market capitalisation.
   */
  static readonly NIFTY100_SYMBOLS: string[] = [
    // ---------------------------------------------------
    // NIFTY 50
    // ---------------------------------------------------
    ...IndianSymbolMapper.NIFTY50_SYMBOLS,
    // ---------------------------------------------------
    // NIFTY Next 50 (broad approximation — key large/mid-cap names)
    // ---------------------------------------------------
    'ABBOTINDIA.NS',
    'ALKEM.NS',
    'AMBUJACEM.NS',
    'AUROPHARMA.NS',
    'BAJAJHLDNG.NS',
    'BANDHANBNK.NS',
    'BERGEPAINT.NS',
    'BIOCON.NS',
    'BOSCHLTD.NS',
    'CADILAHC.NS',
    'CANBK.NS',
    'CHOLAFIN.NS',
    'COLPAL.NS',
    'CONCOR.NS',
    'DABUR.NS',
    'DLF.NS',
    'GAIL.NS',
    'GODREJCP.NS',
    'HAVELLS.NS',
    'HDFCAMC.NS',
    'ICICIGI.NS',
    'ICICIPRULI.NS',
    'IDEA.NS',
    'INDIGO.NS',
    'INDUSTOWER.NS',
    'JINDALSTEL.NS',
    'LICHSGFIN.NS',
    'LUPIN.NS',
    'MARICO.NS',
    'MFSL.NS',
    'MUTHOOTFIN.NS',
    'NIACL.NS',
    'NMDC.NS',
    'PAGEIND.NS',
    'PETRONET.NS',
    'PIDILITIND.NS',
    'PNB.NS',
    'SAIL.NS',
    'SHREECEM.NS',
    'SIEMENS.NS',
    'SRTRANSFIN.NS',
    'TATAPOWER.NS',
    'TORNTPHARM.NS',
    'TORNTPOWER.NS',
    'TVSMOTOR.NS',
    'UBL.NS',
    'VEDL.NS',
    'VOLTAS.NS',
    'YESBANK.NS',
    'ZYDUSLIFE.NS',
  ];

  /**
   * NIFTY 500 component stocks (reasonable approximation).
   * The NIFTY 500 represents about 97% of the free-float market
   * capitalisation of stocks listed on the NSE. This array combines
   * NIFTY 100 with the NIFTY Midcap 150 and NIFTY Smallcap 250
   * constituent approximations.
   */
  static readonly NIFTY500_SYMBOLS: string[] = [
    ...IndianSymbolMapper.NIFTY100_SYMBOLS,
    // ---------------------------------------------------
    // NIFTY Midcap 150 (approximation — additional 50 key names)
    // ---------------------------------------------------
    'ABCAPITAL.NS',
    'ABFRL.NS',
    'ADANIGREEN.NS',
    'ADANITRANS.NS',
    'APOLLOTYRE.NS',
    'ASHOKLEY.NS',
    'ASTRAL.NS',
    'ATUL.NS',
    'BAYERCROP.NS',
    'BEL.NS',
    'BHARATFORG.NS',
    'BHARTIHEXA.NS',
    'BHEL.NS',
    'CHAMBLFERT.NS',
    'COROMANDEL.NS',
    'CROMPTON.NS',
    'CUMMINSIND.NS',
    'DEEPAKNTR.NS',
    'DELTACORP.NS',
    'DHANI.NS',
    'DIXON.NS',
    'ESCORTS.NS',
    'EXIDEIND.NS',
    'FEDERALBNK.NS',
    'FORTIS.NS',
    'GLAND.NS',
    'GODREJPROP.NS',
    'GUJGASLTD.NS',
    'HAL.NS',
    'HINDZINC.NS',
    'HONAUT.NS',
    'IBULHSGFIN.NS',
    'IDFCFIRSTB.NS',
    'IEX.NS',
    'IPCALAB.NS',
    'IRCTC.NS',
    'JKCEMENT.NS',
    'JUBLFOOD.NS',
    'KALYANKJIL.NS',
    'LAURUSLABS.NS',
    'LINDEINDIA.NS',
    'LODHA.NS',
    'LTIM.NS',
    'MAHABANK.NS',
    'MANAPPURAM.NS',
    'MAXHEALTH.NS',
    'METROPOLIS.NS',
    'MOTHERSON.NS',
    'MPHASIS.NS',
    'MRF.NS',
    'NATIONALUM.NS',
    'NAUKRI.NS',
    'NAVINFLUOR.NS',
    'NHPC.NS',
    'OBEROIRLTY.NS',
    'OFSS.NS',
    'PEL.NS',
    'PERSISTENT.NS',
    'PHOENIXLTD.NS',
    'PIIND.NS',
    'POLICYBZR.NS',
    'POLYCAB.NS',
    'POONAWALLA.NS',
    'PRESTIGE.NS',
    'RBLBANK.NS',
    'RECLTD.NS',
    'RVNL.NS',
    'SUPREMEIND.NS',
    'SUZLON.NS',
    'SYNGENE.NS',
    'TATACHEM.NS',
    'TATACOMM.NS',
    'TIINDIA.NS',
    'TIMKEN.NS',
    'TRENT.NS',
    'TRITURBINE.NS',
    'UNIONBANK.NS',
    'VBL.NS',
    'WHIRLPOOL.NS',
    'ZOMATO.NS',
    // ---------------------------------------------------
    // NIFTY Smallcap 250 (approximation — additional 100 key names)
    // ---------------------------------------------------
    'AARTIIND.NS',
    'ANURAS.NS',
    'APLAPOLLO.NS',
    'ASTERDM.NS',
    'AVANTIFEED.NS',
    'BALKRISIND.NS',
    'BATAINDIA.NS',
    'BLUEDART.NS',
    'BLUESTARCO.NS',
    'CANFINHOME.NS',
    'CASTROLIND.NS',
    'CCL.NS',
    'CEATLTD.NS',
    'CENTURYTEX.NS',
    'CERA.NS',
    'CESC.NS',
    'CHOLAHLDNG.NS',
    'CLEAN.NS',
    'COFORGE.NS',
    'CREDITACC.NS',
    'CYIENT.NS',
    'DCMSHRIRAM.NS',
    'DEVYANI.NS',
    'DOMS.NS',
    'ECLERX.NS',
    'EIDPARRY.NS',
    'EQUITASBNK.NS',
    'ERIS.NS',
    'FINCABLES.NS',
    'FINEORG.NS',
    'FINPIPE.NS',
    'FSL.NS',
    'GMMPFAUDLR.NS',
    'GNFC.NS',
    'GRAPHITE.NS',
    'GRINDWELL.NS',
    'GSFC.NS',
    'HEG.NS',
    'HSCL.NS',
    'IDBI.NS',
    'INDIANB.NS',
    'INFIBEAM.NS',
    'INOXWIND.NS',
    'INTELLECT.NS',
    'IRB.NS',
    'JBCHEPHARM.NS',
    'JCHAC.NS',
    'JMFINANCIL.NS',
    'JSL.NS',
    'JUBLPHARMA.NS',
    'JYOTHYLAB.NS',
    'KAJARIACER.NS',
    'KALPATPOWR.NS',
    'KANSAINER.NS',
    'KEC.NS',
    'KNRCON.NS',
    'KPITTECH.NS',
    'KRBL.NS',
    'KSCL.NS',
    'LALPATHLAB.NS',
    'LATENTVIEW.NS',
    'MAHINDCIE.NS',
    'MANKIND.NS',
    'MAZDOCK.NS',
    'MMTC.NS',
    'NATCOPHARM.NS',
    'NBCC.NS',
    'NCC.NS',
    'NETWEB.NS',
    'NEWGEN.NS',
    'NH.NS',
    'NLCINDIA.NS',
    'OLECTRA.NS',
    'PAYTM.NS',
    'POWERINDIA.NS',
    'PRINCEPIPE.NS',
    'PVRINOX.NS',
    'RADICO.NS',
    'RAIN.NS',
    'RALLIS.NS',
    'RATNAMANI.NS',
    'RAYMOND.NS',
    'REDINGTON.NS',
    'RELAXO.NS',
    'ROUTE.NS',
    'SFL.NS',
    'SKFINDIA.NS',
    'SOBHA.NS',
    'SOLARINDS.NS',
    'SONACOMS.NS',
    'SPICEJET.NS',
    'STAR.NS',
    'SUNTECK.NS',
    'SWANENERGY.NS',
    'TANLA.NS',
    'TATATECH.NS',
    'TCIEXP.NS',
    'TEJASNET.NS',
    'THERMAX.NS',
    'TTKPRESTIG.NS',
    'TV18BRDCST.NS',
    'UJJIVANSFB.NS',
    'VAIBHAVGBL.NS',
    'VGUARD.NS',
    'VINATIORGA.NS',
    'VIPIND.NS',
    'WELCORP.NS',
    'WESTLIFE.NS',
    'WOCKPHARMA.NS',
    'ZEEL.NS',
    'ZENSARTECH.NS',
    'ZYDUSWELL.NS',
  ];

  /**
   * Convert a raw Indian stock symbol (e.g. "RELIANCE") to a Yahoo Finance
   * symbol with the appropriate exchange suffix.
   *
   * If the symbol already carries a .NS or .BO suffix it is returned as-is.
   * Defaults to NSE (.NS) when exchange is not specified.
   *
   * @param symbol   — Raw or already-suffixed symbol.
   * @param exchange — Target exchange; defaults to 'NSE'.
   * @returns Yahoo Finance symbol (e.g. "RELIANCE.NS").
   */
  static toYahooSymbol(symbol: string, exchange: 'NSE' | 'BSE' = 'NSE'): string {
    const upper = symbol.toUpperCase();

    // Already has a recognised suffix — trust the caller
    if (upper.endsWith(IndianSymbolMapper.NSE_SUFFIX.toUpperCase())) return upper;
    if (upper.endsWith(IndianSymbolMapper.BSE_SUFFIX.toUpperCase())) return upper;

    const suffix =
      exchange === 'BSE' ? IndianSymbolMapper.BSE_SUFFIX : IndianSymbolMapper.NSE_SUFFIX;
    return `${upper}${suffix}`;
  }

  /**
   * Strip the Yahoo Finance suffix to recover the base symbol and exchange.
   *
   * @param yahooSymbol — A Yahoo Finance symbol ending with .NS or .BO.
   * @returns An object with the base `symbol` and the `exchange` it belongs to.
   */
  static fromYahooSymbol(yahooSymbol: string): { symbol: string; exchange: 'NSE' | 'BSE' } {
    const upper = yahooSymbol.toUpperCase();

    if (upper.endsWith('.NS')) {
      return { symbol: upper.slice(0, -3), exchange: 'NSE' };
    }
    if (upper.endsWith('.BO')) {
      return { symbol: upper.slice(0, -3), exchange: 'BSE' };
    }

    // No recognised suffix — assume NSE
    return { symbol: upper, exchange: 'NSE' };
  }

  /**
   * Check whether a symbol string represents an Indian equity on Yahoo Finance.
   *
   * @param symbol — Any symbol string.
   * @returns `true` if the symbol ends with `.NS` or `.BO`.
   */
  static isIndianSymbol(symbol: string): boolean {
    const upper = symbol.toUpperCase();
    return upper.endsWith('.NS') || upper.endsWith('.BO');
  }

  /**
   * Get the full array of Yahoo Finance symbols for a given universe.
   *
   * @param universe — One of 'NIFTY50', 'NIFTY100', or 'NIFTY500'.
   * @returns Array of Yahoo Finance symbols (e.g. ["RELIANCE.NS", …]).
   */
  static getUniverse(universe: 'NIFTY50' | 'NIFTY100' | 'NIFTY500'): string[] {
    switch (universe) {
      case 'NIFTY50':
        return [...IndianSymbolMapper.NIFTY50_SYMBOLS];
      case 'NIFTY100':
        return [...IndianSymbolMapper.NIFTY100_SYMBOLS];
      case 'NIFTY500':
        return [...IndianSymbolMapper.NIFTY500_SYMBOLS];
    }
  }

  /**
   * Resolve a raw symbol to a Yahoo Finance symbol by trying NSE first and
   * falling back to BSE. This is a convenience helper for cases where the
   * exchange is unknown.
   *
   * @param symbol — Raw symbol (e.g. "RELIANCE") or already-suffixed symbol.
   * @returns Yahoo Finance symbol, preferring NSE.
   */
  static resolveSymbol(symbol: string): string {
    // If already a recognised Indian symbol, return as-is
    if (IndianSymbolMapper.isIndianSymbol(symbol)) {
      return symbol.toUpperCase();
    }
    return IndianSymbolMapper.toYahooSymbol(symbol, 'NSE');
  }
}

export default IndianSymbolMapper;