/**
 * Simulador de Autómatas Finitos Deterministas (AFD)
 * Inspirado en la lógica de simulación de Automatarium (Licencia MIT).
 */

import { AutomataGraph, SimulationResult, StepTrace, StringTestCase } from '../types/automata'

export const simulateAFD = (
  graph: AutomataGraph,
  input: string
): SimulationResult => {
  if (graph.initialState === null) {
    return {
      accepted: false,
      remaining: input,
      trace: [],
      message: 'El autómata no tiene un estado inicial definido.'
    }
  }

  const stateMap = new Map(graph.states.map(s => [s.id, s]))
  let current = stateMap.get(graph.initialState)

  if (!current) {
    return {
      accepted: false,
      remaining: input,
      trace: [],
      message: 'Estado inicial inválido.'
    }
  }

  const trace: StepTrace[] = [{
    stateId: current.id,
    readChar: null,
    remainingInput: input
  }]

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const remaining = input.slice(i + 1)

    // Buscar la transición que coincida con el carácter
    // En un AFD estricto debe haber a lo más una transición por símbolo
    const transition = graph.transitions.find(t => {
      if (t.from !== current!.id) return false
      // Soportar símbolos múltiples separados por coma (ej: '0, 1') o símbolo exacto
      const symbols = t.read.split(',').map(s => s.trim())
      return symbols.includes(char)
    })

    if (!transition) {
      // Estado de error / no hay transición definida
      return {
        accepted: false,
        remaining: input.slice(i),
        trace,
        message: `No existe transición desde el estado "${current.name || 'q' + current.id}" con el símbolo '${char}'.`
      }
    }

    current = stateMap.get(transition.to)
    if (!current) {
      return {
        accepted: false,
        remaining,
        trace,
        message: `Estado destino ${transition.to} no encontrado.`
      }
    }

    trace.push({
      stateId: current.id,
      readChar: char,
      remainingInput: remaining
    })
  }

  const isAccepted = current.isFinal
  return {
    accepted: isAccepted,
    remaining: '',
    trace,
    message: isAccepted
      ? `Cadena aceptada en estado de aceptación "${current.name || 'q' + current.id}".`
      : `Cadena consumida pero detenida en estado no final "${current.name || 'q' + current.id}".`
  }
}

export interface TestCaseEvaluation {
  testCase: StringTestCase
  actualAccepted: boolean
  passed: boolean
  message: string
}

export const runAFDTestSuite = (
  graph: AutomataGraph,
  testCases: StringTestCase[]
): {
  evaluations: TestCaseEvaluation[]
  passedCount: number
  totalCount: number
  scorePercentage: number
} => {
  const evaluations: TestCaseEvaluation[] = testCases.map(tc => {
    const result = simulateAFD(graph, tc.input)
    const passed = result.accepted === tc.expectedAccepted
    return {
      testCase: tc,
      actualAccepted: result.accepted,
      passed,
      message: passed 
        ? `Éxito: la cadena "${tc.input}" fue ${tc.expectedAccepted ? 'aceptada' : 'rechazada'} como se esperaba.`
        : `Fallo: la cadena "${tc.input}" debió ser ${tc.expectedAccepted ? 'aceptada' : 'rechazada'}, pero fue ${result.accepted ? 'aceptada' : 'rechazada'}.`
    }
  })

  const passedCount = evaluations.filter(e => e.passed).length
  const totalCount = testCases.length
  const scorePercentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100

  return {
    evaluations,
    passedCount,
    totalCount,
    scorePercentage
  }
}
