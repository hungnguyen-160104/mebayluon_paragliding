'use client';

import Link from 'next/link';

// Định nghĩa Interface rõ ràng cho Item để tránh lỗi implicit 'any'
interface FixedSpotItem {
  key: string;
  name: string;
}

// Thay đổi cú pháp import: Lấy FIXED_SPOTS trực tiếp từ default export của file Footer
import FIXED_SPOTS from '../Footer';

export function FixedSpotLinks({ className = '' }: { className?: string }) {
  // Kiểm tra phòng hờ nếu FIXED_SPOTS không phải là mảng để tránh crash giao diện
  const spots: FixedSpotItem[] = Array.isArray(FIXED_SPOTS) ? FIXED_SPOTS : [];

  return (
    <div className={className}>
      {spots.map((s) => (
        <Link
          key={s.key}
          href={`/fixed/${s.key}`}
          className="px-3 py-1 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}