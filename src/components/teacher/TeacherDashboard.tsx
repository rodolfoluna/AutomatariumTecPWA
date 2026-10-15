/**
 * Panel de Control del Profesor (Estilo Oficial Automatarium):
 * - Creación de Grupos y alta masiva por CSV
 * - Creación de Actividades Individuales o En Equipo (con avance compartido)
 * - Calificador y Monitoreo de Entregas Individuales y por Equipo
 */

import React, { useState } from 'react'
import { StudentGroup, StudentEnrollment, Activity, Exercise, ActivitySubmission } from '../../types/academic'
import { Users, FileText, Plus, Upload, Download, CheckCircle, BookOpen, UserCheck, Shield } from 'lucide-react'

interface TeacherDashboardProps {
  groups: StudentGroup[]
  activities: Activity[]
  submissions: ActivitySubmission[]
  onSaveGroup: (group: StudentGroup) => void
  onSaveActivity: (activity: Activity) => void
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

  // Estado para creación de actividad (incluyendo opción EN EQUIPO)
  const [isCreatingActivity, setIsCreatingActivity] = useState(false)
  const [newActTitle, setNewActTitle] = useState('')
  const [newActDesc, setNewActDesc] = useState('')
  const [isTeamActivity, setIsTeamActivity] = useState(false)
  const [maxTeamSize, setMaxTeamSize] = useState(2)
  const [selectedGroupForActivity, setSelectedGroupForActivity] = useState<string>(groups[0]?.id || '')
  const [newExercises, setNewExercises] = useState<Exercise[]>([])

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let pwd = 'Tec#'
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pwd
  }

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
          { input: '01', expectedAccepted: true },
          { input: '1001', expectedAccepted: true },
          { input: '0', expectedAccepted: false }
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
      published: true,
      isTeamActivity,
      maxTeamSize: isTeamActivity ? maxTeamSize : 1
    }

    onSaveActivity(activity)
    setIsCreatingActivity(false)
    setNewActTitle('')
    setNewActDesc('')
    setIsTeamActivity(false)
    setMaxTeamSize(2)
    setNewExercises([])
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Encabezado con Estilo Automatarium */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-header)', color: 'var(--white)' }}>
            Panel de Gestión Docente
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Administración de grupos, alumnos por número de control y actividades individuales o en equipo.
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
            onClick={() => setIsCreatingActivity(true)}
          >
            <BookOpen size={15} /> Crear Actividad
          </button>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'groups' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('groups')}
        >
          <Users size={15} /> Alumnos y Grupos ({groups.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'activities' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('activities')}
        >
          <FileText size={15} /> Actividades ({activities.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'submissions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('submissions')}
        >
          <CheckCircle size={15} /> Entregas ({submissions.length})
        </button>
      </div>

      {/* 1. SECCIÓN DE ALUMNOS Y GRUPOS */}
      {activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24 }}>
          {/* Alta de Alumnos */}
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

            {/* Alta Individual */}
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

            {/* Carga por CSV */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} color="var(--cyan)" />
                Carga Masiva vía CSV:
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: 8 }}>
                Formato: <code>numero_control,nombre_completo</code>
              </p>
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

          {/* Credenciales y Lista de Grupos */}
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
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownloadCredentialsCSV}
                  >
                    <Download size={13} /> Descargar CSV
                  </button>
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

      {/* 2. SECCIÓN DE ACTIVIDADES (Con soporte individual o en equipo) */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activities.map(act => (
            <div key={act.id} className="automatarium-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, fontFamily: 'var(--font-header)' }}>
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

      {/* 3. SECCIÓN DE ENTREGAS Y REVISIÓN */}
      {activeTab === 'submissions' && (
        <div className="automatarium-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: 14, fontFamily: 'var(--font-header)' }}>
            Entregas Registradas
          </h3>
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No hay entregas registradas aún. Los alumnos pueden resolver las prácticas fuera de línea y sus diagramas se sincronizarán aquí al conectar.
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

      {/* Modal: Crear Actividad (con opción individual o en equipo) */}
      {isCreatingActivity && (
        <div className="modal-overlay" onClick={() => setIsCreatingActivity(false)}>
          <div className="modal-content" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 14, fontFamily: 'var(--font-header)' }}>Nueva Actividad Práctica</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Título de la Actividad:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ej. Práctica 2: Analizador Léxico en Equipo"
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Instrucciones Generales:</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Instrucciones para los estudiantes..."
                  value={newActDesc}
                  onChange={(e) => setNewActDesc(e.target.value)}
                />
              </div>

              {/* OPCIÓN: ACTIVIDAD INDIVIDUAL VS ACTIVIDAD EN EQUIPO */}
              <div style={{
                padding: '14px',
                background: '#191919',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #383838'
              }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isTeamActivity}
                    onChange={(e) => setIsTeamActivity(e.target.checked)}
                  />
                  <span>¿Es una Actividad en Equipo? (Compartir el mismo avance)</span>
                </label>

                {isTeamActivity && (
                  <div style={{ marginTop: 12, paddingLeft: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Integrantes por equipo:
                    </label>
                    <select
                      className="form-select"
                      style={{ width: 140 }}
                      value={maxTeamSize}
                      onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                    >
                      <option value={2}>2 alumnos</option>
                      <option value={3}>3 alumnos</option>
                      <option value={4}>4 alumnos</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      Cualquier integrante que guarde o entregue actualizará el avance común del equipo.
                    </span>
                  </div>
                )}
              </div>

              {/* Ejercicios */}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '180px', overflowY: 'auto' }}>
                  {newExercises.map(ex => (
                    <div
                      key={ex.id}
                      style={{
                        padding: '8px 12px',
                        background: '#1A1A1A',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: `3px solid ${ex.type === 'LEXER_DIAGRAM' ? 'var(--cyan)' : 'var(--primary)'}`
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ex.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.instructions}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingActivity(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={newExercises.length === 0 || !newActTitle.trim()}
                  onClick={handleSaveNewActivity}
                >
                  Publicar Actividad
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
