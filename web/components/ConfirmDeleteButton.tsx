"use client";

import { useTransition } from "react";

export default function ConfirmDeleteButton({
  action,
  confirmMessage,
  label = "삭제",
  className = "text-xs font-medium text-red-500 hover:underline disabled:opacity-50",
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(() => {
      action();
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className={className}>
      {pending ? "삭제 중..." : label}
    </button>
  );
}
