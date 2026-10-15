/**
 * Vista de Trabajo del Alumno (Estilo Oficial Automatarium):
 * - Soporte para Actividades Individuales o EN EQUIPO (avance compartido)
 * - Cambio forzoso de contraseña en primer login
 * - Guardado de borradores offline en IndexedDB y entrega unificada de equipo
 */

import React, { useState, useEffect } from 'react'
import { Activity, Exercise, ActivitySubmission } from '../../types/academic'
import { AutomataGraph } from '../../types/automata'
import { GraphCanvas } from '../canvas/GraphCanvas'
import { AFDSimulatorPanel } from '../simulation/AFDSimulatorPanel'
import { LexerSimulatorPanel } from '../simulation/LexerSimulatorPanel'
import { localDB } from '../../db/indexedDb'
import { 
  Lock, 
  Save, 
  Send, 
  Users, 
  CheckCircle2, 
  UserPlus, 
  Clock 
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

  // Actividad seleccionada y ejercicio
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(activities[0] || null)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0)

  // Estado del equipo (para actividades en equipo)
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

  // Cargar borrador de IndexedDB (considerando clave de equipo o alumno)
  useEffect(() => {
    if (!currentExercise || !selectedActivity) return

    const loadDraft = async () => {
      const storageKey = isTeam 
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

  const handleSaveDraftOffline = async () => {
    if (!selectedActivity || !currentExercise) return

    const storageKey = isTeam 
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

  const handleSubmitActivity = async () => {
    if (!selectedActivity || !currentExercise) return

    await handleSaveDraftOffline()

    const submissionId = isTeam && teamId
      ? teamId
      : `${selectedActivity.id}_${studentControlNumber}`

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
      exerciseSubmissions: {
        [currentExercise.id]: {
          exerciseId: currentExercise.id,
          graph: currentGraph,
          status: 'submitted',
          testsPassed: 1,
          testsTotal: 1,
          updatedAt: Date.now()
        }
      }
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

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Barra Superior del Estudiante (Estilo Automatarium) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 20px',
        background: '#1F1F1F',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--white)' }}>
              {studentFullName}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
              [{studentControlNumber}]
            </span>
          </div>

          <span className="badge badge-afd" style={{ fontSize: '0.725rem' }}>
            {selectedActivity?.title}
          </span>

          {/* Banner de Actividad en Equipo */}
          {isTeam && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              background: 'hsl(270, 50%, 15%)',
              border: '1px solid hsl(270, 60%, 35%)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <Users size={14} color="#D8B4FE" />
              <span style={{ fontSize: '0.75rem', color: '#E9D5FF', fontWeight: 500 }}>
                Equipo ({teamMembers.length} alumnos): {teamMembers.map(m => m.fullName.split(' ')[0]).join(' & ')}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                onClick={() => setShowTeamModal(true)}
              >
                <UserPlus size={12} /> Integrantes
              </button>
            </div>
          )}
        </div>

        {/* Acciones de Guardado y Entrega */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveStatusMessage && (
            <span style={{ fontSize: '0.775rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 size={13} /> {saveStatusMessage}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSaveDraftOffline}
          >
            <Save size={13} /> Guardar Borrador
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSubmitActivity}
          >
            <Send size={13} /> {isTeam ? 'Entregar para el Equipo' : 'Entregar Actividad'}
          </button>
        </div>
      </div>

      {/* Selector de Ejercicios */}
      {selectedActivity && selectedActivity.exercises.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 20px',
          background: '#181818',
          borderBottom: '1px solid #2B2B2B'
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {selectedActivity.exercises.map((ex, idx) => (
              <button
                key={ex.id}
                type="button"
                className={`btn btn-sm ${selectedExerciseIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                onClick={() => setSelectedExerciseIndex(idx)}
              >
                {ex.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD'} • Ejercicio {idx + 1}
              </button>
            ))}
          </div>

          {isTeam && (
            <span style={{ fontSize: '0.725rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> Última edición por: {lastEditedByInfo}
            </span>
          )}
        </div>
      )}

      {/* Lienzo (65%) + Panel Simulador (35%) */}
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
              Los siguientes alumnos compartirán el mismo diagrama y entrega para esta práctica:
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

      {/* Modal Primer Login: Cambio de Contraseña */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Lock size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-header)' }}>Primer Inicio de Sesión</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Hola <strong>{studentFullName}</strong>. Debes cambiar tu contraseña temporal por una contraseña personal para acceder.
            </p>

            {passwordError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: 12 }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Nueva Contraseña (mínimo 6 caracteres):
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
                  Confirmar Nueva Contraseña:
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
