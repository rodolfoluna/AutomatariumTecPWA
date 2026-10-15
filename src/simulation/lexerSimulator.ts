/**
 * Simulador de Diagramas de Transición para Analizadores Léxicos.
 * Permite modelar autómatas para reconocimiento de tokens en compiladores,
 * con soporte para clases de caracteres, retroceso de cursor ('*') y tabla de símbolos.
 */

import { AutomataGraph, LexerTestCase } from '../types/automata'

export interface EmittedToken {
  token: string
  lexeme: string
  startPos: number
  endPos: number
}

export interface LexerError {
  message: string
  position: number
  remainingSource: string
}

export interface LexerSimulationResult {
  tokens: EmittedToken[]
  errors: LexerError[]
  symbolTable: Set<string>
  success: boolean
}

// Lista estándar de palabras reservadas comunes para simulación
const DEFAULT_RESERVED_WORDS = new Set([
  'if', 'else', 'while', 'for', 'int', 'float', 'return', 'void', 'main', 'char', 'double'
])

/**
 * Evalúa si un carácter coincide con la etiqueta de transición
 * Soporta rangos y etiquetas comunes: [a-z], [A-Z], [a-zA-Z], [0-9], letra, digito, _, otro, etc.
 */
export const matchTransitionSymbol = (
  transitionRead: string,
  char: string,
  otherTransitionsFromState: string[]
): boolean => {
  const t = transitionRead.trim()

  // Caso especial "otro" u "other": coincide si ningún otro arco saliente coincide
  if (t.toLowerCase() === 'otro' || t.toLowerCase() === 'other' || t === '*') {
    const matchedAnyOther = otherTransitionsFromState
      .filter(o => o.trim().toLowerCase() !== 'otro' && o.trim().toLowerCase() !== 'other')
      .some(otherT => matchTransitionSymbol(otherT, char, []))
    return !matchedAnyOther
  }

  // Clases de caracteres comunes
  if (t === '[a-zA-Z]' || t.toLowerCase() === 'letra') {
    return /^[a-zA-Z]$/.test(char)
  }
  if (t === '[0-9]' || t.toLowerCase() === 'digito' || t.toLowerCase() === 'dígito') {
    return /^[0-9]$/.test(char)
  }
  if (t === '[a-zA-Z0-9]' || t.toLowerCase() === 'letra_o_digito') {
    return /^[a-zA-Z0-9]$/.test(char)
  }
  if (t === '[a-zA-Z0-9_]') {
    return /^[a-zA-Z0-9_]$/.test(char)
  }
  if (t === '\\s' || t.toLowerCase() === 'espacio' || t.toLowerCase() === 'delimitador') {
    return /\s/.test(char)
  }

  // Lista separada por comas (ej. '+, -, *')
  const options = t.split(',').map(s => s.trim())
  if (options.includes(char)) return true

  // Comparación literal exacta
  return t === char
}

/**
 * Ejecuta el análisis léxico continuo sobre un código fuente
 */
export const simulateLexer = (
  graph: AutomataGraph,
  sourceCode: string,
  reservedWords: Set<string> = DEFAULT_RESERVED_WORDS
): LexerSimulationResult => {
  const tokens: EmittedToken[] = []
  const errors: LexerError[] = []
  const symbolTable = new Set<string>()

  if (graph.initialState === null) {
    return {
      tokens: [],
      errors: [{ message: 'El diagrama no tiene un estado inicial.', position: 0, remainingSource: sourceCode }],
      symbolTable,
      success: false
    }
  }

  const stateMap = new Map(graph.states.map(s => [s.id, s]))
  let cursor = 0
  const maxIterations = 5000 // Protección contra bucles infinitos
  let iteration = 0

  while (cursor < sourceCode.length && iteration++ < maxIterations) {
    // Ignorar espacios en blanco iniciales si no hay una transición específica para ellos
    while (cursor < sourceCode.length && /\s/.test(sourceCode[cursor])) {
      // Verificar si desde el estado inicial hay un arco para espacio
      const initialTransitions = graph.transitions.filter(t => t.from === graph.initialState)
      const hasSpaceTransition = initialTransitions.some(t => matchTransitionSymbol(t.read, sourceCode[cursor], []))
      if (hasSpaceTransition) break
      cursor++
    }

    if (cursor >= sourceCode.length) break

    let current = stateMap.get(graph.initialState)!
    let tokenStart = cursor
    let lexeme = ''
    let isStuck = false

    // Avanzar a través del diagrama hasta alcanzar un estado de aceptación o atascarse
    while (current && !current.isFinal && cursor < sourceCode.length) {
      const char = sourceCode[cursor]
      const outgoing = graph.transitions.filter(t => t.from === current.id)
      const allReads = outgoing.map(t => t.read)

      const matchedTrans = outgoing.find(t => matchTransitionSymbol(t.read, char, allReads))

      if (!matchedTrans) {
        isStuck = true
        break
      }

      lexeme += char
      cursor++
      current = stateMap.get(matchedTrans.to)!
    }

    if (current && current.isFinal) {
      // Estado de aceptación alcanzado
      let tokenName = current.token || 'TOKEN_DESCONOCIDO'

      // Manejar retroceso '*' (retract)
      if (current.retract && lexeme.length > 0) {
        const lastChar = lexeme[lexeme.length - 1]
        lexeme = lexeme.slice(0, -1)
        cursor-- // Retraer el cursor 1 carácter
      }

      // Manejar tabla de símbolos y palabras reservadas
      if (current.installSymbolTable || tokenName.includes('ID')) {
        if (reservedWords.has(lexeme.toLowerCase())) {
          tokenName = `TOKEN_KW_${lexeme.toUpperCase()}`
        } else {
          symbolTable.add(lexeme)
        }
      }

      tokens.push({
        token: tokenName,
        lexeme,
        startPos: tokenStart,
        endPos: cursor
      })
    } else {
      // Error léxico: no se pudo formar un token válido
      errors.push({
        message: `Error léxico cerca de '${sourceCode.slice(tokenStart, Math.min(tokenStart + 8, sourceCode.length))}'`,
        position: tokenStart,
        remainingSource: sourceCode.slice(tokenStart)
      })
      cursor = tokenStart + 1 // Avanzar para no bloquearse
    }
  }

  return {
    tokens,
    errors,
    symbolTable,
    success: errors.length === 0 && tokens.length > 0
  }
}

export interface LexerTestCaseEvaluation {
  testCase: LexerTestCase
  passed: boolean
  tokensReceived: EmittedToken[]
  message: string
}

export const runLexerTestSuite = (
  graph: AutomataGraph,
  testCases: LexerTestCase[]
): {
  evaluations: LexerTestCaseEvaluation[]
  passedCount: number
  totalCount: number
  scorePercentage: number
} => {
  const evaluations: LexerTestCaseEvaluation[] = testCases.map(tc => {
    const result = simulateLexer(graph, tc.sourceCode)
    
    // Comparar los tokens esperados con los emitidos
    let matches = result.errors.length === 0 && result.tokens.length === tc.expectedTokens.length
    if (matches) {
      for (let i = 0; i < tc.expectedTokens.length; i++) {
        const expected = tc.expectedTokens[i]
        const actual = result.tokens[i]
        if (actual.token !== expected.token || actual.lexeme !== expected.lexeme) {
          matches = false
          break
        }
      }
    }

    return {
      testCase: tc,
      passed: matches,
      tokensReceived: result.tokens,
      message: matches
        ? `Correcto: Se reconocieron los ${tc.expectedTokens.length} tokens esperados.`
        : `Divergencia: Se esperaban [${tc.expectedTokens.map(t => `${t.token}('${t.lexeme}')`).join(', ')}] pero se obtuvieron [${result.tokens.map(t => `${t.token}('${t.lexeme}')`).join(', ')}].`
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
