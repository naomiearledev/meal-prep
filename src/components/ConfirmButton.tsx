"use client";

type Props = {
  message: string;
  className?: string;
  children: React.ReactNode;
};

/** A submit button that asks before submitting its form. */
export function ConfirmButton({ message, className, children }: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
