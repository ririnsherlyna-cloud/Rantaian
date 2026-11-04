'use client'

import { ORGS, PEOPLE } from '@/data/mod-aktor'
import { MapPin, Users, Target, Scale, Building2, Quote } from 'lucide-react'

export function OrgCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ORGS.map((o) => (
        <div
          key={o.name}
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-600"
          style={{ borderTopColor: o.color, borderTopWidth: 2 }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <h4 className="font-semibold text-zinc-50 leading-snug">{o.name}</h4>
            <Building2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: o.color }} />
          </div>
          <div className="space-y-2 text-xs text-zinc-400">
            <p className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-500" />
              {o.hq}
            </p>
            <p className="flex items-start gap-1.5">
              <Users className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-500" />
              <span>{o.people}</span>
            </p>
            <p className="flex items-start gap-1.5">
              <Target className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-500" />
              <span className="text-zinc-300">{o.focus}</span>
            </p>
            <p className="flex items-start gap-1.5">
              <Scale className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-500" />
              <span>{o.stance}</span>
            </p>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500 border-t border-zinc-800 pt-2.5">{o.scale}</p>
        </div>
      ))}
    </div>
  )
}

export function PeopleCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PEOPLE.map((p) => (
        <div key={p.name} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-600">
          <div className="mb-2.5">
            <h4 className="font-semibold text-zinc-50">{p.name}</h4>
            <p className="text-xs text-amber-400/90 mt-0.5">{p.role}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{p.org}</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3 mb-2.5">
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-zinc-300">
              <Quote className="h-3 w-3 mt-0.5 shrink-0 text-zinc-500" />
              {p.thesis}
            </p>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">{p.notable}</p>
        </div>
      ))}
    </div>
  )
}
