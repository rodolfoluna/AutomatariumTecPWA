/**
 * Aplicación Principal AutomatariumTec PWA
 * Especializada para AFDs y Diagramas de Transición Léxicos
 * 100% Offline-first con diseño visual oficial de Automatarium y soporte para Actividades en Equipo.
 */

import React, { useState } from 'react'
import { StudentGroup, Activity, ActivitySubmission, UserProfile } from './types/academic'
import { Navbar } from './components/common/Navbar'
import { AboutModal } from './components/common/AboutModal'
import { TeacherDashboard } from './components/teacher/TeacherDashboard'
import { StudentView } from './components/student/StudentView'
import { LoginView } from './components/auth/LoginView'
import { getStoredSession, logoutSession, updateStudentPassword, updateTeacherProfile } from './services/authService'
import { initSyncService } from './services/syncService'
import { localDB } from './db/indexedDb'

const ALL_STUDENTS = [
  { controlNumber: '21280145', fullName: 'García Hernández Juan' },
  { controlNumber: '21280999', fullName: 'Sánchez Morales Carlos' },
  { controlNumber: '21280147', fullName: 'López Ruiz Ana' }
]

// Datos iniciales demostrativos (con actividad individual y actividad en equipo)
const INITIAL_GROUPS: StudentGroup[] = [
  {
    id: 'gpo_lenguajes_7a',
    teacherId: 'prof_mendoza',
    name: 'Lenguajes y Autómatas I - Gpo 7A',
    period: 'Enero - Junio 2026',
    studentControlNumbers: ['21280145', '21280999', '21280147'],
    createdAt: Date.now() - 86400000 * 5
  }
]

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act_practica_1',
    teacherId: 'prof_mendoza',
    groupIds: ['gpo_lenguajes_7a'],
    title: 'Práctica 1: Modelado de AFD (Individual)',
    description: 'Construye un Autómata Finito Determinista para cadenas binarias que terminen en 01.',
    createdAt: Date.now() - 86400000 * 3,
    published: true,
    isTeamActivity: false,
    maxTeamSize: 1,
    exercises: [
      {
        id: 'ex_afd_binario',
        type: 'AFD',
        title: 'Ejercicio 1: AFD de Cadenas que terminan en 01',
        instructions: 'Construye un AFD sobre el alfabeto {0, 1} que reconozca únicamente cadenas con sufijo "01". Utiliza la prueba paso a paso para verificar el estado de aceptación.',
        order: 1,
        alphabet: ['0', '1'],
        testCases: [
          { input: '01', expectedAccepted: true, description: 'Sufijo directo' },
          { input: '1001', expectedAccepted: true, description: 'Termina en 01' },
          { input: '0', expectedAccepted: false, description: 'No termina en 01' },
          { input: '010', expectedAccepted: false, description: 'Termina en 0' }
        ]
      }
    ]
  },
  {
    id: 'act_practica_2',
    teacherId: 'prof_mendoza',
    groupIds: ['gpo_lenguajes_7a'],
    title: 'Práctica 2: Analizador Léxico Colaborativo (En Equipo)',
    description: 'Actividad en parejas: los integrantes compartirán el mismo avance y entrega para el modelado de tokens.',
    createdAt: Date.now() - 86400000,
    published: true,
    isTeamActivity: true,
    maxTeamSize: 2,
    exercises: [
      {
        id: 'ex_lexer_tokens',
        type: 'LEXER_DIAGRAM',
        title: 'Ejercicio 1: Diagrama de Transición para Identificadores y Números',
        instructions: 'Modela un Diagrama de Transición para un Analizador Léxico que reconozca Identificadores (letras seguidas de letras o dígitos) y Números Enteros. Configura el retroceso (*) en el delimitador para no consumir el siguiente carácter.',
        order: 1,
        expectedTokens: ['TOKEN_ID', 'TOKEN_NUM_INT'],
        testCases: [
          {
            sourceCode: 'contador = 42;',
            expectedTokens: [
              { token: 'TOKEN_ID', lexeme: 'contador' },
              { token: 'TOKEN_NUM_INT', lexeme: '42' }
            ],
            description: 'Identificador y número simple'
          }
        ]
      }
    ]
  }
]

const INITIAL_SUBMISSIONS: ActivitySubmission[] = [
  {
    id: 'act_practica_1_21280145',
    activityId: 'act_practica_1',
    studentUid: 'student_21280145',
    controlNumber: '21280145',
    studentName: 'García Hernández Juan',
    groupId: 'gpo_lenguajes_7a',
    overallStatus: 'submitted',
    submittedAt: Date.now() - 3600000 * 2,
    lastSyncedAt: Date.now() - 3600000 * 2,
    isDirtyLocally: false,
    isTeamSubmission: false,
    exerciseSubmissions: {
      ex_afd_binario: {
        exerciseId: 'ex_afd_binario',
        status: 'submitted',
        testsPassed: 4,
        testsTotal: 4,
        score: 100,
        updatedAt: Date.now() - 3600000 * 2,
        graph: {
          projectType: 'AFD',
          states: [
            { id: 0, name: 'q0', x: 140, y: 160, isFinal: false },
            { id: 1, name: 'q1', x: 280, y: 160, isFinal: false },
            { id: 2, name: 'q2', x: 420, y: 160, isFinal: true }
          ],
          transitions: [
            { id: 1, from: 0, to: 1, read: '0' },
            { id: 2, from: 0, to: 0, read: '1' },
            { id: 3, from: 1, to: 1, read: '0' },
            { id: 4, from: 1, to: 2, read: '1' },
            { id: 5, from: 2, to: 1, read: '0' },
            { id: 6, from: 2, to: 0, read: '1' }
          ],
          initialState: 0
        }
      }
    }
  },
  {
    id: 'team_act_practica_2_21280145_21280999',
    activityId: 'act_practica_2',
    studentUid: 'student_21280145',
    controlNumber: '21280145',
    studentName: 'García Hernández Juan',
    groupId: 'gpo_lenguajes_7a',
    overallStatus: 'submitted',
    submittedAt: Date.now() - 3600000 * 1,
    lastSyncedAt: Date.now() - 3600000 * 1,
    isDirtyLocally: false,
    isTeamSubmission: true,
    teamId: 'team_act_practica_2_21280145_21280999',
    teamName: 'Equipo: Juan & Carlos',
    teamMembers: [
      { controlNumber: '21280145', fullName: 'García Hernández Juan' },
      { controlNumber: '21280999', fullName: 'Sánchez Morales Carlos' }
    ],
    lastEditedBy: {
      controlNumber: '21280999',
      fullName: 'Sánchez Morales Carlos',
      timestamp: Date.now() - 3600000 * 1
    },
    version: 3,
    exerciseSubmissions: {
      ex_lexer_tokens: {
        exerciseId: 'ex_lexer_tokens',
        status: 'submitted',
        testsPassed: 1,
        testsTotal: 1,
        score: 100,
        updatedAt: Date.now() - 3600000 * 1,
        graph: {
          projectType: 'LEXER_DIAGRAM',
          states: [
            { id: 0, name: 'q0', x: 120, y: 160, isFinal: false },
            { id: 1, name: 'q1', x: 260, y: 120, isFinal: false },
            { id: 2, name: 'q2', x: 400, y: 120, isFinal: true, token: 'TOKEN_ID', retract: true, installSymbolTable: true },
            { id: 3, name: 'q3', x: 260, y: 220, isFinal: false },
            { id: 4, name: 'q4', x: 400, y: 220, isFinal: true, token: 'TOKEN_NUM_INT', retract: true }
          ],
          transitions: [
            { id: 1, from: 0, to: 1, read: '[a-zA-Z]' },
            { id: 2, from: 1, to: 1, read: '[a-zA-Z0-9]' },
            { id: 3, from: 1, to: 2, read: 'otro' },
            { id: 4, from: 0, to: 3, read: '[0-9]' },
            { id: 5, from: 3, to: 3, read: '[0-9]' },
            { id: 6, from: 3, to: 4, read: 'otro' }
          ],
          initialState: 0
        }
      }
    }
  }
]

export const App: React.FC = () => {
  // Sesión de usuario activo (obtenida de localStorage si existe)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredSession())
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  // Grupos activos (persistidos en localStorage)
  const [groups, setGroups] = useState<StudentGroup[]>(() => {
    try {
      const saved = localStorage.getItem('automatarium_tec_groups')
      if (saved) return JSON.parse(saved)
    } catch {}
    return INITIAL_GROUPS
  })

  React.useEffect(() => {
    localStorage.setItem('automatarium_tec_groups', JSON.stringify(groups))
  }, [groups])

  // Actividades (persistidas en localStorage)
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('automatarium_tec_activities')
      if (saved) return JSON.parse(saved)
    } catch {}
    return INITIAL_ACTIVITIES
  })

  React.useEffect(() => {
    localStorage.setItem('automatarium_tec_activities', JSON.stringify(activities))
  }, [activities])

  const [submissions, setSubmissions] = useState<ActivitySubmission[]>(INITIAL_SUBMISSIONS)

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user)
  }

  const handleLogout = async () => {
    await logoutSession()
    setCurrentUser(null)
  }

  const handlePasswordChanged = async (newPassword: string) => {
    if (currentUser?.controlNumber) {
      await updateStudentPassword(currentUser.controlNumber, newPassword)
      setCurrentUser(prev => prev ? { ...prev, mustChangePassword: false } : null)
    }
  }

  // Inicializar servicio de sincronización en segundo plano
  React.useEffect(() => {
    const cleanup = initSyncService((status) => {
      // Estado de sincronización en tiempo real
    })
    return cleanup
  }, [])

  const handleSaveGroup = (group: StudentGroup) => {
    setGroups(prev => {
      const idx = prev.findIndex(g => g.id === group.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = group
        return copy
      }
      return [group, ...prev]
    })
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const handleRemoveStudentFromGroup = (groupId: string, controlNumber: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          studentControlNumbers: g.studentControlNumbers.filter(cn => cn !== controlNumber)
        }
      }
      return g
    }))
  }

  const handleUpdateTeacherName = async (newName: string) => {
    if (!newName.trim()) return
    const updated = await updateTeacherProfile(newName)
    setCurrentUser(updated)
  }

  const handleSaveActivity = (activity: Activity) => {
    setActivities(prev => {
      const idx = prev.findIndex(a => a.id === activity.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = activity
        return copy
      }
      return [activity, ...prev]
    })
  }

  const handleDeleteActivity = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId))
  }

  const handleSubmissionComplete = (submission: ActivitySubmission) => {
    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === submission.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = submission
        return copy
      }
      return [submission, ...prev]
    })
  }

  const handleUpdateSubmission = (updated: ActivitySubmission) => {
    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === updated.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = updated
        return copy
      }
      return [updated, ...prev]
    })
    localDB.cachedSubmissions.put(updated).catch(() => {})
  }

  // Si no hay sesión iniciada, mostrar la pantalla de Login oficial
  if (!currentUser) {
    return (
      <>
        <LoginView
          groups={groups}
          onLoginSuccess={handleLoginSuccess}
          onOpenAbout={() => setIsAboutOpen(true)}
        />
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Barra de navegación global estilo Automatarium */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAbout={() => setIsAboutOpen(true)}
        pendingSyncCount={submissions.filter(s => s.isDirtyLocally).length}
      />

      {/* Contenido dinámico según el rol autenticado */}
      <main style={{ flex: 1 }}>
        {currentUser.role === 'teacher' ? (
          <TeacherDashboard
            currentUser={currentUser}
            groups={groups}
            activities={activities}
            submissions={submissions}
            onSaveGroup={handleSaveGroup}
            onDeleteGroup={handleDeleteGroup}
            onRemoveStudentFromGroup={handleRemoveStudentFromGroup}
            onSaveActivity={handleSaveActivity}
            onDeleteActivity={handleDeleteActivity}
            onUpdateSubmission={handleUpdateSubmission}
            onUpdateTeacherName={handleUpdateTeacherName}
          />
        ) : (
          <StudentView
            studentControlNumber={currentUser.controlNumber || '21280145'}
            studentFullName={currentUser.fullName}
            mustChangePassword={currentUser.mustChangePassword}
            activities={activities}
            classmates={ALL_STUDENTS}
            onPasswordChanged={handlePasswordChanged}
            onSubmissionComplete={handleSubmissionComplete}
          />
        )}
      </main>

      {/* Modal de Licencia MIT y Reconocimiento */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  )
}

export default App
