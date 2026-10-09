export type CurrencyCode = "IDR" | "USD" | "EUR" | "SGD" | "MYR";
export type ThemeColor = "violet" | "ocean" | "emerald" | "sunset";
export type LanguageCode = "id" | "en";
export type DisplayPreferences = { currency: CurrencyCode; themeColor: ThemeColor; language: LanguageCode };

const key = "financetrack-display-v1";
export const defaultPreferences:DisplayPreferences={currency:"IDR",themeColor:"violet",language:"id"};
export const themeMap:Record<ThemeColor,{brand:string;deep:string;ring:string}> = {
  violet:{brand:"#6758ef",deep:"#5142dd",ring:"#8f83f6"},
  ocean:{brand:"#137fbd",deep:"#08689f",ring:"#65b9e8"},
  emerald:{brand:"#15976d",deep:"#0e7957",ring:"#63c7a5"},
  sunset:{brand:"#e56745",deep:"#c84f31",ring:"#f2a186"},
};
export function loadPreferences():DisplayPreferences{
  if(typeof window==="undefined")return defaultPreferences;
  try{return{...defaultPreferences,...JSON.parse(localStorage.getItem(key)||"{}")};}catch{return defaultPreferences;}
}
export function savePreferences(value:DisplayPreferences){localStorage.setItem(key,JSON.stringify(value));}
export function formatMoney(value:number,currency?:CurrencyCode){
  const preferences=loadPreferences();
  const code=currency||preferences.currency;
  return new Intl.NumberFormat(preferences.language==="en"?"en-US":"id-ID",{style:"currency",currency:code,maximumFractionDigits:code==="IDR"?0:2}).format(value);
}
export function applyThemeColor(theme:ThemeColor){
  if(typeof document==="undefined")return;
  const selected=themeMap[theme];const root=document.documentElement;
  root.style.setProperty("--brand",selected.brand);root.style.setProperty("--brand-deep",selected.deep);
  root.style.setProperty("--primary",selected.brand);root.style.setProperty("--ring",selected.ring);
  root.style.setProperty("--brand-soft",`${selected.brand}22`);
}
