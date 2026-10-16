/**
 * Panel de Control del Profesor (Estilo Oficial Automatarium):
 * - Creación y Edición Completa de Actividades y Ejercicios
 * - Soporte para actividades individuales y en equipo
 * - Gestión de Grupos, carga masiva CSV y generación de contraseñas temporales
 * - Monitoreo de entregas en línea
 */

import React, { useState } from 'react'
import { StudentGroup, StudentEnrollment, Activity, Exercise, ActivitySubmission, AFDExercise, LexerExercise, UserProfile } from '../../types/academic'
import { GraphCanvas } from '../canvas/GraphCanvas'
import { runAFDTestSuite } from '../../simulation/afdSimulator'
import { runLexerTestSuite } from '../../simulation/lexerSimulator'
import { getStudentDirectory, registerOrUpdateStudent, removeStudentCompletely, resetStudentPasswordByTeacher } from '../../services/authService'
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
  Layers,
  Eye,
  Award,
  MessageSquare,
  KeyRound,
  RotateCcw,
  Copy
} from 'lucide-react'

interface TeacherDashboardProps {
  currentUser: UserProfile
  groups: StudentGroup[]
  activities: Activity[]
  submissions: ActivitySubmission[]
  onSaveGroup: (group: StudentGroup) => void
  onDeleteGroup?: (groupId: string) => void
  onRemoveStudentFromGroup?: (groupId: string, controlNumber: string) => void
  onSaveActivity: (activity: Activity) => void
  onDeleteActivity?: (activityId: string) => void
  onUpdateSubmission?: (submission: ActivitySubmission) => void
  onUpdateTeacherName?: (newName: string) => void
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  groups,
  activities,
  submissions,
  onSaveGroup,
  onDeleteGroup,
  onRemoveStudentFromGroup,
  onSaveActivity,
  onDeleteActivity,
  onUpdateSubmission,
  onUpdateTeacherName
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'activities' | 'submissions'>('activities')

  // Estado para edición del nombre del docente
  const [isEditingNameModalOpen, setIsEditingNameModalOpen] = useState(false)
  const [editingTeacherName, setEditingTeacherName] = useState(currentUser.fullName)

  // Directorio de alumnos para consultar nombres por número de control
  const [studentDirectory, setStudentDirectory] = useState<Record<string, { fullName: string }>>(() => getStudentDirectory())
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(groups[0]?.id || null)

  // Diálogo modal de confirmación in-app (nunca bloqueado por el navegador ni la PWA)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Eliminar',
    onConfirm: () => {}
  })

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Eliminar') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm
    })
  }

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

  // Modal para restablecer contraseña de alumno
  const [resetModal, setResetModal] = useState<{
    isOpen: boolean
    controlNumber: string
    studentName: string
    tempPassword: string
    forceChange: boolean
    copied: boolean
    isSubmitting: boolean
    successMessage: string | null
  }>({
    isOpen: false,
    controlNumber: '',
    studentName: '',
    tempPassword: '',
    forceChange: true,
    copied: false,
    isSubmitting: false,
    successMessage: null
  })

  const generateRandomTempPassword = () => {
    return `Tec#${Math.floor(1000 + Math.random() * 9000)}`
  }

  const handleOpenResetModal = (controlNumber: string, studentName: string) => {
    setResetModal({
      isOpen: true,
      controlNumber,
      studentName,
      tempPassword: generateRandomTempPassword(),
      forceChange: true,
      copied: false,
      isSubmitting: false,
      successMessage: null
    })
  }

  const handleConfirmResetPassword = async () => {
    if (!resetModal.tempPassword.trim()) return
    setResetModal(prev => ({ ...prev, isSubmitting: true }))
    try {
      await resetStudentPasswordByTeacher(
        resetModal.controlNumber,
        resetModal.tempPassword.trim(),
        resetModal.forceChange
      )
      setStudentDirectory(getStudentDirectory())
      setResetModal(prev => ({
        ...prev,
        isSubmitting: false,
        successMessage: `¡Contraseña de ${prev.studentName} restablecida exitosamente!`
      }))
    } catch (err: any) {
      console.warn('Error al resetear contraseña:', err)
      setResetModal(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(resetModal.tempPassword)
    setResetModal(prev => ({ ...prev, copied: true }))
    setTimeout(() => {
      setResetModal(prev => ({ ...prev, copied: false }))
    }, 2500)
  }

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

  // Estado para Revisión y Calificación de Entregas
  const [reviewingSubmission, setReviewingSubmission] = useState<ActivitySubmission | null>(null)
  const [reviewExerciseIndex, setReviewExerciseIndex] = useState(0)
  const [reviewGrade, setReviewGrade] = useState<number>(100)
  const [reviewFeedback, setReviewFeedback] = useState<string>('')
  const [reviewSaveSuccess, setReviewSaveSuccess] = useState(false)

  const handleOpenReview = (sub: ActivitySubmission) => {
    setReviewingSubmission(sub)
    setReviewExerciseIndex(0)
    setReviewGrade(sub.grade ?? 100)
    setReviewFeedback(sub.teacherFeedback ?? '')
    setReviewSaveSuccess(false)
  }

  const handleSaveReview = () => {
    if (!reviewingSubmission) return
    const updated: ActivitySubmission = {
      ...reviewingSubmission,
      overallStatus: 'graded',
      grade: Number(reviewGrade) || 0,
      teacherFeedback: reviewFeedback.trim(),
      lastSyncedAt: Date.now()
    }
    setReviewingSubmission(updated)
    if (onUpdateSubmission) {
      onUpdateSubmission(updated)
    }
    setReviewSaveSuccess(true)
    setTimeout(() => setReviewSaveSuccess(false), 2500)
  }

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

    registerOrUpdateStudent(student.controlNumber, student.fullName, tempPassword)
    setStudentDirectory(prev => ({ ...prev, [student.controlNumber]: { fullName: student.fullName } }))

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
          const tempPwd = generateTempPassword()
          newStudents.push({
            controlNumber: nc,
            fullName: name,
            temporaryPassword: tempPwd,
            enrolledAt: Date.now()
          })
          registerOrUpdateStudent(nc, name, tempPwd)
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
      setStudentDirectory(prev => {
        const copy = { ...prev }
        newStudents.forEach(s => { copy[s.controlNumber] = { fullName: s.fullName } })
        return copy
      })
      setGeneratedCredentials(prev => [...newStudents, ...prev])
      setCsvText('')
    }
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    const group: StudentGroup = {
      id: `group_${Date.now()}`,
      teacherId: currentUser.uid,
      name: newGroupName.trim(),
      period: newGroupPeriod.trim(),
      studentControlNumbers: [],
      createdAt: Date.now()
    }

    onSaveGroup(group)
    setSelectedGroupId(group.id)
    setExpandedGroupId(group.id)
    setIsCreatingGroup(false)
    setNewGroupName('')
  }

  const handleDeleteGroupConfirm = (groupId: string, groupName: string) => {
    triggerConfirm(
      '¿Eliminar Grupo?',
      `¿Estás seguro de que deseas eliminar permanentemente el grupo "${groupName}"?`,
      () => {
        if (onDeleteGroup) {
          onDeleteGroup(groupId)
        }
        if (selectedGroupId === groupId) {
          const remaining = groups.filter(g => g.id !== groupId)
          setSelectedGroupId(remaining[0]?.id || '')
        }
      },
      'Sí, Eliminar Grupo'
    )
  }

  const handleRemoveStudentConfirm = (groupId: string, controlNumber: string, studentName: string) => {
    triggerConfirm(
      '¿Quitar Alumno del Grupo?',
      `¿Estás seguro de quitar al alumno "${studentName}" (${controlNumber}) de este grupo?`,
      () => {
        if (onRemoveStudentFromGroup) {
          onRemoveStudentFromGroup(groupId, controlNumber)
        }
        removeStudentCompletely(controlNumber)
        setStudentDirectory(getStudentDirectory())
        setGeneratedCredentials(prev => prev.filter(c => c.controlNumber !== controlNumber))
      },
      'Sí, Quitar Alumno'
    )
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Docente Titular:
            </span>
            <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.875rem' }}>
              {currentUser.fullName}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.725rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => {
                setEditingTeacherName(currentUser.fullName)
                setIsEditingNameModalOpen(true)
              }}
              title="Cambiar el nombre del profesor que se muestra en la plataforma"
            >
              <Edit3 size={11} /> Cambiar Nombre
            </button>
          </div>
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
                        triggerConfirm(
                          '¿Eliminar Actividad?',
                          `¿Estás seguro de que deseas eliminar la actividad "${act.title}"?`,
                          () => onDeleteActivity(act.id),
                          'Sí, Eliminar Actividad'
                        )
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-header)' }}>
                  Grupos Activos ({groups.length})
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '3px 9px' }}
                  onClick={() => setIsCreatingGroup(true)}
                >
                  <Plus size={13} /> Agregar Grupo
                </button>
              </div>

              {groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No tienes grupos registrados. Haz clic en "Agregar Grupo" para dar de alta uno.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {groups.map(group => {
                    const isExpanded = expandedGroupId === group.id
                    return (
                      <div
                        key={group.id}
                        style={{
                          background: '#1C1C1C',
                          borderRadius: 'var(--radius-sm)',
                          border: isExpanded ? '1px solid var(--primary)' : '1px solid #333',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Cabecera del Grupo */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            background: isExpanded ? '#222' : '#1C1C1C'
                          }}
                          onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{group.name}</span>
                              <span className="badge badge-afd" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                {group.studentControlNumbers.length} Alumnos
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Periodo: {group.period} • {isExpanded ? '▼ Ocultar alumnos' : '► Ver alumnos'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#F87171', padding: '4px 8px', fontSize: '0.72rem' }}
                              onClick={() => handleDeleteGroupConfirm(group.id, group.name)}
                              title="Eliminar este grupo"
                            >
                              <Trash2 size={13} /> Eliminar Grupo
                            </button>
                          </div>
                        </div>

                        {/* Lista de Alumnos del Grupo */}
                        {isExpanded && (
                          <div style={{ padding: '12px 16px', borderTop: '1px solid #303030', background: '#161616' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                              Alumnos Inscritos ({group.studentControlNumbers.length}):
                            </div>

                            {group.studentControlNumbers.length === 0 ? (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                                No hay alumnos en este grupo. Inscríbelos usando el formulario de la izquierda.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '240px', overflowY: 'auto' }}>
                                {group.studentControlNumbers.map(ctrl => {
                                  const studentName = studentDirectory[ctrl]?.fullName || `Alumno [${ctrl}]`
                                  return (
                                    <div
                                      key={ctrl}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '7px 12px',
                                        background: '#202020',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid #333',
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      <div>
                                        <span style={{ fontWeight: 600 }}>{studentName}</span>
                                        <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                          [{ctrl}]
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          style={{ color: 'var(--primary)', fontSize: '0.7rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                                          onClick={() => handleOpenResetModal(ctrl, studentName)}
                                          title="Restablecer o generar nueva contraseña temporal"
                                        >
                                          <KeyRound size={11} /> Resetear Clave
                                        </button>

                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          style={{ color: '#F87171', fontSize: '0.7rem', padding: '2px 8px' }}
                                          onClick={() => handleRemoveStudentConfirm(group.id, ctrl, studentName)}
                                          title="Eliminar a este alumno del grupo"
                                        >
                                          <Trash2 size={11} /> Quitar Alumno
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
                  <th style={{ padding: '8px 12px' }}>Calificación</th>
                  <th style={{ padding: '8px 12px' }}>Acciones</th>
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
                      <span className={`badge ${sub.overallStatus === 'graded' ? 'badge-success' : sub.overallStatus === 'submitted' ? 'badge-lexer' : 'badge-afd'}`}>
                        {sub.overallStatus === 'graded' ? 'Calificado' : sub.overallStatus === 'submitted' ? 'Entregado' : 'Borrador'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {sub.overallStatus === 'graded' && sub.grade !== undefined ? (
                        <span style={{ fontWeight: 600, color: sub.grade >= 70 ? 'var(--green)' : '#F87171' }}>
                          {sub.grade} / 100
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>Pendiente</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}
                        onClick={() => handleOpenReview(sub)}
                      >
                        <Eye size={13} /> Revisar y Calificar
                      </button>
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

      {/* 4. MODAL PARA REVISAR Y CALIFICAR ENTREGA */}
      {reviewingSubmission && (
        <div className="modal-overlay" onClick={() => setReviewingSubmission(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 1040, maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #333', paddingBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-header)' }}>
                    Revisión de Entrega
                  </h3>
                  {reviewingSubmission.isTeamSubmission ? (
                    <span className="badge badge-team">👥 En Equipo</span>
                  ) : (
                    <span className="badge badge-afd">👤 Individual</span>
                  )}
                  {reviewingSubmission.overallStatus === 'graded' && (
                    <span className="badge badge-success">
                      Calificado ({reviewingSubmission.grade}/100)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <strong>Actividad:</strong> {activities.find(a => a.id === reviewingSubmission.activityId)?.title || reviewingSubmission.activityId} | 
                  <strong style={{ marginLeft: 8 }}>Alumno(s):</strong> {
                    reviewingSubmission.isTeamSubmission && reviewingSubmission.teamMembers 
                      ? reviewingSubmission.teamMembers.map(m => `${m.fullName} (${m.controlNumber})`).join(', ')
                      : `${reviewingSubmission.studentName} (${reviewingSubmission.controlNumber})`
                  }
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setReviewingSubmission(null)}
              >
                <X size={15} />
              </button>
            </div>

            {/* Stepper / pestañas de ejercicios */}
            {(() => {
              const reviewAct = activities.find(a => a.id === reviewingSubmission.activityId)
              const exercises = reviewAct?.exercises || []
              const currentEx = exercises[reviewExerciseIndex] || exercises[0]
              const subEx = currentEx ? reviewingSubmission.exerciseSubmissions?.[currentEx.id] : undefined
              const graph = subEx?.graph || {
                projectType: currentEx?.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
                states: [],
                transitions: [],
                initialState: null
              }

              // Evaluar test suite en vivo
              const afdResults = currentEx?.type === 'AFD'
                ? runAFDTestSuite(graph, (currentEx as AFDExercise).testCases)
                : null

              const lexerResults = currentEx?.type === 'LEXER_DIAGRAM'
                ? runLexerTestSuite(graph, (currentEx as LexerExercise).testCases)
                : null

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
                  {/* Pestañas de Ejercicios */}
                  {exercises.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #333', paddingBottom: 8 }}>
                      {exercises.map((ex, idx) => {
                        const exSub = reviewingSubmission.exerciseSubmissions?.[ex.id]
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            className={`btn btn-sm ${reviewExerciseIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setReviewExerciseIndex(idx)}
                          >
                            {ex.title} {exSub ? `(${exSub.testsPassed}/${exSub.testsTotal})` : ''}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Cuerpo principal de revisión */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, flex: 1, minHeight: 460 }}>
                    {/* Lienzo del Alumno */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'var(--font-header)' }}>
                          {currentEx?.title}
                        </span>
                        <span className={`badge ${currentEx?.type === 'LEXER_DIAGRAM' ? 'badge-lexer' : 'badge-afd'}`}>
                          {currentEx?.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {currentEx?.instructions}
                      </p>

                      <div style={{ flex: 1, minHeight: 380, border: '1px solid #333', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <GraphCanvas
                          graph={graph}
                          readOnly={true}
                          onChange={() => {}}
                        />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', textAlign: 'right' }}>
                        Visualización en modo lectura • {graph.states.length} estados • {graph.transitions.length} transiciones
                      </div>
                    </div>

                    {/* Columna Derecha: Pruebas Automáticas y Calificación */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 520, paddingRight: 4 }}>
                      {/* 1. Resultados de pruebas */}
                      <div className="automatarium-card" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Pruebas Automáticas
                          </span>
                          {afdResults && (
                            <span className={`badge ${afdResults.passedCount === afdResults.totalCount ? 'badge-success' : 'badge-afd'}`}>
                              {afdResults.passedCount} / {afdResults.totalCount} pasadas ({afdResults.scorePercentage}%)
                            </span>
                          )}
                          {lexerResults && (
                            <span className={`badge ${lexerResults.passedCount === lexerResults.totalCount ? 'badge-success' : 'badge-lexer'}`}>
                              {lexerResults.passedCount} / {lexerResults.totalCount} pasadas ({lexerResults.scorePercentage}%)
                            </span>
                          )}
                        </div>

                        {/* Listado de Casos AFD */}
                        {afdResults && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                            {afdResults.evaluations.map((ev, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: '6px 10px',
                                  background: '#1A1A1A',
                                  border: `1px solid ${ev.passed ? 'rgba(74, 222, 128, 0.25)' : 'rgba(248, 113, 113, 0.35)'}`,
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.775rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)' }}>Entrada: "{ev.testCase.input}"</span>
                                  <span style={{ color: ev.passed ? 'var(--green)' : '#F87171', fontWeight: 600 }}>
                                    {ev.passed ? '✓ Pasó' : '✗ Falló'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                  Esperado: {ev.testCase.expectedAccepted ? 'Aceptada' : 'Rechazada'} | Obtenido: {ev.actualAccepted ? 'Aceptada' : 'Rechazada'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Listado de Casos Léxico */}
                        {lexerResults && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                            {lexerResults.evaluations.map((ev, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: '6px 10px',
                                  background: '#1A1A1A',
                                  border: `1px solid ${ev.passed ? 'rgba(74, 222, 128, 0.25)' : 'rgba(248, 113, 113, 0.35)'}`,
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.775rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)' }}>Código: "{ev.testCase.sourceCode}"</span>
                                  <span style={{ color: ev.passed ? 'var(--green)' : '#F87171', fontWeight: 600 }}>
                                    {ev.passed ? '✓ Pasó' : '✗ Falló'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                  {ev.message}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. Sección de Calificación Docente */}
                      <div className="automatarium-card" style={{ padding: 14 }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Award size={15} color="var(--primary)" /> Calificación y Retroalimentación
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                              Calificación Final (0 - 100):
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="form-input"
                              style={{ fontFamily: 'var(--font-mono)', width: '120px' }}
                              value={reviewGrade}
                              onChange={(e) => setReviewGrade(Number(e.target.value))}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                              Comentarios / Retroalimentación para el Alumno o Equipo:
                            </label>
                            <textarea
                              className="form-input"
                              rows={3}
                              placeholder="Ej: Excelente diseño del estado de aceptación. Revisa la rama de retroceso con el asterisco."
                              value={reviewFeedback}
                              onChange={(e) => setReviewFeedback(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            {reviewSaveSuccess ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={14} /> ¡Calificación guardada con éxito!
                              </span>
                            ) : <span />}

                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={handleSaveReview}
                            >
                              <Save size={13} /> Guardar Calificación
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* MODAL PARA CAMBIAR NOMBRE DEL DOCENTE */}
      {isEditingNameModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditingNameModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-header)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={18} color="var(--primary)" />
                Modificar Nombre del Docente
              </h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditingNameModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              if (!editingTeacherName.trim()) return
              if (onUpdateTeacherName) {
                onUpdateTeacherName(editingTeacherName.trim())
              }
              setIsEditingNameModalOpen(false)
            }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Nombre Completo del Profesor (como aparecerá en la plataforma):
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingTeacherName}
                  onChange={(e) => setEditingTeacherName(e.target.value)}
                  placeholder="ej. Prof. Rodolfo Luna"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingNameModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={14} /> Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVO GRUPO */}
      {isCreatingGroup && (
        <div className="modal-overlay" onClick={() => setIsCreatingGroup(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-header)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="var(--primary)" />
                Crear Nuevo Grupo
              </h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCreatingGroup(false)}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Nombre del Grupo / Materia:
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ej. Lenguajes y Autómatas II - Gpo 8B"
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Periodo Escolar:
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={newGroupPeriod}
                  onChange={(e) => setNewGroupPeriod(e.target.value)}
                  placeholder="ej. Enero - Junio 2026"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingGroup(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={14} /> Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO MODAL DE CONFIRMACIÓN IN-APP (NUNCA BLOQUEADO POR EL NAVEGADOR) */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content" style={{ maxWidth: 440, border: '1px solid rgba(248, 113, 113, 0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ padding: 8, background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', color: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-header)', margin: 0, color: 'var(--white)' }}>
                {confirmDialog.title}
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
              {confirmDialog.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#DC2626', borderColor: '#DC2626', color: '#fff' }}
                onClick={() => {
                  confirmDialog.onConfirm()
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }))
                }}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA RESTABLECER CONTRASEÑA DE ALUMNO */}
      {resetModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setResetModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content" style={{ maxWidth: 460, border: '1px solid #3d3d3d' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ padding: 8, background: 'rgba(217, 119, 6, 0.15)', borderRadius: '50%', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-header)', margin: 0, color: 'var(--white)' }}>
                  Restablecer Contraseña
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {resetModal.studentName} • <span style={{ fontFamily: 'var(--font-mono)' }}>[{resetModal.controlNumber}]</span>
                </div>
              </div>
            </div>

            {resetModal.successMessage ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10B981', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34D399', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>
                  <CheckCircle size={16} /> Contraseña Restablecida Exitosamente
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Proporciona la siguiente clave temporal al alumno:
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#181818', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #333' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', flex: 1 }}>
                    {resetModal.tempPassword}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyPassword}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    {resetModal.copied ? <><Check size={12} color="#10B981" /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                  Asigna una nueva clave temporal para que el alumno pueda volver a acceder a su cuenta.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Nueva Contraseña Temporal:
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', fontWeight: 600 }}
                      value={resetModal.tempPassword}
                      onChange={(e) => setResetModal(prev => ({ ...prev, tempPassword: e.target.value }))}
                      placeholder="ej. Tec#2026"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Generar otra clave aleatoria"
                      onClick={() => setResetModal(prev => ({ ...prev, tempPassword: generateRandomTempPassword() }))}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={resetModal.forceChange}
                      onChange={(e) => setResetModal(prev => ({ ...prev, forceChange: e.target.checked }))}
                    />
                    <span>Exigir al alumno cambiar la contraseña en su próximo inicio de sesión</span>
                  </label>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResetModal(prev => ({ ...prev, isOpen: false }))}
              >
                {resetModal.successMessage ? 'Cerrar' : 'Cancelar'}
              </button>
              {!resetModal.successMessage && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={resetModal.isSubmitting || !resetModal.tempPassword.trim()}
                  onClick={handleConfirmResetPassword}
                >
                  <KeyRound size={14} />
                  {resetModal.isSubmitting ? 'Guardando...' : 'Restablecer Clave'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
