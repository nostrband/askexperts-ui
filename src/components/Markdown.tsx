"use client";

import MarkdownClient from "./Markdown.client";

type Props = {
  md: string;
  wrapLines?: boolean;
};

export default function MarkdownView({ md, wrapLines = false }: Props) {
  return <MarkdownClient md={md} wrapLines={wrapLines} />;
}