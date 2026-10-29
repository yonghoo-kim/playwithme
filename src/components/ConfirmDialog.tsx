"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small pastel yes/no dialog over a dimmed page. Escape or a tap outside
 * cancels; the confirm button has focus.
 */
export default function ConfirmDialog({
  message,
  confirmLabel,
  cancelLabel = "아니요",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 px-6"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
        className="animate-page-enter flex w-full max-w-xs flex-col gap-4 rounded-3xl border-4 border-gray-800 bg-white p-5 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
      >
        <p
          id="confirm-dialog-message"
          className="text-center font-jua text-xl text-blue-900"
        >
          {message}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-gray-600 transition-transform hover:scale-105 active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="flex-1 rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-pink-900 transition-transform hover:scale-105 active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
