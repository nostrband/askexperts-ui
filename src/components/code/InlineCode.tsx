"use client";

export default function InlineCode(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className="rounded-md px-1.5 py-0.5 text-[0.95em] " // border bg-black/20
      {...props}
    />
  );
}