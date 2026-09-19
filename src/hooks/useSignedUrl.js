import { useEffect, useState } from "react";
import { getSignedUrl } from "../lib/documentStorage";

export function useSignedUrl(path) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!path) return;
    getSignedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
