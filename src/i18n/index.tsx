import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { hi } from "./hi";
import { getLang, saveLang, type Lang } from "./lang";

/** t("{0} drivers", [5]) — English text hi key hai; Hindi na mile to English */
export type T = (en: string, args?: (string | number | null | undefined)[]) => string;

export function translate(lang: Lang, en: string, args?: (string | number | null | undefined)[]) {
  let s = lang === "hi" ? hi[en] ?? en : en;
  args?.forEach((a, i) => {
    s = s.split(`{${i}}`).join(a == null ? "" : String(a));
  });
  return s;
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (s) => s });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang());
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    saveLang(l);
    setLangState(l);
  }, []);
  const t = useCallback<T>((en, args) => translate(lang, en, args), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;
