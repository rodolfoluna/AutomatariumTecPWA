/**
 * Tipos de datos para el módulo académico (Profesor, Alumnos, Grupos, Actividades, Equipos).
 */

import { AutomataGraph, StringTestCase, LexerTestCase } from './automata'

export type UserRole = 'teacher' | 'student'

export interface UserProfile {
  uid: string
  email: string
  role: UserRole
  fullName: string
  controlNumber?: string        // Para alumnos: ej. "21280145"
  mustChangePassword?: boolean // Obligatorio en el primer login
  createdAt: number
}

export interface StudentEnrollment {
  controlNumber: string
  fullName: string
  temporaryPassword?: string
  enrolledAt: number
}

export interface StudentGroup {
  id: string
  teacherId: string
  name: string                 // Ej: "Lenguajes y Autómatas I - Gpo A"
  period: string               // Ej: "Enero - Junio 2026"
  studentControlNumbers: string[]
  createdAt: number
}

export type ExerciseType = 'AFD' | 'LEXER_DIAGRAM'

export interface BaseExercise {
  id: string
  type: ExerciseType
  title: string
  instructions: string
  order: number
}

export interface AFDExercise extends BaseExercise {
  type: 'AFD'
  alphabet: string[]           // Ej: ['0', '1'] o ['a', 'b', 'c']
  testCases: StringTestCase[]
  initialTemplate?: Partial<AutomataGraph>
}

export interface LexerExercise extends BaseExercise {
  type: 'LEXER_DIAGRAM'
  expectedTokens: string[]     // Ej: ['TOKEN_ID', 'TOKEN_INT', 'TOKEN_IF']
  testCases: LexerTestCase[]
  initialTemplate?: Partial<AutomataGraph>
}

export type Exercise = AFDExercise | LexerExercise

export interface Activity {
  id: string
  teacherId: string
  groupIds: string[]           // Grupos que tienen asignada esta actividad
  title: string
  description: string
  createdAt: number
  dueDate?: number             // Timestamp opcional de fecha límite
  exercises: Exercise[]
  published: boolean
  
  // Soporte para actividades en equipo
  isTeamActivity?: boolean     // true: actividad en equipo, false: individual
  maxTeamSize?: number         // Número de integrantes (ej: 2 o 3 alumnos)
}

export type SubmissionStatus = 'draft' | 'submitted' | 'graded'

export interface ExerciseSubmission {
  exerciseId: string
  graph: AutomataGraph
  status: SubmissionStatus
  testsPassed: number
  testsTotal: number
  teacherFeedback?: string
  score?: number
  updatedAt: number
}

export interface ActivitySubmission {
  id: string                   // `${activityId}_${controlNumber}` o `team_${activityId}_${teamId}`
  activityId: string
  studentUid: string
  controlNumber: string
  studentName: string
  groupId: string
  exerciseSubmissions: Record<string, ExerciseSubmission>
  overallStatus: SubmissionStatus
  submittedAt?: number
  lastSyncedAt?: number
  isDirtyLocally?: boolean     // Para control de sincronización offline
  
  // Metadatos de actividad en equipo
  isTeamSubmission?: boolean
  teamId?: string
  teamName?: string
  teamMembers?: Array<{
    controlNumber: string
    fullName: string
  }>
  lastEditedBy?: {
    controlNumber: string
    fullName: string
    timestamp: number
  }
  version?: number             // Contador incremental para resolución de concurrencia offline
}
