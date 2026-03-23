'use client';

import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
};

export default function QuotaModal({ open, title = '提示', message, onClose, onConfirm, confirmText = '确定' }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] grid place-items-center bg-black/30 px-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/40 bg-white/75 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.65)] backdrop-blur-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-6 pb-5 pt-6">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/50 bg-white/55 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            取消
          </button>
          {onConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {confirmText}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              确定
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
