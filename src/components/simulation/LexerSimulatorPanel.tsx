/**
 * Panel de Simulación y Visualización de Analizadores Léxicos (Diagramas de Transición)
 */

import React, { useState } from 'react'
import { AutomataGraph, LexerTestCase } from '../../types/automata'
import { simulateLexer, runLexerTestSuite, LexerTestCaseEvaluation } from '../../simulation/lexerSimulator'
import { Code, Terminal, Database, CheckCircle2, AlertTriangle } from 'lucide-react'

interface LexerSimulatorPanelProps {
  graph: AutomataGraph
  testCases?: LexerTestCase[]
}

export const LexerSimulatorPanel: React.FC<LexerSimulatorPanelProps> = ({
  graph,
  testCases = []
}) => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'tests'>('interactive')
  const [sampleSource, setSampleSource] = useState('total = contador + 42;')
  const [simResult, setSimResult] = useState(() => simulateLexer(graph, 'total = contador + 42;'))
  const [evaluations, setEvaluations] = useState<LexerTestCaseEvaluation[]>([])
  const [score, setScore] = useState<{ passed: number; total: number; pct: number } | null>(null)

  const handleRunLexer = (source: string) => {
    setSampleSource(source)
    const res = simulateLexer(graph, source)
    setSimResult(res)
  }

  const handleRunAllTests = () => {
    const res = runLexerTestSuite(graph, testCases)
    setEvaluations(res.evaluations)
    setScore({ passed: res.passedCount, total: res.totalCount, pct: res.scorePercentage })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '14px' }}>
      {/* Pestañas: Modo Interactivo vs Casos de Prueba */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'interactive' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('interactive')}
        >
          <Code size={13} /> Escáner Léxico Interactivo
        </button>
        {testCases.length > 0 && (
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'tests' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveTab('tests')
              if (evaluations.length === 0) handleRunAllTests()
            }}
          >
            <CheckCircle2 size={13} /> Casos de Prueba ({testCases.length})
          </button>
        )}
      </div>

      {activeTab === 'interactive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Editor de código de prueba */}
          <div>
            <label style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Código fuente de prueba:
            </label>
            <textarea
              className="form-textarea"
              style={{ fontFamily: 'var(--font-mono)', height: '70px', resize: 'vertical' }}
              value={sampleSource}
              onChange={(e) => handleRunLexer(e.target.value)}
              placeholder="Escribe código para tokenizar..."
            />
          </div>

          {/* Tabla de Tokens emitidos */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Terminal size={14} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Tokens Reconocidos ({simResult.tokens.length})
              </span>
            </div>

            <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              {simResult.tokens.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.775rem', color: 'var(--text-subtle)' }}>
                  No se emitieron tokens todavía. Verifica los estados de aceptación y arcos.
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: '0.775rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '6px 10px' }}>Token</th>
                      <th style={{ padding: '6px 10px' }}>Lexema</th>
                      <th style={{ padding: '6px 10px', width: '50px' }}>Pos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simResult.tokens.map((tok, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '6px 10px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          {tok.token}
                        </td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                          "{tok.lexeme}"
                        </td>
                        <td style={{ padding: '6px 10px', color: 'var(--text-subtle)' }}>
                          {tok.startPos}..{tok.endPos}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Errores Léxicos si existen */}
          {simResult.errors.length > 0 && (
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600 }}>
                <AlertTriangle size={14} /> Errores Léxicos Detectados
              </div>
              {simResult.errors.map((err, idx) => (
                <div key={idx} style={{ fontSize: '0.75rem', color: '#fecaca', marginTop: 4 }}>
                  • Posición {err.position}: {err.message}
                </div>
              ))}
            </div>
          )}

          {/* Tabla de Símbolos Generada */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Database size={13} color="var(--primary)" />
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Tabla de Símbolos ({simResult.symbolTable.size} identificadores)
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from(simResult.symbolTable).map((id, idx) => (
                <span key={idx} className="badge badge-lexer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>
                  {id}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pruebas del Analizador Léxico</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRunAllTests}
            >
              Re-evaluar
            </button>
          </div>

          {score && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: score.pct === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--border)'
            }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: score.pct === 100 ? 'var(--success)' : 'var(--warning)' }}>
                  {score.pct}% Aprobado
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {score.passed} de {score.total} pruebas correctas
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '250px', overflowY: 'auto' }}>
            {evaluations.map((ev, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,0,0,0.2)',
                  borderLeft: `3px solid ${ev.passed ? 'var(--success)' : 'var(--danger)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>"{ev.testCase.sourceCode}"</span>
                  <span className={`badge ${ev.passed ? 'badge-success' : 'badge-warning'}`}>
                    {ev.passed ? 'Correcto' : 'Error'}
                  </span>
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
                  {ev.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
