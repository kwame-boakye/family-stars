import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'child'; childId: string; view: 'rewards' | 'history' }
  | { name: 'activities' }
  | { name: 'rewards' }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'child':
      if (parts[1]) return { name: 'child', childId: parts[1], view: parts[2] === 'history' ? 'history' : 'rewards' };
      return { name: 'home' };
    case 'activities':
    case 'rewards':
    case 'settings':
      return { name: parts[0] };
    default:
      return { name: 'home' };
  }
}

export function href(route: Route): string {
  if (route.name === 'child') return `#/child/${encodeURIComponent(route.childId)}/${route.view}`;
  return route.name === 'home' ? '#/' : `#/${route.name}`;
}

export function navigate(route: Route, replace = false) {
  const target = href(route);
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Hash routing keeps the phone's back button working without server config. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
