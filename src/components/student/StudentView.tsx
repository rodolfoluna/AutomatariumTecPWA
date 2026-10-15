/**
 * Vista de Trabajo del Alumno (Estilo Oficial Automatarium):
 * - Navegación ágil entre Actividades y Ejercicios con auto-guardado
 * - Botones de navegación Anterior / Siguiente con preservación de estado
 * - Soporte para Actividades Individuales o EN EQUIPO (avance compartido)
 * - Cambio forzoso de contraseña en primer login
 */

import React, { useState, useEffect } from 'react'
import { Activity, Exercise, ActivitySubmission, ExerciseSubmission, AFDExercise, LexerExercise } from '../../types/academic'
import { AutomataGraph } from '../../types/automata'
import { GraphCanvas } from '../canvas/GraphCanvas'
import { AFDSimulatorPanel } from '../simulation/AFDSimulatorPanel'
import { LexerSimulatorPanel } from '../simulation/LexerSimulatorPanel'
import { runAFDTestSuite } from '../../simulation/afdSimulator'
import { runLexerTestSuite } from '../../simulation/lexerSimulator'
import { localDB } from '../../db/indexedDb'
import { 
  Lock, 
  Save, 
  Send, 
  Users, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  BookOpen
} from 'lucide-react'

interface StudentViewProps {
  studentControlNumber: string
  studentFullName: string
  mustChangePassword?: boolean
  activities: Activity[]
  onPasswordChanged: (newPassword: string) => void
  onSubmissionComplete: (submission: ActivitySubmission) => void
}

export const StudentView: React.FC<StudentViewProps> = ({
  studentControlNumber,
  studentFullName,
  mustChangePassword = false,
  activities,
  onPasswordChanged,
  onSubmissionComplete
}) => {
  const [showPasswordModal, setShowPasswordModal] = useState(mustChangePassword)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Selector de Actividad y Ejercicio
  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id || '')
  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0] || null
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0)

  // Estado del equipo (para actividades colaborativas)
  const [teamMembers, setTeamMembers] = useState<Array<{ controlNumber: string; fullName: string }>>([
    { controlNumber: studentControlNumber, fullName: studentFullName },
    { controlNumber: '21280999', fullName: 'Sánchez Morales Carlos' }
  ])
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [partnerControlNum, setPartnerControlNum] = useState('')
  const [partnerFullName, setPartnerFullName] = useState('')
  const [lastEditedByInfo, setLastEditedByInfo] = useState<string>('Tú (Guardado local)')

  const currentExercise: Exercise | undefined = selectedActivity?.exercises[selectedExerciseIndex]
  const isTeam = selectedActivity?.isTeamActivity || false
  const teamId = isTeam ? `team_${selectedActivity?.id}_${teamMembers.map(m => m.controlNumber).sort().join('_')}` : undefined

  const [currentGraph, setCurrentGraph] = useState<AutomataGraph>(() => {
    return {
      projectType: currentExercise?.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
      states: [
        { id: 0, name: 'q0', x: 140, y: 160, isFinal: false },
        { id: 1, name: 'q1', x: 300, y: 160, isFinal: true, token: 'TOKEN_ID' }
      ],
      transitions: [
        { id: 1, from: 0, to: 1, read: currentExercise?.type === 'LEXER_DIAGRAM' ? '[a-zA-Z]' : '0' }
      ],
      initialState: 0
    }
  })

  const [activeSimulationState, setActiveSimulationState] = useState<number | null>(null)
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null)

  // Cargar borrador de IndexedDB al cambiar de ejercicio o actividad
  useEffect(() => {
    if (!currentExercise || !selectedActivity) return

    const loadDraft = async () => {
      const storageKey = isTeam && teamId
        ? `${teamId}_${currentExercise.id}`
        : `${selectedActivity.id}_${currentExercise.id}`
      
      const existingDraft = await localDB.drafts.get(storageKey)

      if (existingDraft) {
        setCurrentGraph(existingDraft.graph)
      } else {
        setCurrentGraph({
          projectType: currentExercise.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
          states: [
            { id: 0, name: 'q0', x: 140, y: 160, isFinal: false },
            { id: 1, name: 'q1', x: 300, y: 160, isFinal: true, token: currentExercise.type === 'LEXER_DIAGRAM' ? 'TOKEN_ID' : undefined }
          ],
          transitions: [
            { id: 1, from: 0, to: 1, read: currentExercise.type === 'LEXER_DIAGRAM' ? '[a-zA-Z]' : '0' }
          ],
          initialState: 0
        })
      }
    }

    loadDraft()
  }, [selectedActivity?.id, currentExercise?.id, isTeam, teamId])

  // Guardado de borrador offline
  const handleSaveDraftOffline = async () => {
    if (!selectedActivity || !currentExercise) return

    const storageKey = isTeam && teamId
      ? `${teamId}_${currentExercise.id}`
      : `${selectedActivity.id}_${currentExercise.id}`

    await localDB.drafts.put({
      id: storageKey,
      activityId: selectedActivity.id,
      exerciseId: currentExercise.id,
      title: currentExercise.title,
      projectType: currentGraph.projectType,
      graph: currentGraph,
      updatedAt: Date.now()
    })

    setLastEditedByInfo(`Tú (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`)
    setSaveStatusMessage(isTeam ? 'Borrador del equipo guardado localmente' : 'Borrador guardado localmente')
    setTimeout(() => setSaveStatusMessage(null), 3000)
  }

  // Navegación segura entre ejercicios (con auto-guardado previo)
  const handleNavigateToExercise = async (targetIndex: number) => {
    if (!selectedActivity || targetIndex < 0 || targetIndex >= selectedActivity.exercises.length) return
    // Auto-guardar borrador del ejercicio actual antes de cambiar
    await handleSaveDraftOffline()
    setSelectedExerciseIndex(targetIndex)
  }

  // Cambio de actividad
  const handleChangeActivity = async (newActId: string) => {
    if (newActId === selectedActivityId) return
    await handleSaveDraftOffline()
    setSelectedActivityId(newActId)
    setSelectedExerciseIndex(0)
  }

  const handleSubmitActivity = async () => {
    if (!selectedActivity || !currentExercise) return

    await handleSaveDraftOffline()

    const submissionId = isTeam && teamId
      ? teamId
      : `${selectedActivity.id}_${studentControlNumber}`

    // Compilar todos los ejercicios de la actividad (del borrador local o del grafo actual)
    const exerciseSubmissions: Record<string, ExerciseSubmission> = {}

    for (const ex of selectedActivity.exercises) {
      let graphToEvaluate = currentGraph
      if (ex.id !== currentExercise.id) {
        const storageKey = isTeam && teamId
          ? `${teamId}_${ex.id}`
          : `${selectedActivity.id}_${ex.id}`
        const draft = await localDB.drafts.get(storageKey)
        if (draft) {
          graphToEvaluate = draft.graph
        } else {
          graphToEvaluate = {
            projectType: ex.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
            states: [{ id: 0, name: 'q0', x: 140, y: 160, isFinal: false }],
            transitions: [],
            initialState: 0
          }
        }
      }

      let testsPassed = 0
      let testsTotal = ex.testCases.length
      if (ex.type === 'AFD') {
        const results = runAFDTestSuite(graphToEvaluate, (ex as AFDExercise).testCases)
        testsPassed = results.passedCount
        testsTotal = results.totalCount
      } else {
        const results = runLexerTestSuite(graphToEvaluate, (ex as LexerExercise).testCases)
        testsPassed = results.passedCount
        testsTotal = results.totalCount
      }

      exerciseSubmissions[ex.id] = {
        exerciseId: ex.id,
        graph: graphToEvaluate,
        status: 'submitted',
        testsPassed,
        testsTotal,
        score: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 100,
        updatedAt: Date.now()
      }
    }

    const submission: ActivitySubmission = {
      id: submissionId,
      activityId: selectedActivity.id,
      studentUid: `student_${studentControlNumber}`,
      controlNumber: studentControlNumber,
      studentName: studentFullName,
      groupId: selectedActivity.groupIds[0] || 'default_group',
      overallStatus: 'submitted',
      submittedAt: Date.now(),
      isDirtyLocally: !navigator.onLine,
      isTeamSubmission: isTeam,
      teamId: isTeam ? teamId : undefined,
      teamName: isTeam ? `Equipo: ${teamMembers.map(m => m.fullName.split(' ')[0]).join(' & ')}` : undefined,
      teamMembers: isTeam ? teamMembers : undefined,
      lastEditedBy: {
        controlNumber: studentControlNumber,
        fullName: studentFullName,
        timestamp: Date.now()
      },
      version: 1,
      exerciseSubmissions
    }

    await localDB.cachedSubmissions.put(submission)
    await localDB.syncQueue.put({
      id: `sync_${Date.now()}`,
      action: 'SUBMIT_ACTIVITY',
      payload: submission,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    })

    onSubmissionComplete(submission)
    setSaveStatusMessage(isTeam ? '¡Actividad entregada para todo el equipo!' : '¡Actividad entregada con éxito!')
  }

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault()
    if (!partnerControlNum.trim() || !partnerFullName.trim()) return

    if (!teamMembers.some(m => m.controlNumber === partnerControlNum.trim())) {
      setTeamMembers([...teamMembers, {
        controlNumber: partnerControlNum.trim(),
        fullName: partnerFullName.trim()
      }])
    }
    setPartnerControlNum('')
    setPartnerFullName('')
    setShowTeamModal(false)
  }

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    onPasswordChanged(newPassword)
    setShowPasswordModal(false)
  }

  const totalExercises = selectedActivity?.exercises.length || 0

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. BARRA SUPERIOR: DATOS DEL ALUMNO Y SELECTOR DE ACTIVIDAD */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 18px',
        background: '#1F1F1F',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Identificación del Alumno */}
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--white)' }}>
              {studentFullName}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
              [{studentControlNumber}]
            </span>
          </div>

          {/* SELECTOR DE ACTIVIDADES ASIGNADAS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#141414', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid #333' }}>
            <BookOpen size={13} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actividad:</span>
            <select
              className="form-select"
              style={{ padding: '3px 8px', fontSize: '0.8rem', width: 'auto', background: 'transparent', border: 'none', color: 'var(--white)', fontWeight: 600 }}
              value={selectedActivity?.id}
              onChange={(e) => handleChangeActivity(e.target.value)}
            >
              {activities.map(act => (
                <option key={act.id} value={act.id} style={{ background: '#242424', color: '#fff' }}>
                  {act.title} {act.isTeamActivity ? '(Equipo)' : '(Individual)'}
                </option>
              ))}
            </select>
          </div>

          {/* Banner de Equipo si aplica */}
          {isTeam && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 10px',
              background: 'hsl(270, 50%, 15%)',
              border: '1px solid hsl(270, 60%, 35%)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <Users size={13} color="#D8B4FE" />
              <span style={{ fontSize: '0.75rem', color: '#E9D5FF', fontWeight: 500 }}>
                Equipo: {teamMembers.map(m => m.fullName.split(' ')[0]).join(' & ')}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '1px 6px', fontSize: '0.675rem' }}
                onClick={() => setShowTeamModal(true)}
              >
                <UserPlus size={11} /> Miembros
              </button>
            </div>
          )}
        </div>

        {/* Acciones de Guardado y Entrega */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveStatusMessage && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 size={13} /> {saveStatusMessage}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSaveDraftOffline}
            title="Guardar borrador en el almacenamiento local IndexedDB"
          >
            <Save size={13} /> Guardar Borrador
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSubmitActivity}
            title={isTeam ? 'Entregar para todos los integrantes' : 'Entregar tu actividad'}
          >
            <Send size={13} /> {isTeam ? 'Entregar para el Equipo' : 'Entregar Actividad'}
          </button>
        </div>
      </div>

      {/* 2. BARRA DE NAVEGACIÓN ENTRE EJERCICIOS (ANTERIOR / PESTAÑAS / SIGUIENTE) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 18px',
        background: '#181818',
        borderBottom: '1px solid #2B2B2B'
      }}>
        {/* Botones de navegación Anterior / Siguiente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={selectedExerciseIndex === 0}
            onClick={() => handleNavigateToExercise(selectedExerciseIndex - 1)}
            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            title="Ir al ejercicio anterior (guarda borrador automáticamente)"
          >
            <ChevronLeft size={14} /> Anterior
          </button>

          {/* Pestañas de todos los ejercicios de la actividad */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {selectedActivity?.exercises.map((ex, idx) => {
              const isCurrent = selectedExerciseIndex === idx
              return (
                <button
                  key={ex.id}
                  type="button"
                  className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handleNavigateToExercise(idx)}
                >
                  <span style={{ fontWeight: 600 }}>{idx + 1}.</span>
                  <span>{ex.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD'}</span>
                  {isCurrent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#111' }} />}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={selectedExerciseIndex >= totalExercises - 1}
            onClick={() => handleNavigateToExercise(selectedExerciseIndex + 1)}
            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            title="Ir al siguiente ejercicio (guarda borrador automáticamente)"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>

        {/* Info de posición y sincronización */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Ejercicio {selectedExerciseIndex + 1} de {totalExercises}
          </span>

          {isTeam && (
            <span style={{ fontSize: '0.725rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {lastEditedByInfo}
            </span>
          )}
        </div>
      </div>

      {/* 3. ÁREA DE TRABAJO: LIENZO (65%) + SIMULADOR / PRUEBAS (35%) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 410px', overflow: 'hidden' }}>
        <div style={{ height: '100%', position: 'relative' }}>
          <GraphCanvas
            graph={currentGraph}
            onChange={setCurrentGraph}
            activeStateId={activeSimulationState}
          />
        </div>

        <div style={{
          borderLeft: '1px solid #333',
          background: '#1A1A1A',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto'
        }}>
          {currentExercise && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #2E2E2E', background: '#161616' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-header)' }}>{currentExercise.title}</h4>
                <span className={`badge ${currentExercise.type === 'LEXER_DIAGRAM' ? 'badge-lexer' : 'badge-afd'}`}>
                  {currentExercise.type === 'LEXER_DIAGRAM' ? 'Léxico' : 'AFD'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {currentExercise.instructions}
              </p>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {currentExercise?.type === 'LEXER_DIAGRAM' ? (
              <LexerSimulatorPanel
                graph={currentGraph}
                testCases={currentExercise.testCases}
              />
            ) : (
              <AFDSimulatorPanel
                graph={currentGraph}
                testCases={currentExercise ? (currentExercise as any).testCases : []}
                onStepChange={setActiveSimulationState}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal: Integrantes del Equipo */}
      {showTeamModal && (
        <div className="modal-overlay" onClick={() => setShowTeamModal(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Users size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-header)' }}>Integrantes del Equipo</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Los siguientes alumnos comparten el mismo avance y entrega para esta práctica:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {teamMembers.map((m, i) => (
                <div key={i} style={{ padding: '8px 12px', background: '#1B1B1B', borderRadius: 'var(--radius-sm)', border: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.fullName}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{m.controlNumber}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddPartner} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Añadir Compañero por Número de Control:</div>
              <input
                type="text"
                className="form-input"
                placeholder="No. Control (ej. 21280999)"
                value={partnerControlNum}
                onChange={(e) => setPartnerControlNum(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Nombre del Compañero"
                value={partnerFullName}
                onChange={(e) => setPartnerFullName(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTeamModal(false)}>
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Vincular al Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Primer Login */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Lock size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-header)' }}>Primer Inicio de Sesión</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Hola <strong>{studentFullName}</strong>. Debes cambiar tu contraseña temporal por una personal para acceder.
            </p>

            {passwordError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: 12 }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Nueva Contraseña:
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Confirmar Contraseña:
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: 8, width: '100%' }}
              >
                Actualizar Contraseña y Acceder
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
