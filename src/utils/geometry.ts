/**
 * Utilidades matemáticas y geométricas para cálculo de arcos, curvas Bezier
 * y auto-bucles de estados y transiciones en el lienzo SVG.
 * 
 * Basado y adaptado de Automatarium (Licencia MIT)
 * Repositorio: https://github.com/automatarium/automatarium
 * Copyright (c) 2022 Automatarium
 */

import { Coordinate, AutomataState, AutomataTransition } from '../types/automata'

export const STATE_RADIUS = 30 // Exacto al STATE_CIRCLE_RADIUS de Automatarium
export const LOOP_OFFSET_X = 25
export const LOOP_OFFSET_Y = 58
export const TRANSITION_BEND = 38

export const lerpPoints = (p1: Coordinate, p2: Coordinate, t: number): Coordinate => ({
  x: p1.x + t * (p2.x - p1.x),
  y: p1.y + t * (p2.y - p1.y)
})

export const distance = (p1: Coordinate, p2: Coordinate): number =>
  Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))

export const movePointTowards = (p: Coordinate, target: Coordinate, d: number): Coordinate => {
  const l = distance(p, target)
  if (l === 0) return p
  return {
    x: p.x + (d * (target.x - p.x)) / l,
    y: p.y + (d * (target.y - p.y)) / l
  }
}

export interface GroupedTransition {
  fromId: number
  toId: number
  transitions: AutomataTransition[]
  fromState: AutomataState
  toState: AutomataState
  isReflexive: boolean
  hasOpposite: boolean
}

/**
 * Agrupa transiciones entre los mismos dos estados
 */
export const groupTransitions = (
  transitions: AutomataTransition[],
  states: AutomataState[]
): GroupedTransition[] => {
  const stateMap = new Map<number, AutomataState>()
  states.forEach(s => stateMap.set(s.id, s))

  const pairKey = (from: number, to: number) => `${from}->${to}`
  const map = new Map<string, AutomataTransition[]>()

  transitions.forEach(t => {
    const key = pairKey(t.from, t.to)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  })

  const result: GroupedTransition[] = []

  map.forEach((transList, key) => {
    const [fromStr, toStr] = key.split('->')
    const fromId = parseInt(fromStr, 10)
    const toId = parseInt(toStr, 10)
    const fromState = stateMap.get(fromId)
    const toState = stateMap.get(toId)

    if (fromState && toState) {
      const isReflexive = fromId === toId
      const hasOpposite = !isReflexive && map.has(pairKey(toId, fromId))

      result.push({
        fromId,
        toId,
        transitions: transList,
        fromState,
        toState,
        isReflexive,
        hasOpposite
      })
    }
  })

  return result
}

export interface TransitionGeometry {
  pathD: string
  labelPos: Coordinate
  arrowAngle: number
  arrowTip: Coordinate
}

/**
 * Calcula la geometría precisa del trazado SVG y el punto de rotulación
 */
export const calculateTransitionGeometry = (
  gt: GroupedTransition
): TransitionGeometry => {
  const { fromState, toState, isReflexive, hasOpposite } = gt

  if (isReflexive) {
    // Auto-bucle (Self-loop hacia arriba del círculo)
    const cx = fromState.x
    const cy = fromState.y - STATE_RADIUS

    const startX = cx - 14
    const startY = fromState.y - STATE_RADIUS + 3
    const endX = cx + 14
    const endY = fromState.y - STATE_RADIUS + 3

    const ctrl1X = cx - LOOP_OFFSET_X
    const ctrl1Y = cy - LOOP_OFFSET_Y
    const ctrl2X = cx + LOOP_OFFSET_X
    const ctrl2Y = cy - LOOP_OFFSET_Y

    const pathD = `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`

    return {
      pathD,
      labelPos: { x: cx, y: cy - LOOP_OFFSET_Y + 12 },
      arrowAngle: 75,
      arrowTip: { x: endX, y: endY }
    }
  }

  // Transición entre dos estados distintos
  const p1 = { x: fromState.x, y: fromState.y }
  const p2 = { x: toState.x, y: toState.y }
  const d = distance(p1, p2)

  const bend = hasOpposite ? TRANSITION_BEND : 0

  const mid = lerpPoints(p1, p2, 0.5)
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const normal = d > 0 ? { x: -dy / d, y: dx / d } : { x: 0, y: 0 }

  const control = {
    x: mid.x + normal.x * bend,
    y: mid.y + normal.y * bend
  }

  const edge1 = movePointTowards(p1, control, STATE_RADIUS)
  const edge2 = movePointTowards(p2, control, STATE_RADIUS)

  const pathD = bend === 0
    ? `M ${edge1.x} ${edge1.y} L ${edge2.x} ${edge2.y}`
    : `M ${edge1.x} ${edge1.y} Q ${control.x} ${control.y} ${edge2.x} ${edge2.y}`

  const labelPos = bend === 0
    ? { x: mid.x + normal.x * 14, y: mid.y + normal.y * 14 }
    : { x: control.x + normal.x * 6, y: control.y + normal.y * 6 }

  const arrowVector = { x: edge2.x - control.x, y: edge2.y - control.y }
  const arrowAngle = Math.atan2(arrowVector.y, arrowVector.x) * (180 / Math.PI)

  return {
    pathD,
    labelPos,
    arrowAngle,
    arrowTip: edge2
  }
}
