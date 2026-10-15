/**
 * Aplicación Principal AutomatariumTec PWA
 * Especializada para AFDs y Diagramas de Transición Léxicos
 * 100% Offline-first con diseño visual oficial de Automatarium y soporte para Actividades en Equipo.
 */

import React, { useState } from 'react'
import { UserRole, StudentGroup, Activity, ActivitySubmission } from './types/academic'
import { Navbar } from './components/common/Navbar'
import { AboutModal } from './components/common/AboutModal'
import { TeacherDashboard } from './components/teacher/TeacherDashboard'
import { StudentView } from './components/student/StudentView'

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

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('student')
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [groups, setGroups] = useState<StudentGroup[]>(INITIAL_GROUPS)
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES)
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([])

  // Alumno actual
  const [studentControlNumber] = useState('21280145')
  const [studentFullName] = useState('García Hernández Juan')
  const [mustChangePassword, setMustChangePassword] = useState(false)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Barra de navegación global estilo Automatarium */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenAbout={() => setIsAboutOpen(true)}
        pendingSyncCount={submissions.filter(s => s.isDirtyLocally).length}
      />

      {/* Contenido dinámico según el rol */}
      <main style={{ flex: 1 }}>
        {currentRole === 'teacher' ? (
          <TeacherDashboard
            groups={groups}
            activities={activities}
            submissions={submissions}
            onSaveGroup={handleSaveGroup}
            onSaveActivity={handleSaveActivity}
            onDeleteActivity={handleDeleteActivity}
          />
        ) : (
          <StudentView
            studentControlNumber={studentControlNumber}
            studentFullName={studentFullName}
            mustChangePassword={mustChangePassword}
            activities={activities}
            onPasswordChanged={() => setMustChangePassword(false)}
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
