import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, type Paged, type Pagination } from "../api/client";

/** Ek baar load: { data, loading, error, reload, setData } */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async (silent = false) => {
    const my = ++seq.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await fn();
      if (my === seq.current) setData(d);
    } catch (e) {
      if (my === seq.current) setError(errorMessage(e));
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

/** Paginated list. Filters (deps) badle → page 1 */
export function usePaged<T>(fetcher: (page: number) => Promise<Paged<T>>, deps: unknown[]) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const pageRef = useRef(1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async (p: number, silent = false) => {
    const my = ++seq.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetcher(p);
      if (my !== seq.current) return;
      setItems(res.items);
      setPagination(res.pagination);
    } catch (e) {
      if (my === seq.current) setError(errorMessage(e));
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    pageRef.current = 1;
    setPage(1);
    load(1);
  }, [load]);

  const goTo = (p: number) => {
    pageRef.current = p;
    setPage(p);
    load(p);
  };

  return {
    items, setItems, pagination, page, goTo, loading, error,
    reload: (silent = false) => load(pageRef.current, silent),
  };
}

/** Search box: type karte hi nahi, ruk kar */
export function useDebounced<T>(value: T, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
