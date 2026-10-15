/**
 * Panel de Control del Profesor (Estilo Oficial Automatarium):
 * - Creación y Edición Completa de Actividades y Ejercicios
 * - Soporte para actividades individuales y en equipo
 * - Gestión de Grupos, carga masiva CSV y generación de contraseñas temporales
 * - Monitoreo de entregas en línea
 */

import React, { useState } from 'react'
import { StudentGroup, StudentEnrollment, Activity, Exercise, ActivitySubmission, AFDExercise, LexerExercise } from '../../types/academic'
import { 
  Users, 
  FileText, 
  Plus, 
  Upload, 
  Download, 
  CheckCircle, 
  BookOpen, 
  Edit3, 
  Trash2, 
  Save, 
  Check, 
  X,
  Layers
} from 'lucide-react'

interface TeacherDashboardProps {
  groups: StudentGroup[]
  activities: Activity[]
  submissions: ActivitySubmission[]
  onSaveGroup: (group: StudentGroup) => void
  onSaveActivity: (activity: Activity) => void
  onDeleteActivity?: (activityId: string) => void
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  groups,
  activities,
  submissions,
  onSaveGroup,
  onSaveActivity,
  onDeleteActivity
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'activities' | 'submissions'>('activities')

  // Grupos
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupPeriod, setNewGroupPeriod] = useState('Enero - Junio 2026')

  // Alumnos
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '')
  const [singleControlNum, setSingleControlNum] = useState('')
  const [singleFullName, setSingleFullName] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState<StudentEnrollment[]>([])
  const [csvText, setCsvText] = useState('')

  // Estado para creación o edición de actividad
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Campos de formulario de actividad
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formGroupId, setFormGroupId] = useState(groups[0]?.id || '')
  const [formIsTeam, setFormIsTeam] = useState(false)
  const [formTeamSize, setFormTeamSize] = useState(2)
  const [formExercises, setFormExercises] = useState<Exercise[]>([])

  // Ejercicio seleccionado para edición detallada
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let pwd = 'Tec#'
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pwd
  }

  // Abrir modal de creación de actividad
  const handleOpenCreateActivity = () => {
    setIsCreatingNew(true)
    setEditingActivity(null)
    setFormTitle('')
    setFormDesc('')
    setFormGroupId(groups[0]?.id || '')
    setFormIsTeam(false)
    setFormTeamSize(2)
    setFormExercises([
      {
        id: `ex_${Date.now()}_1`,
        type: 'AFD',
        title: 'Ejercicio 1: Autómata Finito Determinista',
        instructions: 'Construye un AFD determinista para el lenguaje indicado.',
        order: 1,
        alphabet: ['0', '1'],
        testCases: [
          { input: '01', expectedAccepted: true },
          { input: '00', expectedAccepted: false }
        ]
      }
    ])
    setEditingExerciseId(null)
  }

  // Abrir modal de edición de actividad existente
  const handleOpenEditActivity = (act: Activity) => {
    setIsCreatingNew(false)
    setEditingActivity(act)
    setFormTitle(act.title)
    setFormDesc(act.description)
    setFormGroupId(act.groupIds[0] || groups[0]?.id || '')
    setFormIsTeam(act.isTeamActivity || false)
    setFormTeamSize(act.maxTeamSize || 2)
    setFormExercises(JSON.parse(JSON.stringify(act.exercises))) // copia profunda
    setEditingExerciseId(act.exercises[0]?.id || null)
  }

  // Guardar actividad (creación o edición)
  const handleSaveActivityModal = () => {
    if (!formTitle.trim() || formExercises.length === 0) return

    const activityData: Activity = {
      id: editingActivity ? editingActivity.id : `act_${Date.now()}`,
      teacherId: 'prof_mendoza',
      groupIds: [formGroupId],
      title: formTitle.trim(),
      description: formDesc.trim(),
      createdAt: editingActivity ? editingActivity.createdAt : Date.now(),
      exercises: formExercises,
      published: true,
      isTeamActivity: formIsTeam,
      maxTeamSize: formIsTeam ? formTeamSize : 1
    }

    onSaveActivity(activityData)
    setEditingActivity(null)
    setIsCreatingNew(false)
  }

  // Agregar nuevo ejercicio dentro de la actividad en edición
  const handleAddExerciseToForm = (type: 'AFD' | 'LEXER_DIAGRAM') => {
    const nextOrder = formExercises.length + 1
    const newId = `ex_${Date.now()}_${nextOrder}`

    if (type === 'AFD') {
      const newEx: AFDExercise = {
        id: newId,
        type: 'AFD',
        title: `Ejercicio ${nextOrder}: Reconocedor AFD`,
        instructions: 'Diseña el autómata determinista para reconocer el lenguaje requerido.',
        order: nextOrder,
        alphabet: ['0', '1'],
        testCases: [
          { input: '01', expectedAccepted: true },
          { input: '00', expectedAccepted: false }
        ]
      }
      setFormExercises([...formExercises, newEx])
      setEditingExerciseId(newId)
    } else {
      const newEx: LexerExercise = {
        id: newId,
        type: 'LEXER_DIAGRAM',
        title: `Ejercicio ${nextOrder}: Diagrama de Transición Léxico`,
        instructions: 'Modela el diagrama para escaneo léxico de tokens con retroceso (*).',
        order: nextOrder,
        expectedTokens: ['TOKEN_ID', 'TOKEN_NUM_INT'],
        testCases: [
          {
            sourceCode: 'variable = 10;',
            expectedTokens: [
              { token: 'TOKEN_ID', lexeme: 'variable' },
              { token: 'TOKEN_NUM_INT', lexeme: '10' }
            ]
          }
        ]
      }
      setFormExercises([...formExercises, newEx])
      setEditingExerciseId(newId)
    }
  }

  // Eliminar un ejercicio
  const handleDeleteExercise = (exId: string) => {
    const updated = formExercises.filter(ex => ex.id !== exId)
    setFormExercises(updated)
    if (editingExerciseId === exId) {
      setEditingExerciseId(updated[0]?.id || null)
    }
  }

  // Actualizar propiedades de un ejercicio
  const updateExerciseField = (exId: string, updates: Partial<Exercise>) => {
    setFormExercises(prev => prev.map(ex => ex.id === exId ? { ...ex, ...updates } as Exercise : ex))
  }

  // Casos de prueba para AFD
  const handleAddTestCaseAFD = (exId: string) => {
    const ex = formExercises.find(e => e.id === exId) as AFDExercise
    if (!ex) return
    const updatedCases = [...ex.testCases, { input: '11', expectedAccepted: true }]
    updateExerciseField(exId, { testCases: updatedCases })
  }

  const handleDeleteTestCaseAFD = (exId: string, index: number) => {
    const ex = formExercises.find(e => e.id === exId) as AFDExercise
    if (!ex) return
    const updatedCases = ex.testCases.filter((_, i) => i !== index)
    updateExerciseField(exId, { testCases: updatedCases })
  }

  // Alta de alumnos
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

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    const group: StudentGroup = {
      id: `group_${Date.now()}`,
      teacherId: 'prof_mendoza',
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

  const activeEditingExercise = formExercises.find(e => e.id === editingExerciseId)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-header)', color: 'var(--white)' }}>
            Panel de Gestión Docente
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Crea y edita actividades y ejercicios, administra grupos y revisa el progreso offline de los alumnos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCreatingGroup(true)}
          >
            <Plus size={15} /> Nuevo Grupo
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateActivity}
          >
            <BookOpen size={15} /> Crear Actividad
          </button>
        </div>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'activities' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('activities')}
        >
          <FileText size={15} /> Actividades y Ejercicios ({activities.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'groups' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('groups')}
        >
          <Users size={15} /> Alumnos y Grupos ({groups.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'submissions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('submissions')}
        >
          <CheckCircle size={15} /> Entregas ({submissions.length})
        </button>
      </div>

      {/* 1. SECCIÓN DE ACTIVIDADES: LISTADO Y BOTÓN DE EDICIÓN */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activities.map(act => (
            <div key={act.id} className="automatarium-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-header)' }}>
                      {act.title}
                    </h3>
                    {act.isTeamActivity ? (
                      <span className="badge badge-team">
                        👥 En Equipo (Hasta {act.maxTeamSize} alumnos)
                      </span>
                    ) : (
                      <span className="badge badge-afd">
                        👤 Individual
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, maxWidth: '850px' }}>
                    {act.description}
                  </p>
                </div>

                {/* Acciones de la Actividad: EDITAR y ELIMINAR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEditActivity(act)}
                    title="Editar título, descripción, ejercicios o casos de prueba"
                  >
                    <Edit3 size={14} color="var(--primary)" /> Editar Actividad y Ejercicios
                  </button>

                  {onDeleteActivity && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#F87171' }}
                      onClick={() => {
                        if (confirm(`¿Seguro que deseas eliminar la actividad "${act.title}"?`)) {
                          onDeleteActivity(act.id)
                        }
                      }}
                      title="Eliminar actividad"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Ejercicios incluidos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid #333' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Ejercicios incluidos ({act.exercises.length}):
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {act.exercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      style={{
                        padding: '6px 12px',
                        background: '#1A1A1A',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.8rem'
                      }}
                    >
                      <span className={`badge ${ex.type === 'LEXER_DIAGRAM' ? 'badge-lexer' : 'badge-afd'}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                        {ex.type === 'LEXER_DIAGRAM' ? 'Léxico' : 'AFD'}
                      </span>
                      <span style={{ fontWeight: 500 }}>{ex.title}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                        ({ex.testCases.length} casos de prueba)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. SECCIÓN DE ALUMNOS Y GRUPOS */}
      {activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
          <div className="automatarium-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 14, fontFamily: 'var(--font-header)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="var(--primary)" />
              Inscripción de Alumnos
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Grupo destino:
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

            <form onSubmit={handleAddSingleStudent} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Alta Individual:</div>
              <input
                type="text"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
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
                <Plus size={13} /> Generar Acceso Temporal
              </button>
            </form>

            <hr style={{ borderColor: '#333', margin: '16px 0' }} />

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} color="var(--cyan)" />
                Carga Masiva vía CSV:
              </div>
              <textarea
                className="form-textarea"
                rows={4}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {generatedCredentials.length > 0 && (
              <div className="automatarium-card" style={{ padding: 20, borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontFamily: 'var(--font-header)', color: 'var(--primary)' }}>Credenciales Temporales</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      El alumno deberá cambiar esta contraseña en su primer inicio de sesión.
                    </span>
                  </div>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1B1B1B', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>No. Control</th>
                        <th style={{ padding: '6px 8px' }}>Nombre</th>
                        <th style={{ padding: '6px 8px' }}>Contraseña Temporal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedCredentials.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{c.controlNumber}</td>
                          <td style={{ padding: '6px 8px' }}>{c.fullName}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>
                            {c.temporaryPassword}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="automatarium-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: 14, fontFamily: 'var(--font-header)' }}>Grupos Activos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {groups.map(group => (
                  <div
                    key={group.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#1C1C1C',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #333'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{group.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Periodo: {group.period}</div>
                    </div>
                    <span className="badge badge-afd">
                      {group.studentControlNumbers.length} Alumnos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN DE ENTREGAS */}
      {activeTab === 'submissions' && (
        <div className="automatarium-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: 14, fontFamily: 'var(--font-header)' }}>
            Entregas Registradas
          </h3>
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No hay entregas registradas aún.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1B1B1B', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Modalidad</th>
                  <th style={{ padding: '8px 12px' }}>Alumno(s) / Equipo</th>
                  <th style={{ padding: '8px 12px' }}>No. Control</th>
                  <th style={{ padding: '8px 12px' }}>Estado</th>
                  <th style={{ padding: '8px 12px' }}>Sincronización</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '8px 12px' }}>
                      {sub.isTeamSubmission ? (
                        <span className="badge badge-team">👥 Equipo</span>
                      ) : (
                        <span className="badge badge-afd">👤 Indiv.</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {sub.isTeamSubmission && sub.teamMembers ? (
                        <div>
                          <strong>{sub.teamName || 'Equipo'}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {sub.teamMembers.map(m => m.fullName).join(', ')}
                          </div>
                        </div>
                      ) : (
                        sub.studentName
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                      {sub.isTeamSubmission && sub.teamMembers 
                        ? sub.teamMembers.map(m => m.controlNumber).join(', ')
                        : sub.controlNumber}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`badge ${sub.overallStatus === 'submitted' ? 'badge-success' : 'badge-afd'}`}>
                        {sub.overallStatus === 'submitted' ? 'Entregado' : 'Borrador'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                      {sub.lastSyncedAt ? new Date(sub.lastSyncedAt).toLocaleTimeString() : 'En caché local'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL COMPLETO: CREAR / EDITAR ACTIVIDAD Y EJERCICIOS */}
      {(editingActivity || isCreatingNew) && (
        <div className="modal-overlay" onClick={() => { setEditingActivity(null); setIsCreatingNew(false) }}>
          <div 
            className="modal-content" 
            style={{ maxWidth: 880, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #333', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit3 size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-header)' }}>
                  {editingActivity ? `Editar: ${editingActivity.title}` : 'Crear Nueva Actividad'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setEditingActivity(null); setIsCreatingNew(false) }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido en dos secciones: Datos Generales + Editor de Ejercicios */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, paddingRight: 4 }}>
              {/* Sección 1: Datos de la Actividad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Título de la Actividad:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="ej. Práctica 2: Analizador Léxico y Tokens"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Grupo asignado:
                  </label>
                  <select
                    className="form-select"
                    value={formGroupId}
                    onChange={(e) => setFormGroupId(e.target.value)}
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Instrucciones Generales de la Actividad:
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe los objetivos y lineamientos generales de la práctica..."
                />
              </div>

              {/* Opción de Modalidad Individual vs En Equipo */}
              <div style={{ padding: '12px 16px', background: '#191919', borderRadius: 'var(--radius-sm)', border: '1px solid #383838' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formIsTeam}
                    onChange={(e) => setFormIsTeam(e.target.checked)}
                  />
                  <span>Actividad en Equipo (Los alumnos compartirán el mismo diagrama y entrega)</span>
                </label>

                {formIsTeam && (
                  <div style={{ marginTop: 10, paddingLeft: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alumnos por equipo:</span>
                    <select
                      className="form-select"
                      style={{ width: 130 }}
                      value={formTeamSize}
                      onChange={(e) => setFormTeamSize(Number(e.target.value))}
                    >
                      <option value={2}>2 alumnos</option>
                      <option value={3}>3 alumnos</option>
                      <option value={4}>4 alumnos</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Sección 2: Lista y Edición de Ejercicios */}
              <div style={{ borderTop: '1px solid #333', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-header)' }}>
                    Ejercicios de la Actividad ({formExercises.length})
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddExerciseToForm('AFD')}
                    >
                      <Plus size={13} /> + Ejercicio AFD
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddExerciseToForm('LEXER_DIAGRAM')}
                    >
                      <Plus size={13} /> + Ejercicio Léxico
                    </button>
                  </div>
                </div>

                {/* Pestañas de selección de ejercicios dentro del editor */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
                  {formExercises.map((ex, idx) => (
                    <button
                      key={ex.id}
                      type="button"
                      className={`btn btn-sm ${editingExerciseId === ex.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={() => setEditingExerciseId(ex.id)}
                    >
                      <span>{idx + 1}. {ex.type === 'LEXER_DIAGRAM' ? 'Léxico' : 'AFD'}</span>
                      <span 
                        style={{ color: '#F87171', marginLeft: 4, cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id) }}
                        title="Eliminar este ejercicio"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>

                {/* Formulario del Ejercicio Activo */}
                {activeEditingExercise && (
                  <div style={{ padding: '16px', background: '#191919', borderRadius: 'var(--radius-sm)', border: '1px solid #333' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                          Título del Ejercicio:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={activeEditingExercise.title}
                          onChange={(e) => updateExerciseField(activeEditingExercise.id, { title: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                          Tipo de Ejercicio:
                        </label>
                        <span className={`badge ${activeEditingExercise.type === 'LEXER_DIAGRAM' ? 'badge-lexer' : 'badge-afd'}`} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                          {activeEditingExercise.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD Determinista'}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                        Instrucciones Específicas del Ejercicio:
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={activeEditingExercise.instructions}
                        onChange={(e) => updateExerciseField(activeEditingExercise.id, { instructions: e.target.value })}
                      />
                    </div>

                    {/* Configuración específica según el tipo */}
                    {activeEditingExercise.type === 'AFD' ? (
                      <div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                            Alfabeto Permitido (separado por comas):
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontFamily: 'var(--font-mono)' }}
                            value={activeEditingExercise.alphabet.join(', ')}
                            onChange={(e) => updateExerciseField(activeEditingExercise.id, {
                              alphabet: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                          />
                        </div>

                        {/* Editor de Casos de Prueba para AFD */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              Casos de Prueba (Autoevaluación):
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                              onClick={() => handleAddTestCaseAFD(activeEditingExercise.id)}
                            >
                              + Añadir Cadena
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '140px', overflowY: 'auto' }}>
                            {activeEditingExercise.testCases.map((tc, tcIdx) => (
                              <div key={tcIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>#{tcIdx + 1}</span>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', flex: 1 }}
                                  value={tc.input}
                                  placeholder="Cadena (ej. 0101)"
                                  onChange={(e) => {
                                    const updated = [...activeEditingExercise.testCases]
                                    updated[tcIdx] = { ...updated[tcIdx], input: e.target.value }
                                    updateExerciseField(activeEditingExercise.id, { testCases: updated })
                                  }}
                                />
                                <select
                                  className="form-select"
                                  style={{ width: 120, padding: '4px 8px', fontSize: '0.75rem' }}
                                  value={tc.expectedAccepted ? 'true' : 'false'}
                                  onChange={(e) => {
                                    const updated = [...activeEditingExercise.testCases]
                                    updated[tcIdx] = { ...updated[tcIdx], expectedAccepted: e.target.value === 'true' }
                                    updateExerciseField(activeEditingExercise.id, { testCases: updated })
                                  }}
                                >
                                  <option value="true">Aceptar ✓</option>
                                  <option value="false">Rechazar ✗</option>
                                </select>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '2px 6px', color: '#F87171' }}
                                  onClick={() => handleDeleteTestCaseAFD(activeEditingExercise.id, tcIdx)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* Configuración específica para Diagrama Léxico */}
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--cyan)', display: 'block', marginBottom: 2 }}>
                            Tokens Esperados (separados por comas):
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontFamily: 'var(--font-mono)' }}
                            value={activeEditingExercise.expectedTokens.join(', ')}
                            onChange={(e) => updateExerciseField(activeEditingExercise.id, {
                              expectedTokens: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
                            })}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                            Código fuente de prueba:
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontFamily: 'var(--font-mono)' }}
                            value={activeEditingExercise.testCases[0]?.sourceCode || ''}
                            onChange={(e) => {
                              const updatedCases = [{
                                sourceCode: e.target.value,
                                expectedTokens: activeEditingExercise.expectedTokens.map(tok => ({ token: tok, lexeme: 'val' }))
                              }]
                              updateExerciseField(activeEditingExercise.id, { testCases: updatedCases })
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pie del modal: Guardar Cambios */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid #333' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setEditingActivity(null); setIsCreatingNew(false) }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!formTitle.trim() || formExercises.length === 0}
                onClick={handleSaveActivityModal}
              >
                <Save size={15} /> {editingActivity ? 'Guardar Cambios de la Actividad' : 'Publicar Actividad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Grupo */}
      {isCreatingGroup && (
        <div className="modal-overlay" onClick={() => setIsCreatingGroup(false)}>
          <div className="modal-content" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-header)' }}>Crear Nuevo Grupo</h3>
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre del Grupo:</label>
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
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Periodo:</label>
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
    </div>
  )
}
