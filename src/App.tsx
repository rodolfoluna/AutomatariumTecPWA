/**
 * Aplicación Principal AutomatariumTec PWA
 * Especializada para AFDs y Diagramas de Transición Léxicos
 * 100% Offline-first con diseño visual oficial de Automatarium y soporte para Actividades en Equipo.
 */

import React, { useState } from 'react'
import { StudentGroup, Activity, ActivitySubmission, UserProfile } from './types/academic'
import { AlertTriangle, Smartphone, Wifi, RefreshCw } from 'lucide-react'
import { Navbar } from './components/common/Navbar'
import { AboutModal } from './components/common/AboutModal'
import { TeacherDashboard } from './components/teacher/TeacherDashboard'
import { StudentView } from './components/student/StudentView'
import { LoginView } from './components/auth/LoginView'
import { getStoredSession, logoutSession, updateStudentPassword, updateTeacherProfile } from './services/authService'
import { initSyncService } from './services/syncService'
import { localDB } from './db/indexedDb'
import {
  initializeCloudDataOnce,
  subscribeToGroups,
  subscribeToActivities,
  subscribeToStudents,
  subscribeToSubmissions,
  syncSaveGroup,
  syncDeleteGroup,
  syncSaveActivity,
  syncDeleteActivity,
  syncSaveSubmission,
  syncTeacherName
} from './services/academicFirestoreService'

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

  // Grupos activos (con fallback inicial o de localStorage)
  const [groups, setGroups] = useState<StudentGroup[]>(() => {
    try {
      const saved = localStorage.getItem('automatarium_tec_groups')
      if (saved) return JSON.parse(saved)
    } catch {}
    return INITIAL_GROUPS
  })

  // Actividades (con fallback inicial o de localStorage)
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('automatarium_tec_activities')
      if (saved) return JSON.parse(saved)
    } catch {}
    return INITIAL_ACTIVITIES
  })

  const [submissions, setSubmissions] = useState<ActivitySubmission[]>(INITIAL_SUBMISSIONS)

  // Estado de conectividad: La plataforma opera 100% en línea y requiere Wi-Fi
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isCellular, setIsCellular] = useState<boolean>(() => {
    const conn = (navigator as any).connection
    return conn?.type === 'cellular'
  })

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const checkConn = () => {
      const conn = (navigator as any).connection
      setIsCellular(conn?.type === 'cellular')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    const conn = (navigator as any).connection
    if (conn) {
      conn.addEventListener('change', checkConn)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (conn) {
        conn.removeEventListener('change', checkConn)
      }
    }
  }, [])

  // Sincronización en tiempo real con Cloud Firestore (Multi-dispositivo)
  React.useEffect(() => {
    // 1. Inicializar datos demostrativos en Firestore una sola vez si la base de datos es virgen
    const initialStudentRecords: Record<string, any> = {
      '21280145': { password: 'Tec#2026', changed: false, fullName: 'García Hernández Juan' },
      '21280999': { password: 'Tec#2026', changed: true, fullName: 'Sánchez Morales Carlos' },
      '21280147': { password: 'Tec#2026', changed: false, fullName: 'López Ruiz Ana' }
    }
    initializeCloudDataOnce(INITIAL_GROUPS, INITIAL_ACTIVITIES, initialStudentRecords).catch(() => {})

    // 2. Suscribirse a Grupos en Firestore (tiempo real en todos los navegadores)
    const unsubGroups = subscribeToGroups((cloudGroups) => {
      setGroups(cloudGroups)
    })

    // 3. Suscribirse a Actividades en Firestore (tiempo real en todos los navegadores)
    const unsubActivities = subscribeToActivities((cloudActivities) => {
      setActivities(cloudActivities)
    })

    // 4. Suscribirse al Directorio de Alumnos en Firestore
    const unsubStudents = subscribeToStudents((cloudStudents) => {
      try {
        localStorage.setItem('automatarium_tec_student_passwords', JSON.stringify(cloudStudents))
      } catch {}
    })

    // 5. Suscribirse a Entregas en Firestore
    const unsubSubmissions = subscribeToSubmissions((cloudSubmissions) => {
      if (cloudSubmissions.length > 0) {
        setSubmissions(cloudSubmissions)
      }
    })

    // 6. Servicio de sincronización offline para IndexedDB
    const cleanupSync = initSyncService(() => {})

    return () => {
      unsubGroups()
      unsubActivities()
      unsubStudents()
      unsubSubmissions()
      cleanupSync()
    }
  }, [])

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
    syncSaveGroup(group).catch(() => {})
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId))
    syncDeleteGroup(groupId).catch(() => {})
  }

  const handleRemoveStudentFromGroup = (groupId: string, controlNumber: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const updated = {
          ...g,
          studentControlNumbers: g.studentControlNumbers.filter(cn => cn !== controlNumber)
        }
        syncSaveGroup(updated).catch(() => {})
        return updated
      }
      return g
    }))
  }

  const handleUpdateTeacherName = async (newName: string) => {
    if (!newName.trim()) return
    const updated = await updateTeacherProfile(newName)
    setCurrentUser(updated)
    syncTeacherName(newName).catch(() => {})
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
    syncSaveActivity(activity).catch(() => {})
  }

  const handleDeleteActivity = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId))
    syncDeleteActivity(activityId).catch(() => {})
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
    syncSaveSubmission(submission).catch(() => {})
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
    syncSaveSubmission(updated).catch(() => {})
    localDB.cachedSubmissions.put(updated).catch(() => {})
  }

  const renderConnectivityModals = () => {
    if (!isOnline) {
      return (
        <div className="modal-overlay" style={{ zIndex: 99999, background: 'rgba(0, 0, 0, 0.94)' }}>
          <div className="modal-content" style={{ maxWidth: 460, textAlign: 'center', padding: 28, border: '1px solid #EF4444' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#EF4444' }}>
              <AlertTriangle size={30} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-header)', marginBottom: 10, color: '#fff' }}>
              Conexión a Internet Requerida
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
              Para garantizar que todos tus diagramas y calificaciones se sincronicen en tiempo real con la nube sin riesgo de pérdida de avance, <strong>el modo sin conexión ha sido deshabilitado</strong>.
            </p>
            <div style={{ background: '#1C1917', border: '1px solid #444', borderRadius: 'var(--radius-sm)', padding: 12, fontSize: '0.8rem', color: '#FCD34D', marginBottom: 20, textAlign: 'left', lineHeight: 1.5 }}>
              ⚠️ Por favor conéctate a una red Wi-Fi o restablece tu conexión a internet para continuar utilizando AutomatariumTec.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} /> Reintentar Conexión
            </button>
          </div>
        </div>
      )
    }

    if (isCellular) {
      return (
        <div className="modal-overlay" style={{ zIndex: 99999, background: 'rgba(0, 0, 0, 0.94)' }}>
          <div className="modal-content" style={{ maxWidth: 460, textAlign: 'center', padding: 28, border: '1px solid #F59E0B' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#F59E0B' }}>
              <Smartphone size={30} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-header)', marginBottom: 10, color: '#fff' }}>
              Uso Exclusivo en Red Wi-Fi
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
              Se ha detectado una conexión a través de <strong>datos móviles (red celular)</strong>.
            </p>
            <div style={{ background: '#1C1917', border: '1px solid #444', borderRadius: 'var(--radius-sm)', padding: 12, fontSize: '0.8rem', color: '#FCD34D', marginBottom: 20, textAlign: 'left', lineHeight: 1.5 }}>
              📱 <strong>Aviso para usuarios de celular:</strong><br />
              Para asegurar una sincronización continua en tiempo real y evitar consumo de datos o desconexiones, <strong>la plataforma está configurada para funcionar únicamente mediante Wi-Fi</strong>.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                const conn = (navigator as any).connection
                setIsCellular(conn?.type === 'cellular')
              }}
            >
              <Wifi size={14} /> Verificar Conexión Wi-Fi
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  // Si no hay sesión iniciada, mostrar la pantalla de Login oficial
  if (!currentUser) {
    return (
      <>
        {renderConnectivityModals()}
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
      {renderConnectivityModals()}
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
