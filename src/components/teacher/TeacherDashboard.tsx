/**
 * Panel de Control del Profesor:
 * - Creación de Grupos
 * - Alta de Alumnos individual y masiva por CSV con contraseñas temporales
 * - Creación de Actividades y Ejercicios (AFD y Diagramas Léxicos con autoevaluación)
 * - Monitoreo y revisión de entregas en línea
 */

import React, { useState } from 'react'
import { StudentGroup, StudentEnrollment, Activity, Exercise, ActivitySubmission } from '../../types/academic'
import { Users, FileText, Plus, Upload, Download, CheckCircle, BookOpen, Layers } from 'lucide-react'

interface TeacherDashboardProps {
  groups: StudentGroup[]
  activities: Activity[]
  submissions: ActivitySubmission[]
  onSaveGroup: (group: StudentGroup) => void
  onSaveActivity: (activity: Activity) => void
  onSelectSubmissionForReview?: (submission: ActivitySubmission) => void
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  groups,
  activities,
  submissions,
  onSaveGroup,
  onSaveActivity
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'activities' | 'submissions'>('groups')

  // Estado para creación de grupo
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupPeriod, setNewGroupPeriod] = useState('Enero - Junio 2026')

  // Estado para alta de alumnos
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '')
  const [singleControlNum, setSingleControlNum] = useState('')
  const [singleFullName, setSingleFullName] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState<StudentEnrollment[]>([])
  const [csvText, setCsvText] = useState('')

  // Estado para creación de actividad
  const [isCreatingActivity, setIsCreatingActivity] = useState(false)
  const [newActTitle, setNewActTitle] = useState('')
  const [newActDesc, setNewActDesc] = useState('')
  const [selectedGroupForActivity, setSelectedGroupForActivity] = useState<string>(groups[0]?.id || '')
  const [newExercises, setNewExercises] = useState<Exercise[]>([])

  // Función para generar contraseña temporal aleatoria amigable
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let pwd = 'Tec#'
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pwd
  }

  // Alta individual de alumno
  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!singleControlNum.trim() || !singleFullName.trim() || !selectedGroupId) return

    const tempPassword = generateTempPassword()
    const student: StudentEnrollment = {
      controlNumber: singleControlNum.trim(),
      fullName: singleFullName.trim(),
      temporaryPassword: tempPassword,
      enrolledAt: Date.now()
    }

    const group = groups.find(g => g.id === selectedGroupId)
    if (group) {
      const updatedGroup: StudentGroup = {
        ...group,
        studentControlNumbers: Array.from(new Set([...group.studentControlNumbers, student.controlNumber]))
      }
      onSaveGroup(updatedGroup)
    }

    setGeneratedCredentials(prev => [student, ...prev])
    setSingleControlNum('')
    setSingleFullName('')
  }

  // Alta masiva vía CSV
  const handleProcessCSV = () => {
    if (!csvText.trim() || !selectedGroupId) return

    const lines = csvText.split('\n')
    const newStudents: StudentEnrollment[] = []
    const group = groups.find(g => g.id === selectedGroupId)

    lines.forEach(line => {
      const parts = line.split(',')
      if (parts.length >= 2) {
        const nc = parts[0].trim()
        const name = parts[1].trim()
        if (nc && name && nc.toLowerCase() !== 'control' && nc.toLowerCase() !== 'numero_control') {
          newStudents.push({
            controlNumber: nc,
            fullName: name,
            temporaryPassword: generateTempPassword(),
            enrolledAt: Date.now()
          })
        }
      }
    })

    if (group && newStudents.length > 0) {
      const updatedGroup: StudentGroup = {
        ...group,
        studentControlNumbers: Array.from(new Set([
          ...group.studentControlNumbers,
          ...newStudents.map(s => s.controlNumber)
        ]))
      }
      onSaveGroup(updatedGroup)
      setGeneratedCredentials(prev => [...newStudents, ...prev])
      setCsvText('')
    }
  }

  // Descargar CSV de credenciales
  const handleDownloadCredentialsCSV = () => {
    if (generatedCredentials.length === 0) return
    let content = 'Numero_Control,Nombre_Completo,Password_Temporal\n'
    generatedCredentials.forEach(s => {
      content += `${s.controlNumber},"${s.fullName}",${s.temporaryPassword}\n`
    })

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credenciales_alumnos_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Crear nuevo grupo
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    const group: StudentGroup = {
      id: `group_${Date.now()}`,
      teacherId: 'teacher_1',
      name: newGroupName.trim(),
      period: newGroupPeriod.trim(),
      studentControlNumbers: [],
      createdAt: Date.now()
    }

    onSaveGroup(group)
    setSelectedGroupId(group.id)
    setIsCreatingGroup(false)
    setNewGroupName('')
  }

  // Agregar ejercicio borrador a la nueva actividad
  const handleAddExerciseToActivity = (type: 'AFD' | 'LEXER_DIAGRAM') => {
    const nextOrder = newExercises.length + 1
    if (type === 'AFD') {
      const afdEx: Exercise = {
        id: `ex_${Date.now()}_${nextOrder}`,
        type: 'AFD',
        title: `Ejercicio ${nextOrder}: Reconocedor AFD`,
        instructions: 'Construye un autómata finito determinista que acepte las cadenas especificadas en los casos de prueba.',
        order: nextOrder,
        alphabet: ['0', '1'],
        testCases: [
          { input: '0', expectedAccepted: false },
          { input: '01', expectedAccepted: true },
          { input: '0101', expectedAccepted: true },
          { input: '00', expectedAccepted: false }
        ]
      }
      setNewExercises([...newExercises, afdEx])
    } else {
      const lexerEx: Exercise = {
        id: `ex_${Date.now()}_${nextOrder}`,
        type: 'LEXER_DIAGRAM',
        title: `Ejercicio ${nextOrder}: Diagrama Léxico`,
        instructions: 'Diseña el diagrama de transición para reconocer Identificadores y Números Enteros, aplicando retroceso (*) cuando corresponda.',
        order: nextOrder,
        expectedTokens: ['TOKEN_ID', 'TOKEN_NUM_INT'],
        testCases: [
          {
            sourceCode: 'x = 42',
            expectedTokens: [
              { token: 'TOKEN_ID', lexeme: 'x' },
              { token: 'TOKEN_NUM_INT', lexeme: '42' }
            ]
          }
        ]
      }
      setNewExercises([...newExercises, lexerEx])
    }
  }

  const handleSaveNewActivity = () => {
    if (!newActTitle.trim() || newExercises.length === 0) return

    const activity: Activity = {
      id: `act_${Date.now()}`,
      teacherId: 'teacher_1',
      groupIds: [selectedGroupForActivity],
      title: newActTitle.trim(),
      description: newActDesc.trim(),
      createdAt: Date.now(),
      exercises: newExercises,
      published: true
    }

    onSaveActivity(activity)
    setIsCreatingActivity(false)
    setNewActTitle('')
    setNewActDesc('')
    setNewExercises([])
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Encabezado del Profesor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
            Panel del Docente
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Administración de grupos, altas por número de control con contraseñas temporales y asignación de prácticas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCreatingGroup(true)}
          >
            <Plus size={16} /> Nuevo Grupo
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreatingActivity(true)}
          >
            <BookOpen size={16} /> Crear Actividad
          </button>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'groups' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('groups')}
        >
          <Users size={16} /> Alumnos y Grupos ({groups.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'activities' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('activities')}
        >
          <FileText size={16} /> Actividades ({activities.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'submissions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('submissions')}
        >
          <CheckCircle size={16} /> Entregas y Calificador ({submissions.length})
        </button>
      </div>

      {/* 1. SECCIÓN DE ALUMNOS Y GRUPOS */}
      {activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
          {/* Columna Izquierda: Formulario de Alta */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="var(--primary)" />
              Inscripción de Alumnos
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Selecciona Grupo:
              </label>
              <select
                className="form-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.period})</option>
                ))}
              </select>
            </div>

            {/* Alta Individual */}
            <form onSubmit={handleAddSingleStudent} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0' }}>Alta Individual:</div>
              <input
                type="text"
                className="form-input"
                placeholder="Número de Control (ej. 21280145)"
                value={singleControlNum}
                onChange={(e) => setSingleControlNum(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Nombre Completo del Alumno"
                value={singleFullName}
                onChange={(e) => setSingleFullName(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                <Plus size={14} /> Dar de Alta Alumno
              </button>
            </form>

            <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

            {/* Alta Masiva por CSV */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} color="var(--accent-cyan)" />
                Carga Masiva vía CSV:
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: 8 }}>
                Pega el texto CSV con formato: <code>numero_control,nombre_completo</code> (una línea por alumno).
              </p>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder={"21280001,García Hernández Juan\n21280002,López Ramírez María"}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 8, width: '100%' }}
                onClick={handleProcessCSV}
              >
                Procesar CSV y Generar Contraseñas
              </button>
            </div>
          </div>

          {/* Columna Derecha: Credenciales Generadas y Lista de Grupos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Tarjeta de Contraseñas Temporales Recién Generadas */}
            {generatedCredentials.length > 0 && (
              <div className="glass-panel" style={{ padding: 20, borderLeft: '4px solid var(--accent-cyan)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', color: '#67e8f9' }}>Credenciales Temporales Generadas</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Entrega esta información a los alumnos. El sistema les exigirá cambiar la contraseña en su primer inicio.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownloadCredentialsCSV}
                  >
                    <Download size={14} /> Descargar CSV
                  </button>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>No. Control</th>
                        <th style={{ padding: '6px 8px' }}>Nombre</th>
                        <th style={{ padding: '6px 8px' }}>Password Temporal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedCredentials.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{c.controlNumber}</td>
                          <td style={{ padding: '6px 8px' }}>{c.fullName}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                            {c.temporaryPassword}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Listado de Grupos Activos */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Grupos Registrados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groups.map(group => (
                  <div
                    key={group.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{group.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Periodo: {group.period}</div>
                    </div>
                    <span className="badge badge-afd">
                      {group.studentControlNumbers.length} Alumnos Inscritos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN DE ACTIVIDADES */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activities.map(act => (
            <div key={act.id} className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{act.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {act.description}
                  </p>
                </div>
                <span className="badge badge-success">Publicada</span>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {act.exercises.map(ex => (
                  <span
                    key={ex.id}
                    className={`badge ${ex.type === 'LEXER_DIAGRAM' ? 'badge-lexer' : 'badge-afd'}`}
                  >
                    {ex.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD'} • {ex.title}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. SECCIÓN DE ENTREGAS Y REVISIÓN EN LÍNEA */}
      {activeTab === 'submissions' && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 14 }}>Avance y Entregas de Alumnos</h3>
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No hay entregas registradas aún. Cuando los alumnos trabajen fuera de línea y se conecten a internet, sus trabajos se sincronizarán aquí automáticamente.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Alumno</th>
                  <th style={{ padding: '8px 12px' }}>No. Control</th>
                  <th style={{ padding: '8px 12px' }}>Estado</th>
                  <th style={{ padding: '8px 12px' }}>Última Sincronización</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 12px' }}>{sub.studentName}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{sub.controlNumber}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`badge ${sub.overallStatus === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                        {sub.overallStatus === 'submitted' ? 'Entregado' : 'Borrador'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                      {sub.lastSyncedAt ? new Date(sub.lastSyncedAt).toLocaleString() : 'En caché local'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal: Crear Grupo */}
      {isCreatingGroup && (
        <div className="modal-overlay" onClick={() => setIsCreatingGroup(false)}>
          <div className="modal-content" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 14 }}>Crear Nuevo Grupo</h3>
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre de la Materia / Grupo:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ej. Lenguajes y Autómatas I - Gpo B"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Periodo Escolar:</label>
                <input
                  type="text"
                  className="form-input"
                  value={newGroupPeriod}
                  onChange={(e) => setNewGroupPeriod(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingGroup(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Actividad con Ejercicios */}
      {isCreatingActivity && (
        <div className="modal-overlay" onClick={() => setIsCreatingActivity(false)}>
          <div className="modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 14 }}>Nueva Actividad Práctica</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Título de la Actividad:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ej. Práctica 1: Modelado de AFD y Tokens"
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Instrucciones Generales:</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Describe los objetivos de la actividad..."
                  value={newActDesc}
                  onChange={(e) => setNewActDesc(e.target.value)}
                />
              </div>

              {/* Botones para agregar ejercicios */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ejercicios ({newExercises.length}):</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddExerciseToActivity('AFD')}
                    >
                      <Plus size={13} /> + Ejercicio AFD
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddExerciseToActivity('LEXER_DIAGRAM')}
                    >
                      <Plus size={13} /> + Ejercicio Léxico
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '200px', overflowY: 'auto' }}>
                  {newExercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: `3px solid ${ex.type === 'LEXER_DIAGRAM' ? 'var(--accent-cyan)' : 'var(--primary)'}`
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ex.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.instructions}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingActivity(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={newExercises.length === 0 || !newActTitle.trim()}
                  onClick={handleSaveNewActivity}
                >
                  Publicar Actividad a Grupo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
