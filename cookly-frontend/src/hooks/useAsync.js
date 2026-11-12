import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async function when `deps` change and track its state.
 *   const { data, error, loading, reload, setData } = useAsync(() => api.get(id), [id]);
 * Responses from an older run are ignored, so fast typing / navigation
 * can never show stale results.
 */
export default function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const runId = useRef(0);

  const run = useCallback(() => {
    runId.current += 1;
    const id = runId.current;
    setState((s) => ({ ...s, loading: true, error: null }));

    return fn()
      .then((data) => {
        if (id === runId.current) setState({ data, error: null, loading: false });
        return data;
      })
      .catch((error) => {
        if (id === runId.current) setState({ data: null, error, loading: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (enabled) run();
    else setState({ data: null, error: null, loading: false });
  }, [run, enabled]);

  const setData = useCallback(
    (updater) =>
      setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    []
  );

  return { ...state, reload: run, setData };
}
