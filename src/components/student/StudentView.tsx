/**
 * Vista de Trabajo del Alumno:
 * - Cambio forzoso de contraseña temporal en el primer login
 * - Resolución offline de actividades y ejercicios (AFD y Diagramas Léxicos)
 * - Lienzo interactivo + Simulador con autoevaluación
 * - Guardado de borradores offline en IndexedDB y cola de sincronización
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
  WifiOff, 
  CheckCircle2, 
  ArrowLeft, 
  FileCheck, 
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
  // Modal de primer login
  const [showPasswordModal, setShowPasswordModal] = useState(mustChangePassword)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Estado de navegación en actividades y ejercicios
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(activities[0] || null)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0)

  // Grafo del ejercicio actual
  const currentExercise: Exercise | undefined = selectedActivity?.exercises[selectedExerciseIndex]
  
  const [currentGraph, setCurrentGraph] = useState<AutomataGraph>(() => {
    return {
      projectType: currentExercise?.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
      states: [
        { id: 0, name: 'q0', x: 120, y: 160, isFinal: false },
        { id: 1, name: 'q1', x: 260, y: 160, isFinal: true, token: 'TOKEN_ID' }
      ],
      transitions: [
        { id: 1, from: 0, to: 1, read: currentExercise?.type === 'LEXER_DIAGRAM' ? '[a-zA-Z]' : '0' }
      ],
      initialState: 0
    }
  })

  const [activeSimulationState, setActiveSimulationState] = useState<number | null>(null)
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null)

  // Cargar borrador local de IndexedDB al cambiar de ejercicio
  useEffect(() => {
    if (!currentExercise || !selectedActivity) return

    const loadDraft = async () => {
      const draftKey = `${selectedActivity.id}_${currentExercise.id}`
      const existingDraft = await localDB.drafts.get(draftKey)

      if (existingDraft) {
        setCurrentGraph(existingDraft.graph)
      } else {
        // Inicializar plantilla base
        setCurrentGraph({
          projectType: currentExercise.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
          states: [
            { id: 0, name: 'q0', x: 120, y: 160, isFinal: false },
            { id: 1, name: 'q1', x: 280, y: 160, isFinal: true, token: currentExercise.type === 'LEXER_DIAGRAM' ? 'TOKEN_ID' : undefined }
          ],
          transitions: [
            { id: 1, from: 0, to: 1, read: currentExercise.type === 'LEXER_DIAGRAM' ? '[a-zA-Z]' : '0' }
          ],
          initialState: 0
        })
      }
    }

    loadDraft()
  }, [selectedActivity?.id, currentExercise?.id])

  // Guardado en IndexedDB offline
  const handleSaveDraftOffline = async () => {
    if (!selectedActivity || !currentExercise) return

    const draftKey = `${selectedActivity.id}_${currentExercise.id}`
    await localDB.drafts.put({
      id: draftKey,
      activityId: selectedActivity.id,
      exerciseId: currentExercise.id,
      title: currentExercise.title,
      projectType: currentGraph.projectType,
      graph: currentGraph,
      updatedAt: Date.now()
    })

    setSaveStatusMessage('Borrador guardado en almacenamiento local (IndexedDB)')
    setTimeout(() => setSaveStatusMessage(null), 3000)
  }

  // Entregar la actividad
  const handleSubmitActivity = async () => {
    if (!selectedActivity || !currentExercise) return

    // Guardar borrador actual
    await handleSaveDraftOffline()

    const submission: ActivitySubmission = {
      id: `${selectedActivity.id}_${studentControlNumber}`,
      activityId: selectedActivity.id,
      studentUid: `student_${studentControlNumber}`,
      controlNumber: studentControlNumber,
      studentName: studentFullName,
      groupId: selectedActivity.groupIds[0] || 'default_group',
      overallStatus: 'submitted',
      submittedAt: Date.now(),
      isDirtyLocally: !navigator.onLine,
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

    // Guardar en la base de datos offline local
    await localDB.cachedSubmissions.put(submission)

    // Encolar acción de sincronización si está fuera de línea
    await localDB.syncQueue.put({
      id: `sync_${Date.now()}`,
      action: 'SUBMIT_ACTIVITY',
      payload: submission,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    })

    onSubmissionComplete(submission)
    setSaveStatusMessage('¡Actividad entregada! Se sincronizará en cuanto tengas conexión.')
  }

  // Manejar cambio de contraseña del primer login
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
    <div style={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de cabecera del estudiante */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        background: 'rgba(17, 24, 39, 0.95)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>
              {studentFullName}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
              (No. Control: {studentControlNumber})
            </span>
          </div>

          <span className="badge badge-afd" style={{ fontSize: '0.725rem' }}>
            {selectedActivity?.title || 'Sin actividad seleccionada'}
          </span>
        </div>

        {/* Acciones de entrega y guardado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveStatusMessage && (
            <span style={{ fontSize: '0.8rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} /> {saveStatusMessage}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSaveDraftOffline}
          >
            <Save size={14} /> Guardar Borrador Offline
          </button>

          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={handleSubmitActivity}
          >
            <Send size={14} /> Entregar Actividad
          </button>
        </div>
      </div>

      {/* Selector de Ejercicios de la Actividad */}
      {selectedActivity && selectedActivity.exercises.length > 1 && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px 20px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid var(--border)'
        }}>
          {selectedActivity.exercises.map((ex, idx) => (
            <button
              key={ex.id}
              type="button"
              className={`btn btn-sm ${selectedExerciseIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedExerciseIndex(idx)}
            >
              Ejercicio {idx + 1}: {ex.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD'}
            </button>
          ))}
        </div>
      )}

      {/* Área Principal Dividida: Lienzo (65%) + Simulador y Pruebas (35%) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden' }}>
        {/* Lienzo Interactivo de Grafos */}
        <div style={{ height: '100%', position: 'relative' }}>
          <GraphCanvas
            graph={currentGraph}
            onChange={setCurrentGraph}
            activeStateId={activeSimulationState}
          />
        </div>

        {/* Panel Lateral: Instrucciones + Simulador */}
        <div style={{
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto'
        }}>
          {/* Instrucciones del ejercicio */}
          {currentExercise && (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{currentExercise.title}</h4>
                <span className={`badge ${currentExercise.type === 'LEXER_DIAGRAM' ? 'badge-lexer' : 'badge-afd'}`}>
                  {currentExercise.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentExercise.instructions}
              </p>
            </div>
          )}

          {/* Panel de simulación específico según el tipo de ejercicio */}
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

      {/* MODAL OBLIGATORIO: PRIMER LOGIN - CAMBIO DE CONTRASEÑA TEMPORAL */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Lock size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Primer Inicio de Sesión</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Hola <strong>{studentFullName}</strong>. Por motivos de seguridad escolar, debes sustituir tu contraseña temporal por una nueva contraseña personal para continuar.
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
                style={{ marginTop: 10, width: '100%' }}
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
