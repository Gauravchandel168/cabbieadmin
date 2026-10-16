export type Lang = "en" | "hi";
const KEY = "dl_admin_lang";

export function getLang(): Lang {
  return localStorage.getItem(KEY) === "hi" ? "hi" : "en";
}
export function saveLang(l: Lang) {
  localStorage.setItem(KEY, l);
}
