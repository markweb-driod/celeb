'use client'

import { useState } from 'react'

type Item = { q: string; a: string }

export default function FaqAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
            open === i
              ? 'border-mint/30 bg-[#071e29]'
              : 'border-white/[0.07] bg-[#050f17]/70 hover:border-white/15'
          }`}
        >
          <button
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-semibold text-white">{item.q}</span>
            <span
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                open === i
                  ? 'rotate-45 border-mint/50 bg-mint/10 text-mint-soft'
                  : 'border-white/20 text-slate-400'
              }`}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </button>
          <div
            className={`transition-all duration-400 ease-in-out ${
              open === i ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-300">{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
