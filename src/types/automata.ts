/**
 * Tipos de datos para el motor de autómatas de AutomatariumTec PWA.
 * Adaptado y extendido del proyecto Automatarium (Licencia MIT)
 * Repositorio upstream: https://github.com/automatarium/automatarium
 */

export type AutomataProjectType = 'AFD' | 'LEXER_DIAGRAM'

export interface Coordinate {
  x: number
  y: number
}

export interface AutomataState {
  id: number
  name: string
  label?: string
  x: number
  y: number
  isFinal: boolean
  
  // Propiedades exclusivas para Diagramas de Analizador Léxico
  token?: string               // Ejemplo: "TOKEN_ID", "TOKEN_NUM_ENTERO", "TOKEN_OP_REL"
  retract?: boolean            // Símbolo '*' de retroceso en 1 carácter del cursor
  installSymbolTable?: boolean // Indica si el lexer debe consultar o registrar en la tabla de símbolos
}

export interface AutomataTransition {
  id: number
  from: number
  to: number
  read: string // Para AFD: '0', '1', 'a', etc. Para Lexer: '[a-zA-Z]', '[0-9]', 'otro', '_', '=', etc.
}

export interface AutomataComment {
  id: number
  x: number
  y: number
  text: string
}

export interface AutomataGraph {
  projectType: AutomataProjectType
  states: AutomataState[]
  transitions: AutomataTransition[]
  initialState: number | null
  comments?: AutomataComment[]
}

// Modelado para simulación y pruebas automáticas
export interface StringTestCase {
  input: string
  expectedAccepted: boolean
  description?: string
}

export interface LexerTestCase {
  sourceCode: string
  expectedTokens: Array<{
    token: string
    lexeme: string
  }>
  description?: string
}

export interface StepTrace {
  stateId: number
  readChar: string | null
  remainingInput: string
}

export interface SimulationResult {
  accepted: boolean
  remaining: string
  trace: StepTrace[]
  message?: string
}
