/**
 * Base de datos local IndexedDB (Dexie) para almacenamiento seguro offline.
 * Garantiza que los diagramas, borradores y cola de sincronización se mantengan
 * intactos incluso sin conexión a internet ni autenticación remota activa.
 */

import Dexie, { Table } from 'dexie'
import { AutomataGraph } from '../types/automata'
import { Activity, ActivitySubmission } from '../types/academic'

export interface LocalDraft {
  id: string                   // `${activityId}_${exerciseId}` o `custom_${timestamp}`
  exerciseId?: string
  activityId?: string
  title: string
  projectType: 'AFD' | 'LEXER_DIAGRAM'
  graph: AutomataGraph
  updatedAt: number
}

export interface SyncQueueItem {
  id: string
  action: 'SAVE_SUBMISSION' | 'SUBMIT_ACTIVITY' | 'CHANGE_PASSWORD'
  payload: any
  createdAt: number
  status: 'pending' | 'syncing' | 'failed'
  retryCount: number
}

export class AutomatariumOfflineDatabase extends Dexie {
  drafts!: Table<LocalDraft, string>
  cachedActivities!: Table<Activity, string>
  cachedSubmissions!: Table<ActivitySubmission, string>
  syncQueue!: Table<SyncQueueItem, string>

  constructor() {
    super('AutomatariumTecLocalDB')
    this.version(1).stores({
      drafts: 'id, exerciseId, activityId, projectType, updatedAt',
      cachedActivities: 'id, teacherId, published',
      cachedSubmissions: 'id, activityId, studentUid, controlNumber, overallStatus',
      syncQueue: 'id, action, status, createdAt'
    })
  }
}

export const localDB = new AutomatariumOfflineDatabase()
