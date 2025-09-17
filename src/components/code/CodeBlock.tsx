"use client";
import {
  useRef, useState, Children, isValidElement, ReactElement
} from "react";

type Props = React.HTMLAttributes<HTMLPreElement> & {
  wrapLines?: boolean;
  children?: React.ReactNode;
};

export default function CodeBlock({ wrapLines = false, ...props }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  // Extract language from data-language attribute on the inner <code> element
  let lang = "text";
  const onlyChild = isValidElement(Children.only(props.children))
    ? (Children.only(props.children) as ReactElement<any>)
    : null;
  if (onlyChild?.props?.["data-language"]) {
    lang = onlyChild.props["data-language"];
  }

  async function handleCopy() {
    try {
      const text = preRef.current?.innerText ?? "";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  return (
    <div className="relative my-4 group">
      {/* Language badge (top-left) */}
      <div className="absolute left-3 top-2 z-10 text-[10px] tracking-widest opacity-70">
        {lang}
      </div>

      {/* Copy button (top-right) */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-1 top-1 z-10 rounded-md px-2 py-1 text-[11px]
                   opacity-90 transition hover:opacity-100 hover:cursor-pointer active:scale-95"
      >
        {copied ? "Copied" : "Copy code"}
      </button>

      {/* Actual code block container */}
      <pre
        ref={preRef}
        className={[
          "rounded-xl border p-4 pt-8",   // room for toolbar row
          // "bg-black/50",                  // tweak to your theme
          wrapLines
            ? "whitespace-pre-wrap break-words"
            : "overflow-x-auto",
        ].join(" ")}
        {...props}
      />
    </div>
  );
}