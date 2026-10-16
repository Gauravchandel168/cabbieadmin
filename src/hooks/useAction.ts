import { useCallback, useState } from "react";
import { errorMessage } from "../api/client";
import { useToast } from "../components/ui";

/** Button action: chalao → success toast (backend ka message) / error toast. Fail = undefined */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <R,>(fn: () => Promise<R>, success?: string | ((r: R) => string)): Promise<R | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        const backendMsg = (r as { message?: string } | undefined)?.message;
        const msg = typeof success === "function" ? success(r) : success ?? backendMsg;
        if (msg) toast(msg, "success");
        return r ?? (true as unknown as R);
      } catch (e) {
        toast(errorMessage(e), "error");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { run, busy };
}
