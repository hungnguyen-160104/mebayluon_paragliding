'use client';

import Link from 'next/link';
import type { FixedKey } from '../Footer';
import { FIXED_SPOTS } from '../Footer';

export function FixedSpotLinks({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      {FIXED_SPOTS.map((s) => (
        <Link
          key={s.key as FixedKey}
          href={`/fixed/${s.key}`}
          className="px-3 py-1 rounded-full border border-white/30 hover:bg-white/10"
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}
