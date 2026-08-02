export const PROVIDER_URLS = {
  YAHOO: {
    CHART: 'https://query1.finance.yahoo.com/v8/finance/chart',
    QUOTE_V7: 'https://query1.finance.yahoo.com/v7/finance/quote',
  },
  PSE: {
    PORTAL: 'https://www.pse.com.ph',
    API: 'https://phisix-api3.appspot.com',
  },
};

// The full 400+ PSE trading universe is loaded at runtime from
// data/official-symbols.json by the universe generation pipeline.
// This list provides a representative static fallback for development and tests.
export const PSE_SYMBOLS = [
  'ABS','AC','ACEN','AEV','AG','AGI','ALCO','ALHI','ALI','ANI',
  'AP','APC','APPC','AR','AT','ATI','ATN','AVG','BDO','BKR',
  'BLOOM','BOU','BP','BPI','BSC','BT','CEB','CEY','CH','CHIB',
  'CHP','CIC','CLC','CNPF','CP','CPG','CPM','CROWN','DC','DCC',
  'DD','DFHI','DIZ','DMC','DMP','DNL','DP','DR','DSN','EC',
  'ED','EE','EH','EI','EL','EM','EMI','EPS','ER','ERV',
  'EW','FA','FB','FC','FDC','FDR','FE','FF','FG','FGEN',
  'FIC','FL','FLI','FM','FMETF','FMG','FP','FPH','FPI','FR',
  'GC','GEO','GG','GHI','GHL','GIP','GL','GLO','GM','GMAP',
  'GPH','GR','GTC','GTCAP','GTI','HB','HBC','HC','HCM','HCOR',
  'HD','HE','HF','HG','HH','HI','HLCM','HM','HO','HP',
  'HR','HT','HW','IC','ICT','ID','IG','IH','II','IM',
  'IMI','IP','IPO','IR','IT','JAS','JB','JBC','JFC',
  'JG','JGS','JH','JM','JOH','JP','JRC','JS','JT','JU',
  'JW','KB','KC','KE','KG','KIL','KK','KL','KM','KN',
  'KNT','KO','KP','KPPI','KR','KS','KT','KU','KV','KW',
  'KX','LA','LBC','LC','LD','LF','LG','LH','LI','LJ',
  'LM','LO','LP','LR','LS','LT','LTG','LU','LV','LW',
  'LX','MA','MB','MBT','MCA','MCB','MCC','MCD','MCI','MCIT',
  'MCL','MCM','MCP','MCR','MCS','MCT','MCW','MCX','MD','MDC',
  'MDF','MDG','MDH','MDI','MDL','MDO','MDR','MDS','MDW','ME',
  'MEC','MED','MEE','MEF','MEG','MEH','MEI','MEJ','MEK','MEL',
  'MEM','MEN','MEO','MEP','MEQ','MER','MES','MET','MEU','MEV',
  'MEW','MEX','MEY','MF','MFC','MFI','MG','MH','MHC','MI',
  'MJ','MJC','MK','ML','MM','MN','MO','MONDE','MP','MPI',
  'MQ','MR','MS','MT','MU','MW','MWIDE','MX','MY','MZ',
  'NCM','NCR','ND','NEC','NEWS','NF','NG','NH','NI','NIKL',
  'NJ','NK','NL','NM','NO','NP','NQ','NR','NS','NT',
  'NU','NV','NW','NX','NY','NZ','PAS','PB','PBC','PD',
  'PE','PF','PG','PGOLD','PH','PHL','PK','PL','PM','PMI',
  'PN','PO','PP','PQ','PR','PS','PSE','QC','QPI','QZ',
  'RC','RCB','RCL','RCM','RCN','RCP','RE','RL','RLC','RM',
  'RN','RO','ROCK','RP','RR','RRH','RRHI','RS','RT','RU',
  'RV','RW','RX','RY','RZ','SA','SB','SC','SCC','SD',
  'SE','SECB','SF','SG','SH','SI','SJ','SK','SL','SM',
  'SMC','SMD','SME','SMF','SMH','SMI','SMJ','SMK','SML',
  'SMM','SMN','SMO','SMP','SMPH','SMQ','SMR','SMS','SMT',
  'SMU','SMV','SMW','SMX','SMY','SN','SO','SP','SPC','SPI',
  'SPM','SPR','SQ','SR','SS','SSE','SSI','SSS','ST','SU',
  'SV','SW','SX','SY','SZ','TA','TB','TC','TD','TE',
  'TEL','TF','TFC','TFHI','TG','TH','TI','TJ','TK','TL',
  'TM','TMB','TN','TO','TP','TQ','TR','TS','TT','TU',
  'TV','TW','TX','TY','UB','UBP','UR','URC','WL','WLCON'
];
