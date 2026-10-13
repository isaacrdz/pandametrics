import { DEFAULT_LOCALE, LOCALES, STORAGE_KEY } from "@/i18n/config";

export const LOCALE_PENDING_CLASS = "locale-pending";

const SAFETY_TIMEOUT_MS = 3000;

// Runs in <head> before the first paint. When the stored locale is not the default,
// it sets <html lang> and hides the page until LocaleProvider applies the language,
// so the server-rendered English text never flashes.
export const LOCALE_SCRIPT = `(function(){try{
var l=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(l&&l!==${JSON.stringify(DEFAULT_LOCALE)}&&${JSON.stringify(LOCALES)}.indexOf(l)>-1){
var d=document.documentElement;d.lang=l;d.classList.add(${JSON.stringify(LOCALE_PENDING_CLASS)});
setTimeout(function(){d.classList.remove(${JSON.stringify(LOCALE_PENDING_CLASS)})},${SAFETY_TIMEOUT_MS});
}}catch(e){}})();`;
