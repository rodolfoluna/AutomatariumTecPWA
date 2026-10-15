/**
 * Aplicación Principal AutomatariumTec PWA
 * Especializada para AFDs y Diagramas de Transición Léxicos
 * 100% Offline-first con sincronización a Firebase y respeto a la licencia MIT de Automatarium.
 */

import React, { useState } from 'react'
import { UserRole, StudentGroup, Activity, ActivitySubmission } from './types/academic'
import { Navbar } from './components/common/Navbar'
import { AboutModal } from './components/common/AboutModal'
import { TeacherDashboard } from './components/teacher/TeacherDashboard'
import { StudentView } from './components/student/StudentView'

// Datos iniciales de demostración escolar
const INITIAL_GROUPS: StudentGroup[] = [
  {
    id: 'gpo_lenguajes_7a',
    teacherId: 'prof_mendoza',
    name: 'Lenguajes y Autómatas I - Gpo 7A',
    period: 'Enero - Junio 2026',
    studentControlNumbers: ['21280145', '21280146', '21280147'],
    createdAt: Date.now() - 86400000 * 5
  }
]

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act_practica_1',
    teacherId: 'prof_mendoza',
    groupIds: ['gpo_lenguajes_7a'],
    title: 'Práctica 1: Modelado de AFD y Diagramas Léxicos',
    description: 'En esta práctica diseñarás un Autómata Finito Determinista para cadenas binarias y un Diagrama de Transición para tokens de identificadores y números.',
    createdAt: Date.now() - 86400000 * 2,
    published: true,
    exercises: [
      {
        id: 'ex_afd_binario',
        type: 'AFD',
        title: 'Ejercicio 1: AFD de Cadenas que terminan en 01',
        instructions: 'Construye un AFD sobre el alfabeto {0, 1} que reconozca únicamente cadenas que terminen con el sufijo "01". Utiliza la prueba paso a paso para verificar el estado de aceptación.',
        order: 1,
        alphabet: ['0', '1'],
        testCases: [
          { input: '01', expectedAccepted: true, description: 'Sufijo directo' },
          { input: '1001', expectedAccepted: true, description: 'Termina en 01' },
          { input: '11101', expectedAccepted: true, description: 'Termina en 01' },
          { input: '0', expectedAccepted: false, description: 'No termina en 01' },
          { input: '010', expectedAccepted: false, description: 'Termina en 0' },
          { input: '111', expectedAccepted: false, description: 'Termina en 1' }
        ]
      },
      {
        id: 'ex_lexer_tokens',
        type: 'LEXER_DIAGRAM',
        title: 'Ejercicio 2: Diagrama de Transición para Identificadores y Números',
        instructions: 'Modela un Diagrama de Transición para un Analizador Léxico que reconozca Identificadores (letras seguidas de letras o dígitos) y Números Enteros (dígitos). Configura el retroceso (*) en el delimitador para no consumir el siguiente carácter.',
        order: 2,
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

  // Datos del alumno actual
  const [studentControlNumber, setStudentControlNumber] = useState('21280145')
  const [studentFullName, setStudentFullName] = useState('García Hernández Juan')
  const [mustChangePassword, setMustChangePassword] = useState(true)

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
      {/* Barra de navegación global con semáforo offline y conmutador de rol */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenAbout={() => setIsAboutOpen(true)}
        pendingSyncCount={submissions.filter(s => s.isDirtyLocally).length}
      />

      {/* Contenido dinámico según el rol seleccionado */}
      <main style={{ flex: 1 }}>
        {currentRole === 'teacher' ? (
          <TeacherDashboard
            groups={groups}
            activities={activities}
            submissions={submissions}
            onSaveGroup={handleSaveGroup}
            onSaveActivity={handleSaveActivity}
          />
        ) : (
          <StudentView
            studentControlNumber={studentControlNumber}
            studentFullName={studentFullName}
            mustChangePassword={mustChangePassword}
            activities={activities}
            onPasswordChanged={(_newPwd) => setMustChangePassword(false)}
            onSubmissionComplete={handleSubmissionComplete}
          />
        )}
      </main>

      {/* Modal de Licencia MIT y Reconocimiento a Automatarium */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  )
}

export default App
