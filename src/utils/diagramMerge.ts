import { AutomataGraph, AutomataState, AutomataTransition } from '../types/automata'

/**
 * Utilidades para detección de diferencias y fusión inteligente (Merge) de diagramas de autómatas
 * Diseñado para trabajo colaborativo y resolución de concurrencia offline en equipos.
 */

export interface DiagramDiffSummary {
  localStateCount: number
  remoteStateCount: number
  localTransitionCount: number
  remoteTransitionCount: number
  addedStates: string[]
  remoteAddedStates: string[]
}

/**
 * Compara si dos grafos son estructuralmente idénticos
 */
export const areGraphsEqual = (g1?: AutomataGraph | null, g2?: AutomataGraph | null): boolean => {
  if (!g1 && !g2) return true
  if (!g1 || !g2) return false

  if (g1.states.length !== g2.states.length) return false
  if (g1.transitions.length !== g2.transitions.length) return false
  if (g1.initialState !== g2.initialState) return false

  const s1Names = [...g1.states.map(s => `${s.name}_${s.isFinal}_${s.token || ''}`)].sort()
  const s2Names = [...g2.states.map(s => `${s.name}_${s.isFinal}_${s.token || ''}`)].sort()
  if (s1Names.join(',') !== s2Names.join(',')) return false

  const t1Keys = [...g1.transitions.map(t => `${t.from}_${t.to}_${t.read}`)].sort()
  const t2Keys = [...g2.transitions.map(t => `${t.from}_${t.to}_${t.read}`)].sort()
  return t1Keys.join(',') === t2Keys.join(',')
}

/**
 * Resume las diferencias clave entre la versión local y remota para mostrarlas en el modal
 */
export const getDiagramDiffSummary = (local: AutomataGraph, remote: AutomataGraph): DiagramDiffSummary => {
  const localNames = new Set(local.states.map(s => s.name))
  const remoteNames = new Set(remote.states.map(s => s.name))

  const addedStates = local.states.filter(s => !remoteNames.has(s.name)).map(s => s.name)
  const remoteAddedStates = remote.states.filter(s => !localNames.has(s.name)).map(s => s.name)

  return {
    localStateCount: local.states.length,
    remoteStateCount: remote.states.length,
    localTransitionCount: local.transitions.length,
    remoteTransitionCount: remote.transitions.length,
    addedStates,
    remoteAddedStates
  }
}

/**
 * Fusión inteligente no destructiva de dos autómatas:
 * - Conserva todos los estados locales.
 * - Integra estados remotos que no existan localmente (mapeando IDs de forma segura).
 * - Integra transiciones remotas no duplicadas.
 */
export const mergeAutomataGraphs = (local: AutomataGraph, remote: AutomataGraph): AutomataGraph => {
  const mergedStates: AutomataState[] = local.states.map(s => ({ ...s }))
  const remoteToMergedIdMap = new Map<number | string, number>()

  // Encontrar el ID numérico máximo para nuevos estados
  let maxNumericId = 0
  mergedStates.forEach(s => {
    if (typeof s.id === 'number' && s.id > maxNumericId) {
      maxNumericId = s.id
    }
  })

  // Mapear o añadir estados remotos
  remote.states.forEach(remoteState => {
    const existingLocal = mergedStates.find(s => s.name === remoteState.name)
    if (existingLocal) {
      remoteToMergedIdMap.set(remoteState.id, existingLocal.id)
      // Si la versión remota lo marcó como final o con token, preservarlo
      if (remoteState.isFinal) existingLocal.isFinal = true
      if (remoteState.token && !existingLocal.token) existingLocal.token = remoteState.token
    } else {
      maxNumericId += 1
      const newId = maxNumericId
      remoteToMergedIdMap.set(remoteState.id, newId)
      mergedStates.push({
        ...remoteState,
        id: newId,
        x: remoteState.x + 30, // Pequeño desplazamiento visual para evitar solapamiento exacto
        y: remoteState.y + 30
      })
    }
  })

  // Conservar transiciones locales
  const mergedTransitions: AutomataTransition[] = local.transitions.map(t => ({ ...t }))

  // Encontrar ID máximo de transiciones
  let maxTransId = 0
  mergedTransitions.forEach(t => {
    if (typeof t.id === 'number' && t.id > maxTransId) {
      maxTransId = t.id
    }
  })

  // Integrar transiciones remotas mapeadas
  remote.transitions.forEach(remoteTrans => {
    const mappedFrom = remoteToMergedIdMap.get(remoteTrans.from)
    const mappedTo = remoteToMergedIdMap.get(remoteTrans.to)

    if (mappedFrom !== undefined && mappedTo !== undefined) {
      const alreadyExists = mergedTransitions.some(t => 
        t.from === mappedFrom && 
        t.to === mappedTo && 
        t.read === remoteTrans.read
      )

      if (!alreadyExists) {
        maxTransId += 1
        mergedTransitions.push({
          id: maxTransId,
          from: mappedFrom,
          to: mappedTo,
          read: remoteTrans.read
        })
      }
    }
  })

  const mappedInitial = remote.initialState !== null ? remoteToMergedIdMap.get(remote.initialState) : null
  const initialState = local.initialState ?? (mappedInitial !== undefined && mappedInitial !== null ? mappedInitial : null)

  return {
    projectType: local.projectType || remote.projectType,
    states: mergedStates,
    transitions: mergedTransitions,
    initialState
  }
}
