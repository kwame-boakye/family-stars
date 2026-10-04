import type { ReactNode } from 'react';
import type { AvatarId } from '../domain/types';

export const AVATARS: { id: AvatarId; label: string }[] = [
  { id: 'lion', label: 'Lion' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'bear', label: 'Bear' },
  { id: 'owl', label: 'Owl' },
  { id: 'cat', label: 'Cat' },
  { id: 'turtle', label: 'Turtle' },
  { id: 'fox', label: 'Fox' },
  { id: 'elephant', label: 'Elephant' },
];

const INK = '#3b2a1a';

function Eyes({ y = 50, gap = 12 }: { y?: number; gap?: number }) {
  return (
    <g fill={INK}>
      <circle cx={50 - gap} cy={y} r={4.2} />
      <circle cx={50 + gap} cy={y} r={4.2} />
      <circle cx={50 - gap + 1.4} cy={y - 1.4} r={1.3} fill="#fff" />
      <circle cx={50 + gap + 1.4} cy={y - 1.4} r={1.3} fill="#fff" />
    </g>
  );
}

function Smile({ y = 64, w = 8 }: { y?: number; w?: number }) {
  return <path d={`M${50 - w} ${y} q${w} ${w * 0.8} ${w * 2} 0`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
}

function Cheeks({ y = 60 }: { y?: number }) {
  return (
    <g fill="#f59e9e" opacity={0.6}>
      <ellipse cx={30} cy={y} rx={6} ry={4} />
      <ellipse cx={70} cy={y} rx={6} ry={4} />
    </g>
  );
}

const faces: Record<AvatarId, ReactNode> = {
  lion: (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 33} cy={52 + Math.sin(a) * 33} r={13} fill="#d9822b" />;
      })}
      <circle cx={50} cy={52} r={30} fill="#f6c453" />
      <Eyes y={48} />
      <ellipse cx={50} cy={60} rx={6} ry={4.5} fill={INK} />
      <Smile y={66} w={6} />
      <Cheeks y={60} />
    </>
  ),
  bunny: (
    <>
      <ellipse cx={36} cy={22} rx={9} ry={22} fill="#f3eee8" stroke="#d8cfc4" strokeWidth={2} />
      <ellipse cx={64} cy={22} rx={9} ry={22} fill="#f3eee8" stroke="#d8cfc4" strokeWidth={2} />
      <ellipse cx={36} cy={24} rx={4} ry={14} fill="#f7b6c2" />
      <ellipse cx={64} cy={24} rx={4} ry={14} fill="#f7b6c2" />
      <circle cx={50} cy={58} r={30} fill="#f3eee8" stroke="#d8cfc4" strokeWidth={2} />
      <Eyes y={54} />
      <ellipse cx={50} cy={64} rx={4} ry={3} fill="#e98aa0" />
      <Smile y={70} w={5} />
      <Cheeks y={66} />
    </>
  ),
  bear: (
    <>
      <circle cx={26} cy={28} r={12} fill="#9a6a44" />
      <circle cx={74} cy={28} r={12} fill="#9a6a44" />
      <circle cx={26} cy={28} r={6} fill="#c9956a" />
      <circle cx={74} cy={28} r={6} fill="#c9956a" />
      <circle cx={50} cy={54} r={32} fill="#9a6a44" />
      <ellipse cx={50} cy={66} rx={15} ry={12} fill="#d9b48f" />
      <Eyes y={48} gap={13} />
      <ellipse cx={50} cy={61} rx={5.5} ry={4} fill={INK} />
      <Smile y={68} w={5} />
    </>
  ),
  owl: (
    <>
      <path d="M22 30 L30 12 L40 26 Z M78 30 L70 12 L60 26 Z" fill="#7b5ea7" />
      <ellipse cx={50} cy={56} rx={32} ry={34} fill="#7b5ea7" />
      <ellipse cx={50} cy={66} rx={20} ry={20} fill="#c8b6e2" />
      <circle cx={36} cy={46} r={12} fill="#fff" />
      <circle cx={64} cy={46} r={12} fill="#fff" />
      <circle cx={36} cy={46} r={5.5} fill={INK} />
      <circle cx={64} cy={46} r={5.5} fill={INK} />
      <path d="M45 56 L55 56 L50 64 Z" fill="#f5b301" />
    </>
  ),
  cat: (
    <>
      <path d="M20 44 L24 12 L44 28 Z M80 44 L76 12 L56 28 Z" fill="#8a8f98" />
      <path d="M26 36 L27 20 L38 29 Z M74 36 L73 20 L62 29 Z" fill="#f7b6c2" />
      <circle cx={50} cy={56} r={31} fill="#a3a9b3" />
      <Eyes y={52} />
      <path d="M46 60 L54 60 L50 64 Z" fill="#e98aa0" />
      <path d="M50 64 q-5 6 -10 2 M50 64 q5 6 10 2" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M18 58 h14 M18 64 h14 M68 58 h14 M68 64 h14" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
    </>
  ),
  turtle: (
    <>
      <circle cx={50} cy={54} r={32} fill="#7ccf9a" />
      <circle cx={50} cy={54} r={32} fill="none" stroke="#3e9a62" strokeWidth={3} />
      <Eyes y={48} />
      <Smile y={62} w={9} />
      <Cheeks y={58} />
      <path d="M50 18 v6 M24 30 l4 4 M76 30 l-4 4" stroke="#3e9a62" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  fox: (
    <>
      <path d="M16 20 L40 32 L28 54 Z M84 20 L60 32 L72 54 Z" fill="#e56b2e" />
      <path d="M22 26 L36 33 L29 46 Z M78 26 L64 33 L71 46 Z" fill="#3b2a1a" opacity={0.25} />
      <path d="M50 88 L16 44 Q50 22 84 44 Z" fill="#e56b2e" />
      <path d="M50 88 L28 58 Q50 66 72 58 Z" fill="#fff4e6" />
      <Eyes y={50} gap={13} />
      <ellipse cx={50} cy={78} rx={5} ry={4} fill={INK} />
    </>
  ),
  elephant: (
    <>
      <ellipse cx={20} cy={50} rx={17} ry={22} fill="#9fb3c8" />
      <ellipse cx={80} cy={50} rx={17} ry={22} fill="#9fb3c8" />
      <ellipse cx={20} cy={50} rx={10} ry={14} fill="#f7c7cf" />
      <ellipse cx={80} cy={50} rx={10} ry={14} fill="#f7c7cf" />
      <circle cx={50} cy={48} r={28} fill="#b8c9da" />
      <path d="M44 60 q0 22 10 26 q4 1 4 -3 q-6 -4 -6 -23 Z" fill="#b8c9da" />
      <Eyes y={44} gap={11} />
      <Cheeks y={56} />
    </>
  ),
};

export function Avatar({ id, size = 64, label }: { id: AvatarId; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="avatar"
    >
      {faces[id] ?? faces.bear}
    </svg>
  );
}
