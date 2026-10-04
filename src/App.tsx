import { useEffect } from 'react';
import { useFamily } from './ui/data';
import { useRoute, href, type Route } from './ui/router';
import { FeedbackProvider } from './ui/Feedback';
import { GearIcon, GiftIcon, HomeIcon, ListIcon } from './ui/icons';
import { Setup } from './screens/Setup';
import { Home } from './screens/Home';
import { ChildDetail } from './screens/ChildDetail';
import { Activities } from './screens/Activities';
import { Rewards } from './screens/Rewards';
import { Settings } from './screens/Settings';
import { UpdateBanner } from './pwa/UpdateBanner';

const TABS: { route: Route; label: string; Icon: typeof HomeIcon }[] = [
  { route: { name: 'home' }, label: 'Home', Icon: HomeIcon },
  { route: { name: 'activities' }, label: 'Activities', Icon: ListIcon },
  { route: { name: 'rewards' }, label: 'Rewards', Icon: GiftIcon },
  { route: { name: 'settings' }, label: 'Settings', Icon: GearIcon },
];

export function App() {
  const family = useFamily();
  const route = useRoute();

  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [route.name, route.name === 'child' ? route.childId : '']);

  if (!family) {
    return (
      <div className="loading" role="status">
        Loading…
      </div>
    );
  }

  if (!family.settings.setupDone) {
    return (
      <FeedbackProvider celebrations={false}>
        <Setup />
      </FeedbackProvider>
    );
  }

  const activeTab = route.name === 'child' ? 'home' : route.name;

  return (
    <FeedbackProvider celebrations={family.settings.celebrations} screenKey={route.name === 'child' ? `child/${route.childId}` : route.name}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <UpdateBanner />
      {route.name === 'home' && <Home family={family} />}
      {route.name === 'child' && <ChildDetail family={family} childId={route.childId} view={route.view} />}
      {route.name === 'activities' && <Activities family={family} />}
      {route.name === 'rewards' && <Rewards family={family} />}
      {route.name === 'settings' && <Settings family={family} />}
      <nav className="bottom-nav" aria-label="Main">
        {TABS.map(({ route: r, label, Icon }) => (
          <a key={label} href={href(r)} aria-current={activeTab === r.name ? 'page' : undefined}>
            <Icon size={24} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </FeedbackProvider>
  );
}
