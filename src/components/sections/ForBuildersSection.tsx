import React, { useEffect, useRef } from 'react';
import Button from '../ui/Button';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/atom-one-dark.css';

// Register the languages you need
hljs.registerLanguage('typescript', typescript);

export default function ForBuildersSection() {
  const codeRef = useRef<HTMLElement>(null);
  const openaiCodeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Apply highlighting when component mounts
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
    if (openaiCodeRef.current) {
      hljs.highlightElement(openaiCodeRef.current);
    }
  }, []);
  return (
    <section id="for-builders" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">

          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            For Builders
          </h2>

          <div className="bg-white rounded-2xl shadow-md p-8 md:p-12 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="text-[#F7931A]">💡</span> Your Knowledge &rarr; Your AI Expert
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="text-[#F7931A] mr-2">✓</span>
                    <p>Package your expertise as an AI Expert — models, prompts, tools, context.</p>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#F7931A] mr-2">✓</span>
                    <p>Build and host yourself, or use our scalable infrastructure.</p>
                  </li>
                </ul>
              </div>
              
              <div>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="text-[#F7931A] mr-2">✓</span>
                    <p>Get paid in Bitcoin directly — no intermediaries.</p>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#F7931A] mr-2">✓</span>
                    <p>Promote your Expert, make your knowledge work 24/7.</p>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                href="https://github.com/nostrband/askexperts/blob/main/NIP-174.md" 
                variant="primary"
              >
                Explore the Protocol →
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="text-[#F7931A]">💻</span> Build Your Own Expert
            </h2>
            
            <p className="mb-6">
              The protocol is open and simple, but you can use our SDK to get up to speed fast. Make your self-hosted LLM work for you as a paid AI expert on an open marketplace.
            </p>

            <div className="mb-8 overflow-x-auto">
              <pre className="rounded-lg text-sm font-mono p-0">
                <code ref={codeRef} className="language-typescript hljs p-4 block">
{`import { AskExpertsServer } from 'askexperts/expert';

const expert = new AskExpertsServer({
  privkey,
  discoveryRelays: ['wss://relay1.askexperts.io'],
  hashtags: ['ai', 'help', 'javascript'],
  onAsk: async (ask) => ({
    offer: "I can help with your AI-related JavaScript question!"
  }),
  onPrompt: async (prompt) => {
    const invoice = await createLightningInvoice(100);
    return { invoices: [{ invoice }] };
  },
  onProof: async (prompt, expertQuote, proof) => ({
    content: 'This is my answer.'
  })
});

await expert.start();`}
                </code>
              </pre>
            </div>
            
            <div className="text-center">
              <Button
                href="https://github.com/nostrband/askexperts/tree/main?tab=readme-ov-file#expert-server-usage"
                variant="primary"
              >
                Learn more →
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 md:p-12 mt-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="text-[#F7931A]">🔌</span> Connect To AI Apps
            </h2>
            
            <p className="mb-6">
              OpenAI API-compatible proxy allows you to talk to any expert using OpenAI SDK. Simply change the API url and use your NWC connection string as API key, self-host the proxy or use <b>https://openai.askexperts.io</b>.
            </p>
            
            <div className="mb-8 overflow-x-auto">
              <pre className="rounded-lg text-sm font-mono p-0">
                <code ref={openaiCodeRef} className="language-typescript hljs p-4 block">
{`import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your_nwc_connection_string',
  baseURL: 'https://openai.askexperts.io'
});

const response = await openai.chat.completions.create({
  model: 'expert_pubkey?max_amount_sats=100',
  messages: [
    {
      role: 'user',
      content: 'Hello! Can you tell me about Bitcoin?'
    }
  ]
});

console.log(response.choices[0].message.content);`}
                </code>
              </pre>
            </div>
            
            <div className="text-center">
              <Button
                href="https://github.com/nostrband/askexperts/tree/main?tab=readme-ov-file#openai-api-proxy"
                variant="primary"
              >
                Learn more →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}