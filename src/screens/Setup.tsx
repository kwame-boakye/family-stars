import { useState } from 'react';
import type { AvatarId, ChildColour } from '../domain/types';
import { parseName, parseOpeningBalance, parseStars } from '../domain/validation';
import { completeSetup, errorMessage } from '../db/operations';
import { newId } from '../db/schema';
import { Field, ErrorNote, Stepper } from '../ui/controls';
import { Avatar } from '../ui/Avatar';
import { StarIcon, CloseIcon, PlusIcon } from '../ui/icons';
import { AvatarPicker } from './Settings';

interface KidDraft {
  id: string;
  nickname: string;
  avatar: AvatarId;
  colour: ChildColour;
  opening: string;
}
interface RewardDraft {
  key: string;
  name: string;
  cost: string;
}
interface ActivityDraft {
  key: string;
  name: string;
  stars: string;
  icon: string;
  childIds: string[];
}

const STEPS = ['Children', 'Rewards & activities', 'Ready'];

export function Setup() {
  const [step, setStep] = useState(0);
  const [kids, setKids] = useState<KidDraft[]>(() => [
    { id: newId(), nickname: '', avatar: 'lion', colour: 'coral', opening: '' },
    { id: newId(), nickname: '', avatar: 'bunny', colour: 'teal', opening: '' },
  ]);
  const [rewards, setRewards] = useState<RewardDraft[]>([
    { key: 'r1', name: 'Skating at the mall', cost: '15' },
    { key: 'r2', name: 'Eat out', cost: '20' },
  ]);
  // Suggestions only: nothing is assigned until Mum ticks a child.
  const [activities, setActivities] = useState<ActivityDraft[]>(() => [
    { key: 'a1', name: 'Put toys away', stars: '1', icon: '🧸', childIds: [] },
    { key: 'a2', name: 'Help tidy up', stars: '1', icon: '🧹', childIds: [] },
    { key: 'a3', name: 'Finish homework', stars: '1', icon: '📚', childIds: [] },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const updateKid = (i: number, patch: Partial<KidDraft>) => setKids((ks) => ks.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const kidName = (id: string) => kids.find((k) => k.id === id)?.nickname.trim() || 'Child';

  function validateChildren(): boolean {
    const e: Record<string, string> = {};
    kids.forEach((k, i) => {
      const n = parseName(k.nickname, 'Nickname');
      if (!n.ok) e[`kid-${i}-name`] = n.error;
      const o = parseOpeningBalance(k.opening);
      if (!o.ok) e[`kid-${i}-opening`] = o.error;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateCatalogue(): boolean {
    const e: Record<string, string> = {};
    rewards.forEach((r) => {
      const n = parseName(r.name, 'Reward name');
      if (!n.ok) e[`reward-${r.key}`] = n.error;
      const c = parseStars(r.cost, 'Star cost');
      if (!c.ok) e[`reward-${r.key}`] = c.error;
    });
    activities.forEach((a) => {
      if (a.childIds.length === 0) return; // skipped suggestion
      const n = parseName(a.name, 'Activity name');
      if (!n.ok) e[`act-${a.key}`] = n.error;
      const s = parseStars(a.stars, 'Stars');
      if (!s.ok) e[`act-${a.key}`] = s.error;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (step === 0 && !validateChildren()) return;
    if (step === 1 && !validateCatalogue()) return;
    setStep((s) => s + 1);
    window.scrollTo?.(0, 0);
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await completeSetup({
        children: kids.map((k) => {
          const o = parseOpeningBalance(k.opening);
          return { id: k.id, nickname: k.nickname, avatar: k.avatar, colour: k.colour, openingBalance: o.ok ? o.value : 0 };
        }),
        rewards: rewards.map((r) => ({ name: r.name, cost: r.cost })),
        activities: activities.filter((a) => a.childIds.length > 0).map((a) => ({ name: a.name, stars: a.stars, icon: a.icon, childIds: a.childIds })),
      });
      location.hash = '#/';
    } catch (err) {
      setSaveError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <main className="screen setup" id="main">
      <header className="setup-head">
        <StarIcon size={44} />
        <h1>Family Stars</h1>
        <ol className="progress-dots" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'current' : i < step ? 'done' : ''} aria-hidden="true" />
          ))}
        </ol>
      </header>

      {step === 0 && (
        <section aria-labelledby="setup-kids">
          <h2 id="setup-kids">Who is collecting stars?</h2>
          {kids.map((k, i) => (
            <div key={k.id} className={`panel accent-${k.colour}`}>
              <div className="setup-kid-head">
                <Avatar id={k.avatar} size={56} />
                <h3>Child {i + 1}</h3>
              </div>
              <Field label="Nickname" htmlFor={`kid-${i}-name`} error={errors[`kid-${i}-name`]}>
                <input id={`kid-${i}-name`} className="input" value={k.nickname} maxLength={60} autoComplete="off" onChange={(e) => updateKid(i, { nickname: e.target.value })} />
              </Field>
              <AvatarPicker name={`avatar-${i}`} value={k.avatar} onChange={(avatar) => updateKid(i, { avatar })} />
              <Field
                label="Stars already earned on paper (optional)"
                htmlFor={`kid-${i}-opening`}
                error={errors[`kid-${i}-opening`]}
                hint="Leave blank to start from zero."
              >
                <input
                  id={`kid-${i}-opening`}
                  className="input input-short"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={k.opening}
                  onChange={(e) => updateKid(i, { opening: e.target.value })}
                />
              </Field>
            </div>
          ))}
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="setup-cat">
          <h2 id="setup-cat">Rewards</h2>
          <p className="muted">Change these to suit your family. You can edit them later too.</p>
          {rewards.map((r) => (
            <div key={r.key} className="panel setup-row">
              <div className="setup-row-fields">
                <Field label="Reward" htmlFor={`rw-${r.key}`}>
                  <input id={`rw-${r.key}`} className="input" value={r.name} maxLength={60} onChange={(e) => setRewards((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))} />
                </Field>
                <Field label="Star cost">
                  <Stepper label={`Star cost for ${r.name || 'reward'}`} value={r.cost} onChange={(cost) => setRewards((rs) => rs.map((x) => (x.key === r.key ? { ...x, cost } : x)))} />
                </Field>
                <ErrorNote>{errors[`reward-${r.key}`]}</ErrorNote>
              </div>
              <button type="button" className="icon-btn" aria-label={`Remove ${r.name || 'reward'}`} onClick={() => setRewards((rs) => rs.filter((x) => x.key !== r.key))}>
                <CloseIcon />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-soft" onClick={() => setRewards((rs) => [...rs, { key: newId(), name: '', cost: '10' }])}>
            <PlusIcon size={20} /> Add a reward
          </button>

          <h2 className="mt">Activity ideas</h2>
          <p className="muted">Optional. Tick who each one is for, or leave it unticked to skip it.</p>
          {activities.map((a) => (
            <div key={a.key} className="panel">
              <div className="setup-row-fields">
                <Field label="Activity" htmlFor={`ac-${a.key}`}>
                  <input id={`ac-${a.key}`} className="input" value={a.name} maxLength={60} onChange={(e) => setActivities((as) => as.map((x) => (x.key === a.key ? { ...x, name: e.target.value } : x)))} />
                </Field>
                <Field label="Stars">
                  <Stepper label={`Stars for ${a.name || 'activity'}`} value={a.stars} onChange={(stars) => setActivities((as) => as.map((x) => (x.key === a.key ? { ...x, stars } : x)))} />
                </Field>
                <fieldset className="kid-picks">
                  <legend className="field-label">For</legend>
                  {kids.map((k) => (
                    <label key={k.id} className={`kid-pick accent-${k.colour}`}>
                      <input
                        type="checkbox"
                        checked={a.childIds.includes(k.id)}
                        onChange={() =>
                          setActivities((as) =>
                            as.map((x) => (x.key === a.key ? { ...x, childIds: x.childIds.includes(k.id) ? x.childIds.filter((c) => c !== k.id) : [...x.childIds, k.id] } : x)),
                          )
                        }
                      />
                      <Avatar id={k.avatar} size={28} />
                      <span>{kidName(k.id)}</span>
                    </label>
                  ))}
                </fieldset>
                <ErrorNote>{errors[`act-${a.key}`]}</ErrorNote>
              </div>
            </div>
          ))}
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="setup-ready" className="panel">
          <h2 id="setup-ready">One thing to know</h2>
          <p>
            Stars are saved <strong>on this phone only</strong>. If the browser’s data is cleared or the phone is replaced, they can be lost.
          </p>
          <p>
            Use <strong>Settings → Save backup</strong> now and then to keep a copy somewhere safe.
          </p>
          <ErrorNote>{saveError}</ErrorNote>
        </section>
      )}

      <div className="setup-nav">
        {step > 0 && (
          <button type="button" className="btn btn-quiet" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < 2 ? (
          <button type="button" className="btn btn-primary" onClick={next}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={saving} onClick={finish}>
            {saving ? 'Saving…' : 'Start'}
          </button>
        )}
      </div>
    </main>
  );
}
