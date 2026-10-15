/**
 * Panel de Simulación y Evaluación para Autómatas Finitos Deterministas (AFD)
 */

import React, { useState } from 'react'
import { AutomataGraph, StringTestCase } from '../../types/automata'
import { simulateAFD, runAFDTestSuite, TestCaseEvaluation } from '../../simulation/afdSimulator'
import { Play, SkipForward, RotateCcw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface AFDSimulatorPanelProps {
  graph: AutomataGraph
  testCases?: StringTestCase[]
  onStepChange?: (stateId: number | null) => void
}

export const AFDSimulatorPanel: React.FC<AFDSimulatorPanelProps> = ({
  graph,
  testCases = [],
  onStepChange
}) => {
  const [activeTab, setActiveTab] = useState<'step' | 'tests'>('step')
  const [testString, setTestString] = useState('101')
  const [stepIndex, setStepIndex] = useState(0)
  const [simulation, setSimulation] = useState(() => simulateAFD(graph, '101'))
  const [evaluations, setEvaluations] = useState<TestCaseEvaluation[]>([])
  const [score, setScore] = useState<{ passed: number; total: number; pct: number } | null>(null)

  const handleSimulate = (str: string) => {
    setTestString(str)
    const result = simulateAFD(graph, str)
    setSimulation(result)
    setStepIndex(0)
    if (result.trace.length > 0 && onStepChange) {
      onStepChange(result.trace[0].stateId)
    }
  }

  const handleNextStep = () => {
    if (stepIndex < simulation.trace.length - 1) {
      const nextIdx = stepIndex + 1
      setStepIndex(nextIdx)
      if (onStepChange) {
        onStepChange(simulation.trace[nextIdx].stateId)
      }
    }
  }

  const handleResetStep = () => {
    setStepIndex(0)
    if (simulation.trace.length > 0 && onStepChange) {
      onStepChange(simulation.trace[0].stateId)
    } else if (onStepChange) {
      onStepChange(null)
    }
  }

  const handleRunAllTests = () => {
    const res = runAFDTestSuite(graph, testCases)
    setEvaluations(res.evaluations)
    setScore({ passed: res.passedCount, total: res.totalCount, pct: res.scorePercentage })
  }

  const currentStep = simulation.trace[stepIndex]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '14px' }}>
      {/* Pestañas: Paso a Paso vs Casos de Prueba */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'step' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('step')}
        >
          <Play size={13} /> Simulación Paso a Paso
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

      {activeTab === 'step' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Entrada de cadena */}
          <div>
            <label style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Cadena de entrada a evaluar:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={testString}
                onChange={(e) => handleSimulate(e.target.value)}
                placeholder="ej. 01001"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSimulate(testString)}
              >
                Reiniciar
              </button>
            </div>
          </div>

          {/* Controles de avance paso a paso */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Paso {simulation.trace.length > 0 ? stepIndex + 1 : 0} de {simulation.trace.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetStep}
                disabled={stepIndex === 0}
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleNextStep}
                disabled={stepIndex >= simulation.trace.length - 1}
              >
                <SkipForward size={13} /> Siguiente Paso
              </button>
            </div>
          </div>

          {/* Visualizador de traza y cinta */}
          {currentStep && (
            <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Estado actual en simulación:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-afd" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                  q{currentStep.stateId}
                </span>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                  {currentStep.readChar !== null ? `Leyó símbolo: '${currentStep.readChar}'` : 'Inicio'}
                </span>
              </div>

              <div style={{ marginTop: 10, fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Entrada restante: </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  "{currentStep.remainingInput}"
                </span>
              </div>
            </div>
          )}

          {/* Resultado final */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: simulation.accepted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${simulation.accepted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {simulation.accepted ? (
              <CheckCircle2 color="var(--success)" size={20} />
            ) : (
              <XCircle color="var(--danger)" size={20} />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: simulation.accepted ? '#6ee7b7' : '#fca5a5' }}>
                {simulation.accepted ? 'Cadena Aceptada' : 'Cadena Rechazada'}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                {simulation.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Evaluación Automática</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRunAllTests}
            >
              Re-evaluar Todos
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
                  {score.passed} de {score.total} casos correctos
                </div>
              </div>
            </div>
          )}

          {/* Lista de casos de prueba */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '280px', overflowY: 'auto' }}>
            {evaluations.map((ev, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,0,0,0.2)',
                  borderLeft: `3px solid ${ev.passed ? 'var(--success)' : 'var(--danger)'}`
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    "{ev.testCase.input}"
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Esperado: {ev.testCase.expectedAccepted ? 'Aceptar' : 'Rechazar'}
                  </div>
                </div>
                <div>
                  {ev.passed ? (
                    <span className="badge badge-success">Correcto</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>Fallo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
