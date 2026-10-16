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

/**
 * Normaliza cualquier formato de autómata (claves numéricas o string, isAccept o isFinal, label o read)
 * al estándar exacto de AutomataGraph que esperan GraphCanvas y los simuladores.
 */
export const normalizeAutomataGraph = (raw: any, defaultType: 'AFD' | 'LEXER_DIAGRAM' = 'AFD'): AutomataGraph => {
  if (!raw) {
    return {
      projectType: defaultType,
      states: [],
      transitions: [],
      initialState: null
    }
  }

  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { projectType: defaultType, states: [], transitions: [], initialState: null }
    }
  }

  const rawStates: any[] = Array.isArray(parsed?.states) ? parsed.states : []
  const rawTransitions: any[] = Array.isArray(parsed?.transitions) ? parsed.transitions : []

  const stateIdMap = new Map<any, number>()
  const states: AutomataState[] = rawStates.map((s, idx) => {
    const numericId = typeof s.id === 'number' ? s.id : idx
    stateIdMap.set(s.id, numericId)
    if (s.name) stateIdMap.set(s.name, numericId)

    return {
      id: numericId,
      name: s.name || `q${idx}`,
      x: typeof s.x === 'number' ? s.x : 140 + idx * 120,
      y: typeof s.y === 'number' ? s.y : 160,
      isFinal: s.isFinal === true || s.isAccept === true,
      token: s.token || (s.isAccept || s.isFinal ? 'TOKEN_ID' : undefined),
      retract: !!s.retract
    }
  })

  let initialState: number | null = null
  if (parsed.initialState !== undefined && parsed.initialState !== null) {
    initialState = stateIdMap.get(parsed.initialState) ?? (typeof parsed.initialState === 'number' ? parsed.initialState : null)
  }
  if (initialState === null && states.length > 0) {
    const foundInit = rawStates.find((s: any) => s.isInitial)
    if (foundInit) {
      initialState = stateIdMap.get(foundInit.id) ?? 0
    } else {
      initialState = states[0].id
    }
  }

  const transitions: AutomataTransition[] = rawTransitions.map((t, idx) => {
    const fromId = stateIdMap.get(t.from) ?? (typeof t.from === 'number' ? t.from : 0)
    const toId = stateIdMap.get(t.to) ?? (typeof t.to === 'number' ? t.to : 0)
    const read = t.read || t.label || t.symbol || '0'
    return {
      id: typeof t.id === 'number' ? t.id : idx + 1,
      from: fromId,
      to: toId,
      read
    }
  })

  return {
    projectType: parsed.projectType || defaultType,
    states,
    transitions,
    initialState
  }
}

