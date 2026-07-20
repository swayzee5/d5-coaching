"use client";

import { useRef } from "react";

export function RenameSessionInput({
  defaultValue,
  renameAction,
}: {
  defaultValue: string;
  renameAction: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={renameAction}>
      <input
        name="name"
        defaultValue={defaultValue}
        onBlur={() => formRef.current?.requestSubmit()}
        className="text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-gray-700 focus:border-brand-500 focus:outline-none transition-colors"
      />
    </form>
  );
}
