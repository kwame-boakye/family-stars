import { updateApp, usePwa } from './pwa';

/** Offers a waiting update without interrupting whatever Mum is doing. */
export function UpdateBanner() {
  const { updateReady } = usePwa();
  if (!updateReady) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version is ready.</span>
      <button type="button" className="btn btn-soft btn-small" onClick={() => updateApp()}>
        Update
      </button>
    </div>
  );
}
