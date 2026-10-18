import { useEffect } from "react";

const SITE = "https://nccompliance.com.ng";

// Sets the tab title and canonical URL for public pages, and puts the
// homepage defaults back when the page closes.
export function usePageMeta(title, path) {
  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]');
    const prevTitle = document.title;
    const prevHref = link?.getAttribute("href");
    document.title = title;
    if (link && path) link.setAttribute("href", SITE + path);
    return () => {
      document.title = prevTitle;
      if (link && prevHref) link.setAttribute("href", prevHref);
    };
  }, [title, path]);
}
