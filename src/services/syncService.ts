/**
 * Servicio de Sincronización Offline-First para AutomatariumTec PWA.
 * Gestiona el despacho reactivo de la cola de sincronización (IndexedDB -> Cloud Firestore).
 * Escucha los eventos de red (online/offline) y garantiza que el avance local
 * se suba a la nube en cuanto se restablezca la conectividad.
 */

import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { localDB, SyncQueueItem } from '../db/indexedDb'

export interface SyncStatus {
  online: boolean
  pendingCount: number
  isSyncing: boolean
  lastSyncTime: number | null
}

let isSyncingActive = false

/**
 * Despacha todos los elementos pendientes en la cola de sincronización de IndexedDB hacia Firestore.
 */
export const flushSyncQueue = async (): Promise<{ synced: number; failed: number }> => {
  if (isSyncingActive) {
    return { synced: 0, failed: 0 }
  }

  if (!navigator.onLine) {
    return { synced: 0, failed: 0 }
  }

  isSyncingActive = true
  let synced = 0
  let failed = 0

  try {
    const queue = await localDB.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray()

    for (const item of queue) {
      try {
        await localDB.syncQueue.update(item.id, { status: 'syncing' })

        if (item.action === 'SUBMIT_ACTIVITY' || item.action === 'SAVE_SUBMISSION') {
          const submission = item.payload
          if (submission && submission.id) {
            const submissionRef = doc(db, 'submissions', submission.id)
            await setDoc(submissionRef, {
              ...submission,
              lastSyncedAt: Date.now(),
              isDirtyLocally: false
            }, { merge: true })

            // Actualizar estado en la base de datos local
            await localDB.cachedSubmissions.update(submission.id, {
              lastSyncedAt: Date.now(),
              isDirtyLocally: false
            })
          }
        }

        // Si se completó con éxito, retirar de la cola
        await localDB.syncQueue.delete(item.id)
        synced++
      } catch (err: any) {
        console.warn(`[SyncService] Fallo al sincronizar item ${item.id}:`, err?.message || err)
        await localDB.syncQueue.update(item.id, {
          status: 'failed',
          retryCount: (item.retryCount || 0) + 1
        })
        failed++
      }
    }
  } catch (error) {
    console.warn('[SyncService] Error general al procesar la cola de sincronización:', error)
  } finally {
    isSyncingActive = false
  }

  return { synced, failed }
}

/**
 * Agrega una acción a la cola de sincronización local y procura despacharla de inmediato si hay conexión.
 */
export const enqueueSyncAction = async (
  action: 'SAVE_SUBMISSION' | 'SUBMIT_ACTIVITY' | 'CHANGE_PASSWORD',
  payload: any
): Promise<void> => {
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action,
    payload,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0
  }

  await localDB.syncQueue.put(item)

  if (navigator.onLine) {
    // Intentar despacho inmediato en segundo plano
    flushSyncQueue().catch(() => {})
  }
}

/**
 * Inicializa los escuchas de conectividad de la PWA.
 * Retorna una función de limpieza (cleanup).
 */
export const initSyncService = (
  onStatusChange?: (status: SyncStatus) => void
): (() => void) => {
  const updateStatus = async () => {
    try {
      const pendingCount = await localDB.syncQueue
        .where('status')
        .anyOf(['pending', 'failed', 'syncing'])
        .count()

      if (onStatusChange) {
        onStatusChange({
          online: navigator.onLine,
          pendingCount,
          isSyncing: isSyncingActive,
          lastSyncTime: Date.now()
        })
      }
    } catch {
      // Ignorar si la base de datos está ocupada
    }
  }

  const handleOnline = async () => {
    await flushSyncQueue()
    await updateStatus()
  }

  const handleOffline = async () => {
    await updateStatus()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Ejecución inicial al montar
  if (navigator.onLine) {
    flushSyncQueue().then(updateStatus).catch(updateStatus)
  } else {
    updateStatus()
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
