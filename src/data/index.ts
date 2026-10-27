import type { ModuleData } from '@/lib/types'
import { modBeranda } from './mod-beranda'
import { modDefinisi } from './mod-definisi'
import { modArsitektur } from './mod-arsitektur'
import { modKronologi } from './mod-kronologi'
import { modAktor } from './mod-aktor'
import { modBukti } from './mod-bukti'
import { modBlueprint } from './mod-blueprint'
import { modReferensi } from './mod-referensi'

export const MODULES: ModuleData[] = [
  modBeranda,
  modDefinisi,
  modArsitektur,
  modKronologi,
  modAktor,
  modBukti,
  modBlueprint,
  modReferensi,
]

export const moduleById = (id: string): ModuleData | undefined =>
  MODULES.find((m) => m.id === id)

export { PAPERS, paperById } from './papers'
export { KRONOLOGI_EVENTS } from './mod-kronologi'
export { ORGS, PEOPLE } from './mod-aktor'
export { BLUEPRINT_NODES } from './mod-blueprint'
export type * from '@/lib/types'
