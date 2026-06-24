export interface Broker { name:string; logo:string; tagline:string; orderUrl:(symbol:string,price:number|null)=>string; }
export const brokers:Broker[]=[
  {name:"Zerodha",logo:"https://zerodha.com/static/images/logo.svg",tagline:"India's largest broker",orderUrl:symbol=>`https://kite.zerodha.com/orders?symbol=${encodeURIComponent(symbol)}&qty=1&type=MKT`},
  {name:"Groww",logo:"https://groww.in/favicon.ico",tagline:"Simple investing",orderUrl:symbol=>`https://groww.in/stocks/${symbol.toLowerCase()}`},
  {name:"Upstox",logo:"https://assets.upstox.com/content/assets/images/logo-upstox.png",tagline:"Fast order execution",orderUrl:()=>"https://login.upstox.com/"},
  {name:"Angel One",logo:"https://www.angelone.in/favicon.ico",tagline:"Full-service broker",orderUrl:()=>"https://smartapi.angelbroking.com/"},
  {name:"ICICI Direct",logo:"https://www.icicidirect.com/favicon.ico",tagline:"Bank-backed broker",orderUrl:symbol=>`https://www.icicidirect.com/stocks/${encodeURIComponent(symbol)}`},
  {name:"HDFC Securities",logo:"https://www.hdfcsec.com/favicon.ico",tagline:"HDFC Bank brokerage",orderUrl:symbol=>`https://www.hdfcsec.com/stocks/${encodeURIComponent(symbol)}`},
  {name:"Kotak Securities",logo:"https://www.kotaksecurities.com/favicon.ico",tagline:"Kotak Bank brokerage",orderUrl:()=>"https://www.kotaksecurities.com/"},
  {name:"5paisa",logo:"https://www.5paisa.com/favicon.ico",tagline:"Flat-fee trading",orderUrl:symbol=>`https://www.5paisa.com/stocks/${encodeURIComponent(symbol)}`},
  {name:"Motilal Oswal",logo:"https://www.motilaloswal.com/favicon.ico",tagline:"Research-backed broker",orderUrl:()=>"https://www.motilaloswal.com/"},
  {name:"SBI Securities",logo:"https://www.sbisec.com/favicon.ico",tagline:"SBI Bank brokerage",orderUrl:()=>"https://www.sbisec.com/"},
];
