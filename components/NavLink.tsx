'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

type Props = {
  href: string;
  children: ReactNode;
  activeVariant?: 'pill' | 'default';
};

export default function NavLink({ href, children, activeVariant = 'default' }: Props) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + '/');

  if (activeVariant === 'pill') {
    return (
      <Link
        href={href}
        className={
          isActive
            ? 'rounded-full bg-black px-3 py-1.5 text-white shadow-sm transition-all hover:bg-zinc-800'
            : 'hover:text-black hover:opacity-100 opacity-80 transition-all px-2 py-1'
        }
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={
        isActive
          ? 'text-black opacity-100 font-medium transition-all px-2 py-1'
          : 'hover:text-black hover:opacity-100 opacity-80 transition-all px-2 py-1'
      }
    >
      {children}
    </Link>
  );
}
