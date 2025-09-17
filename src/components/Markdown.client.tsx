"use client";

import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
// Shiki-quality highlighting in the browser:
import rehypePrettyCode from "rehype-pretty-code";

import CodeBlock from "./code/CodeBlock";
import InlineCode from "./code/InlineCode";

type Props = {
  md: string;
  wrapLines?: boolean; // optional toggle for wrapping vs scroll
};

export default function MarkdownClient({ md, wrapLines = false }: Props) {
  return (
    <MarkdownHooks
      // small skeleton while the async plugins run
      fallback={<div className="animate-pulse text-sm opacity-70">Rendering…</div>}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        [rehypePrettyCode, {
          keepBackground: false,       // use our own container bg
          defaultLang: "txt",
          theme: "catppuccin-latte",
          onVisitLine(node: any) {
            // keep empty lines visible so copy/paste preserves them
            if (node.children.length === 0) node.children = [{ type: "text", value: " " }];
          },
        }],
      ]}
      // our UI wrappers for code
      components={{
        pre: (props) => <CodeBlock {...props} wrapLines={wrapLines} />,
        code: InlineCode,
      }}
    >
      {md}
    </MarkdownHooks>
  );
}