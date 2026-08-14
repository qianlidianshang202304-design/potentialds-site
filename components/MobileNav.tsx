'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { href: '/creator-workbench', label: '达人工作台' },
  { href: '/my-creators', label: '我的达人' },
  { href: '/crm', label: 'CRM' },
  { href: '/email/tasks', label: '发信任务' },
  { href: '/pricing', label: '定价' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? '关闭导航' : '打开导航'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid h-8 w-8 place-items-center rounded-md text-zinc-700 transition hover:bg-zinc-100 hover:text-black"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <nav className="absolute right-0 top-10 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
