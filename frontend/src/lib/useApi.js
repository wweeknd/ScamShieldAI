import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal async data hook. Re-runs when `deps` change.
 * Returns { loading, error, data, reload }.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current()
      .then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((e) => alive && setState({ loading: false, error: e.message || "Error", data: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);
  return { ...state, reload: run };
}
