/**
 * Vista de Trabajo del Alumno (Estilo Oficial Automatarium):
 * - Navegación ágil entre Actividades y Ejercicios con auto-guardado
 * - Botones de navegación Anterior / Siguiente con preservación de estado
 * - Soporte para Actividades Individuales o EN EQUIPO (avance compartido)
 * - Cambio forzoso de contraseña en primer login
 */

import React, { useState, useEffect, useRef } from 'react'
import { Activity, Exercise, ActivitySubmission, ExerciseSubmission, AFDExercise, LexerExercise, StudentTeam, TeamInvitation } from '../../types/academic'
import { AutomataGraph } from '../../types/automata'
import { GraphCanvas } from '../canvas/GraphCanvas'
import { AFDSimulatorPanel } from '../simulation/AFDSimulatorPanel'
import { LexerSimulatorPanel } from '../simulation/LexerSimulatorPanel'
import { TeamLobby } from './TeamLobby'
import { runAFDTestSuite } from '../../simulation/afdSimulator'
import { runLexerTestSuite } from '../../simulation/lexerSimulator'
import { localDB } from '../../db/indexedDb'
import {
  syncSaveTeam,
  syncDeleteInvitation,
  subscribeToTeams,
  subscribeToInvitations,
  syncSaveInvitation,
  syncSaveStudentPreference,
  fetchStudentPreference,
  fetchSubmissionDoc,
  subscribeToSubmissionDoc
} from '../../services/academicFirestoreService'
import { ConflictModal } from './ConflictModal'
import { areGraphsEqual, mergeAutomataGraphs, normalizeAutomataGraph } from '../../utils/diagramMerge'
import { 
  Lock, 
  Save, 
  Send, 
  Users, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen,
  User,
  RotateCcw
} from 'lucide-react'

interface StudentViewProps {
  studentControlNumber: string
  studentFullName: string
  mustChangePassword?: boolean
  activities: Activity[]
  classmates?: Array<{ controlNumber: string; fullName: string }>
  onPasswordChanged: (newPassword: string) => void
  onSubmissionComplete: (submission: ActivitySubmission) => void
}

export const StudentView: React.FC<StudentViewProps> = ({
  studentControlNumber,
  studentFullName,
  mustChangePassword = false,
  activities,
  classmates = [],
  onPasswordChanged,
  onSubmissionComplete
}) => {
  const [showPasswordModal, setShowPasswordModal] = useState(mustChangePassword)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Selector de Actividad y Ejercicio
  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id || '')
  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0] || null
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0)

  // Estado dinámico del equipo para la actividad seleccionada
  const [currentTeam, setCurrentTeam] = useState<StudentTeam | null>(null)
  const [invitationsReceived, setInvitationsReceived] = useState<TeamInvitation[]>([])
  const [invitationsSent, setInvitationsSent] = useState<TeamInvitation[]>([])
  const [isSoloMode, setIsSoloMode] = useState<boolean>(false)
  const [lastEditedByInfo, setLastEditedByInfo] = useState<string>('Tú (Guardado local)')

  const isTeamActivity = selectedActivity?.isTeamActivity || false
  const isStarted = !isTeamActivity || isSoloMode || (currentTeam !== null && currentTeam.isLocked)
  const effectiveTeamMembers = isSoloMode
    ? [{ controlNumber: studentControlNumber, fullName: studentFullName }]
    : currentTeam?.members || [{ controlNumber: studentControlNumber, fullName: studentFullName }]
  const isTeam = isTeamActivity && !isSoloMode
  const teamId = isTeam
    ? (currentTeam?.id || `team_${selectedActivity?.id}_${effectiveTeamMembers.map(m => m.controlNumber).sort().join('_')}`)
    : undefined

  const currentExercise: Exercise | undefined = selectedActivity?.exercises[selectedExerciseIndex]

  const [currentGraph, setCurrentGraph] = useState<AutomataGraph>(() => {
    return {
      projectType: currentExercise?.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
      states: [
        { id: 0, name: 'q0', x: 140, y: 160, isFinal: false },
        { id: 1, name: 'q1', x: 300, y: 160, isFinal: true, token: 'TOKEN_ID' }
      ],
      transitions: [
        { id: 1, from: 0, to: 1, read: currentExercise?.type === 'LEXER_DIAGRAM' ? '[a-zA-Z]' : '0' }
      ],
      initialState: 0
    }
  })

  const [activeSimulationState, setActiveSimulationState] = useState<number | null>(null)
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null)

  // Estado para gestión de conflictos de concurrencia en equipo
  const [conflictData, setConflictData] = useState<{
    localGraph: AutomataGraph
    remoteGraph: AutomataGraph
    remoteAuthorName: string
    remoteTimestamp?: number
    remoteSubmission: ActivitySubmission
  } | null>(null)

  // 1. Cargar equipo e invitaciones en tiempo real con Firestore e IndexedDB
  useEffect(() => {
    if (!selectedActivity) return

    const soloKey = `solo_${selectedActivity.id}_${studentControlNumber}`
    const isSoloLocal = localStorage.getItem(soloKey) === 'true'
    setIsSoloMode(isSoloLocal)

    // Cargar preferencia remota (para recordar en cualquier navegador o equipo si eligió trabajar individual)
    fetchStudentPreference(selectedActivity.id, studentControlNumber).then(cloudSolo => {
      if (cloudSolo !== null) {
        setIsSoloMode(cloudSolo)
        localStorage.setItem(soloKey, cloudSolo ? 'true' : 'false')
      }
    })

    // Suscripción en tiempo real a equipos en Firestore
    const unsubTeams = subscribeToTeams(selectedActivity.id, async (cloudTeams) => {
      for (const t of cloudTeams) {
        await localDB.teams.put(t)
      }
      const myTeam = cloudTeams.find(t => t.members.some(m => m.controlNumber === studentControlNumber)) || null
      setCurrentTeam(myTeam)
    })

    // Suscripción en tiempo real a invitaciones en Firestore
    const unsubInvs = subscribeToInvitations(selectedActivity.id, async (cloudInvs) => {
      for (const inv of cloudInvs) {
        await localDB.invitations.put(inv)
      }
      const received = cloudInvs.filter(i => i.toControlNumber === studentControlNumber && i.status === 'pending')
      const sent = cloudInvs.filter(i => i.fromControlNumber === studentControlNumber && i.status === 'pending')
      setInvitationsReceived(received)
      setInvitationsSent(sent)
    })

    return () => {
      unsubTeams()
      unsubInvs()
    }
  }, [selectedActivity?.id, studentControlNumber])

  // 2. Cargar borrador (priorizando nube/Firestore multi-dispositivo y fallback a IndexedDB local)
  useEffect(() => {
    if (!currentExercise || !selectedActivity) return

    const loadDraft = async () => {
      const storageKey = isTeam && teamId
        ? `${teamId}_${currentExercise.id}`
        : `${selectedActivity.id}_${currentExercise.id}`
      
      const submissionId = isTeam && teamId
        ? teamId
        : `${selectedActivity.id}_${studentControlNumber}`

      // A. Cargar borrador local si existe
      const existingDraft = await localDB.drafts.get(storageKey)
      if (existingDraft?.graph) {
        setCurrentGraph(existingDraft.graph)
      }

      // B. Consultar versión en la nube (Firestore) para persistencia multi-dispositivo y trabajo en equipo
      try {
        const cloudSub = await fetchSubmissionDoc(submissionId)
        if (cloudSub) {
          const rawCandidate = cloudSub.exerciseSubmissions?.[currentExercise.id]?.graph ||
                               (cloudSub.exerciseSubmissions?.[currentExercise.id] as any)?.diagram ||
                               (cloudSub.exerciseSubmissions?.[currentExercise.id] as any)?.diagramData ||
                               (cloudSub as any)?.diagramData || 
                               (cloudSub as any)?.diagram ||
                               (cloudSub.exerciseSubmissions ? (Object.values(cloudSub.exerciseSubmissions)[selectedExerciseIndex] as any)?.graph || (Object.values(cloudSub.exerciseSubmissions)[selectedExerciseIndex] as any)?.diagram : undefined)

          const cloudGraph = normalizeAutomataGraph(rawCandidate, currentExercise.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD')

          if (cloudGraph && cloudGraph.states && cloudGraph.states.length > 0) {
            const localHasStates = existingDraft?.graph?.states && existingDraft.graph.states.length > 0
            const cloudTimestamp = cloudSub.lastSyncedAt || cloudSub.submittedAt || 0
            const localTimestamp = existingDraft?.updatedAt || 0

            // Si local no tiene estados o la nube es más reciente
            if (!localHasStates || cloudTimestamp >= localTimestamp) {
              setCurrentGraph(cloudGraph)
              await localDB.drafts.put({
                id: storageKey,
                activityId: selectedActivity.id,
                exerciseId: currentExercise.id,
                title: currentExercise.title,
                projectType: cloudGraph.projectType,
                graph: cloudGraph,
                updatedAt: cloudTimestamp || Date.now()
              })
            }
          }
        } else if (!existingDraft) {
          // Plantilla inicial si no hay borrador local ni en la nube
          setCurrentGraph({
            projectType: currentExercise.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
            states: [
              { id: 0, name: 'q0', x: 140, y: 160, isFinal: false },
              { id: 1, name: 'q1', x: 300, y: 160, isFinal: true, token: currentExercise.type === 'LEXER_DIAGRAM' ? 'TOKEN_ID' : undefined }
            ],
            transitions: [
              { id: 1, from: 0, to: 1, read: currentExercise.type === 'LEXER_DIAGRAM' ? '[a-zA-Z]' : '0' }
            ],
            initialState: 0
          })
        }
      } catch (err) {
        console.warn('Error al consultar borrador en Firestore:', err)
      }
    }

    loadDraft()
  }, [selectedActivity?.id, currentExercise?.id, isTeam, teamId])

  // 3. Colaboración en equipo en tiempo real y detección de conflictos
  useEffect(() => {
    if (!isTeam || !teamId || !currentExercise) return

    const unsubTeamDoc = subscribeToSubmissionDoc(teamId, (cloudSub) => {
      if (!cloudSub || !cloudSub.exerciseSubmissions?.[currentExercise.id]) return

      const editorCtrl = cloudSub.lastEditedBy?.controlNumber
      if (editorCtrl && editorCtrl !== studentControlNumber) {
        const rawRemote = cloudSub.exerciseSubmissions[currentExercise.id].graph ||
                          (cloudSub.exerciseSubmissions[currentExercise.id] as any).diagram ||
                          (cloudSub.exerciseSubmissions[currentExercise.id] as any).diagramData
        const remoteGraph = normalizeAutomataGraph(rawRemote, currentExercise.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD')

        if (remoteGraph && !areGraphsEqual(currentGraph, remoteGraph)) {
          // Si el alumno no ha realizado modificaciones locales respecto al borrador guardado, se sincroniza automáticamente
          setConflictData({
            localGraph: currentGraph,
            remoteGraph,
            remoteAuthorName: cloudSub.lastEditedBy?.fullName || 'Tu compañero',
            remoteTimestamp: cloudSub.lastEditedBy?.timestamp || cloudSub.lastSyncedAt,
            remoteSubmission: cloudSub
          })
        }
      }
    })

    return () => unsubTeamDoc()
  }, [isTeam, teamId, currentExercise?.id, currentGraph])

  // 4. Manejadores de resolución de conflictos
  const handleResolveConflictChooseRemote = async () => {
    if (!conflictData || !currentExercise || !selectedActivity) return
    setCurrentGraph(conflictData.remoteGraph)
    const storageKey = isTeam && teamId ? `${teamId}_${currentExercise.id}` : `${selectedActivity.id}_${currentExercise.id}`
    await localDB.drafts.put({
      id: storageKey,
      activityId: selectedActivity.id,
      exerciseId: currentExercise.id,
      title: currentExercise.title,
      projectType: conflictData.remoteGraph.projectType,
      graph: conflictData.remoteGraph,
      updatedAt: Date.now()
    })
    setConflictData(null)
    setSaveStatusMessage(`Versión de ${conflictData.remoteAuthorName} aplicada`)
    setTimeout(() => setSaveStatusMessage(null), 3000)
  }

  const handleResolveConflictChooseLocal = async () => {
    if (!conflictData) return
    setConflictData(null)
    await handleSaveDraftOffline()
    setSaveStatusMessage('Tu versión local prevaleció y fue subida a la nube')
    setTimeout(() => setSaveStatusMessage(null), 3000)
  }

  const handleResolveConflictMerge = async () => {
    if (!conflictData || !currentExercise || !selectedActivity) return
    const merged = mergeAutomataGraphs(conflictData.localGraph, conflictData.remoteGraph)
    setCurrentGraph(merged)
    const storageKey = isTeam && teamId ? `${teamId}_${currentExercise.id}` : `${selectedActivity.id}_${currentExercise.id}`
    await localDB.drafts.put({
      id: storageKey,
      activityId: selectedActivity.id,
      exerciseId: currentExercise.id,
      title: currentExercise.title,
      projectType: merged.projectType,
      graph: merged,
      updatedAt: Date.now()
    })
    setConflictData(null)
    setSaveStatusMessage('¡Autómatas fusionados exitosamente!')
    setTimeout(() => setSaveStatusMessage(null), 3000)
    await handleSaveDraftOffline()
  }

  // 5. Guardado de borrador offline y sincronización en tiempo real con Cloud Firestore
  const handleSaveDraftOffline = async () => {
    if (!selectedActivity || !currentExercise) return

    const storageKey = isTeam && teamId
      ? `${teamId}_${currentExercise.id}`
      : `${selectedActivity.id}_${currentExercise.id}`

    await localDB.drafts.put({
      id: storageKey,
      activityId: selectedActivity.id,
      exerciseId: currentExercise.id,
      title: currentExercise.title,
      projectType: currentGraph.projectType,
      graph: currentGraph,
      updatedAt: Date.now()
    })

    setLastEditedByInfo(`Tú (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`)
    setSaveStatusMessage(isTeam ? 'Borrador del equipo sincronizado' : 'Borrador guardado y sincronizado')
    setTimeout(() => setSaveStatusMessage(null), 3000)

    try {
      const submissionId = isTeam && teamId
        ? teamId
        : `${selectedActivity.id}_${studentControlNumber}`

      let testsPassed = 0
      let testsTotal = currentExercise.testCases.length
      if (currentExercise.type === 'AFD') {
        const results = runAFDTestSuite(currentGraph, (currentExercise as AFDExercise).testCases)
        testsPassed = results.passedCount
        testsTotal = results.totalCount
      } else {
        const results = runLexerTestSuite(currentGraph, (currentExercise as LexerExercise).testCases)
        testsPassed = results.passedCount
        testsTotal = results.totalCount
      }

      const existingSub = await localDB.cachedSubmissions.get(submissionId)
      const exerciseSubs = existingSub?.exerciseSubmissions || {}
      
      const currentOverallStatus = existingSub?.overallStatus === 'submitted' || existingSub?.overallStatus === 'graded'
        ? existingSub.overallStatus
        : 'draft'

      exerciseSubs[currentExercise.id] = {
        exerciseId: currentExercise.id,
        graph: currentGraph,
        diagram: JSON.stringify(currentGraph),
        status: currentOverallStatus,
        testsPassed,
        testsTotal,
        score: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0,
        updatedAt: Date.now()
      } as any

      const draftSub: ActivitySubmission & Record<string, any> = {
        id: submissionId,
        activityId: selectedActivity.id,
        studentUid: `student_${studentControlNumber}`,
        controlNumber: studentControlNumber,
        studentControlNumber: studentControlNumber,
        studentName: studentFullName,
        groupId: selectedActivity.groupIds[0] || 'default_group',
        overallStatus: currentOverallStatus,
        status: currentOverallStatus === 'draft' ? 'in_progress' : currentOverallStatus,
        diagramData: JSON.stringify(currentGraph),
        testsPassed,
        testsTotal,
        submittedAt: existingSub?.submittedAt || Date.now(),
        lastSyncedAt: Date.now(),
        isDirtyLocally: !navigator.onLine,
        isTeamSubmission: isTeam,
        teamId: isTeam ? teamId : undefined,
        teamName: isTeam ? `Equipo: ${effectiveTeamMembers.map(m => m.fullName.split(' ')[0]).join(' & ')}` : undefined,
        teamMembers: isTeam ? effectiveTeamMembers : undefined,
        lastEditedBy: {
          controlNumber: studentControlNumber,
          fullName: studentFullName,
          timestamp: Date.now()
        },
        version: (existingSub?.version || 0) + 1,
        exerciseSubmissions: exerciseSubs
      }

      await localDB.cachedSubmissions.put(draftSub)
      onSubmissionComplete(draftSub)
    } catch (e) {
      console.warn('Error al sincronizar avance de borrador:', e)
    }
  }

  // 6. Auto-guardado inteligente (debounced 1.5s) al modificar el diagrama en el lienzo
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (!selectedActivity || !currentExercise) return

    const timer = setTimeout(() => {
      handleSaveDraftOffline()
    }, 1500)

    return () => clearTimeout(timer)
  }, [currentGraph])

  // Navegación segura entre ejercicios (con auto-guardado previo)
  const handleNavigateToExercise = async (targetIndex: number) => {
    if (!selectedActivity || targetIndex < 0 || targetIndex >= selectedActivity.exercises.length) return
    // Auto-guardar borrador del ejercicio actual antes de cambiar
    await handleSaveDraftOffline()
    setSelectedExerciseIndex(targetIndex)
  }

  // Cambio de actividad
  const handleChangeActivity = async (newActId: string) => {
    if (newActId === selectedActivityId) return
    await handleSaveDraftOffline()
    setSelectedActivityId(newActId)
    setSelectedExerciseIndex(0)
  }

  const handleSubmitActivity = async () => {
    if (!selectedActivity || !currentExercise) return

    await handleSaveDraftOffline()

    const submissionId = isTeam && teamId
      ? teamId
      : `${selectedActivity.id}_${studentControlNumber}`

    // Compilar todos los ejercicios de la actividad (del borrador local o del grafo actual)
    const exerciseSubmissions: Record<string, ExerciseSubmission> = {}

    for (const ex of selectedActivity.exercises) {
      let graphToEvaluate = currentGraph
      if (ex.id !== currentExercise.id) {
        const storageKey = isTeam && teamId
          ? `${teamId}_${ex.id}`
          : `${selectedActivity.id}_${ex.id}`
        const draft = await localDB.drafts.get(storageKey)
        if (draft) {
          graphToEvaluate = draft.graph
        } else {
          graphToEvaluate = {
            projectType: ex.type === 'LEXER_DIAGRAM' ? 'LEXER_DIAGRAM' : 'AFD',
            states: [{ id: 0, name: 'q0', x: 140, y: 160, isFinal: false }],
            transitions: [],
            initialState: 0
          }
        }
      }

      let testsPassed = 0
      let testsTotal = ex.testCases.length
      if (ex.type === 'AFD') {
        const results = runAFDTestSuite(graphToEvaluate, (ex as AFDExercise).testCases)
        testsPassed = results.passedCount
        testsTotal = results.totalCount
      } else {
        const results = runLexerTestSuite(graphToEvaluate, (ex as LexerExercise).testCases)
        testsPassed = results.passedCount
        testsTotal = results.totalCount
      }

      exerciseSubmissions[ex.id] = {
        exerciseId: ex.id,
        graph: graphToEvaluate,
        status: 'submitted',
        testsPassed,
        testsTotal,
        score: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 100,
        updatedAt: Date.now()
      }
    }

    const submission: ActivitySubmission = {
      id: submissionId,
      activityId: selectedActivity.id,
      studentUid: `student_${studentControlNumber}`,
      controlNumber: studentControlNumber,
      studentName: studentFullName,
      groupId: selectedActivity.groupIds[0] || 'default_group',
      overallStatus: 'submitted',
      submittedAt: Date.now(),
      isDirtyLocally: !navigator.onLine,
      isTeamSubmission: isTeam,
      teamId: isTeam ? teamId : undefined,
      teamName: isTeam ? `Equipo: ${effectiveTeamMembers.map(m => m.fullName.split(' ')[0]).join(' & ')}` : undefined,
      teamMembers: isTeam ? effectiveTeamMembers : undefined,
      lastEditedBy: {
        controlNumber: studentControlNumber,
        fullName: studentFullName,
        timestamp: Date.now()
      },
      version: 1,
      exerciseSubmissions
    }

    await localDB.cachedSubmissions.put(submission)
    await localDB.syncQueue.put({
      id: `sync_${Date.now()}`,
      action: 'SUBMIT_ACTIVITY',
      payload: submission,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    })

    onSubmissionComplete(submission)
    setSaveStatusMessage(isTeam ? '¡Actividad entregada para todo el equipo!' : '¡Actividad entregada con éxito!')
  }

  // Manejo de invitaciones de equipo sincronizadas con Firestore y IndexedDB
  const handleSendInvitation = async (toControlNumber: string, toFullName: string) => {
    if (!selectedActivity) return
    const teamIdToUse = currentTeam?.id || `team_${selectedActivity.id}_${studentControlNumber}_${Date.now()}`

    let team = currentTeam
    if (!team) {
      team = {
        id: teamIdToUse,
        activityId: selectedActivity.id,
        members: [{ controlNumber: studentControlNumber, fullName: studentFullName }],
        maxTeamSize: selectedActivity.maxTeamSize || 2,
        isLocked: false,
        createdAt: Date.now()
      }
      await localDB.teams.put(team)
      await syncSaveTeam(team)
      setCurrentTeam(team)
    }

    const invitation: TeamInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      activityId: selectedActivity.id,
      fromControlNumber: studentControlNumber,
      fromFullName: studentFullName,
      toControlNumber,
      toFullName,
      teamId: team.id,
      status: 'pending',
      createdAt: Date.now()
    }

    await localDB.invitations.put(invitation)
    await syncSaveInvitation(invitation)
    setInvitationsSent(prev => [...prev, invitation])
  }

  const handleAcceptInvitation = async (invitation: TeamInvitation) => {
    if (!selectedActivity) return

    const updatedInv: TeamInvitation = { ...invitation, status: 'accepted' }
    await localDB.invitations.put(updatedInv)
    await syncSaveInvitation(updatedInv)

    let team = await localDB.teams.get(invitation.teamId)
    if (!team) {
      team = {
        id: invitation.teamId,
        activityId: selectedActivity.id,
        members: [
          { controlNumber: invitation.fromControlNumber, fullName: invitation.fromFullName },
          { controlNumber: studentControlNumber, fullName: studentFullName }
        ],
        maxTeamSize: selectedActivity.maxTeamSize || 2,
        isLocked: false,
        createdAt: Date.now()
      }
    } else {
      if (!team.members.some(m => m.controlNumber === studentControlNumber)) {
        team.members.push({ controlNumber: studentControlNumber, fullName: studentFullName })
      }
    }

    await localDB.teams.put(team)
    await syncSaveTeam(team)
    setCurrentTeam(team)
    setInvitationsReceived(prev => prev.filter(i => i.id !== invitation.id))
  }

  const handleRejectInvitation = async (invitationId: string) => {
    await localDB.invitations.delete(invitationId)
    await syncDeleteInvitation(invitationId)
    setInvitationsReceived(prev => prev.filter(i => i.id !== invitationId))
  }

  const handleCancelInvitation = async (invitationId: string) => {
    await localDB.invitations.delete(invitationId)
    await syncDeleteInvitation(invitationId)
    setInvitationsSent(prev => prev.filter(i => i.id !== invitationId))
  }

  const handleStartWithTeam = async (team: StudentTeam) => {
    const lockedTeam: StudentTeam = { ...team, isLocked: true }
    await localDB.teams.put(lockedTeam)
    await syncSaveTeam(lockedTeam)
    setCurrentTeam(lockedTeam)
  }

  const handleStartSolo = () => {
    if (!selectedActivity) return
    localStorage.setItem(`solo_${selectedActivity.id}_${studentControlNumber}`, 'true')
    syncSaveStudentPreference(selectedActivity.id, studentControlNumber, true).catch(() => {})
    setIsSoloMode(true)
  }

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

  const totalExercises = selectedActivity?.exercises.length || 0

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. BARRA SUPERIOR: DATOS DEL ALUMNO Y SELECTOR DE ACTIVIDAD */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 18px',
        background: '#1F1F1F',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Identificación del Alumno */}
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--white)' }}>
              {studentFullName}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>
              [{studentControlNumber}]
            </span>
          </div>

          {/* SELECTOR DE ACTIVIDADES ASIGNADAS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#141414', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid #333' }}>
            <BookOpen size={13} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actividad:</span>
            <select
              className="form-select"
              style={{ padding: '3px 8px', fontSize: '0.8rem', width: 'auto', background: 'transparent', border: 'none', color: 'var(--white)', fontWeight: 600 }}
              value={selectedActivity?.id}
              onChange={(e) => handleChangeActivity(e.target.value)}
            >
              {activities.map(act => (
                <option key={act.id} value={act.id} style={{ background: '#242424', color: '#fff' }}>
                  {act.title} {act.isTeamActivity ? '(Equipo)' : '(Individual)'}
                </option>
              ))}
            </select>
          </div>

          {/* Banner de Equipo o Individual si la actividad es en equipo */}
          {isTeamActivity && (
            isSoloMode ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 10px',
                background: '#2B2418',
                border: '1px solid #78481A',
                borderRadius: 'var(--radius-sm)'
              }}>
                <User size={13} color="var(--primary)" />
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary-h), 85%, 93%)', fontWeight: 500 }}>
                  Modalidad Individual
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '0.675rem' }}
                  onClick={() => {
                    localStorage.removeItem(`solo_${selectedActivity?.id}_${studentControlNumber}`)
                    setIsSoloMode(false)
                  }}
                  title="Cambiar a conformación de equipo"
                >
                  <Users size={11} /> Unirse a Equipo
                </button>
              </div>
            ) : isTeam && currentTeam && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 10px',
                background: 'hsl(270, 50%, 15%)',
                border: '1px solid hsl(270, 60%, 35%)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <Users size={13} color="#D8B4FE" />
                <span style={{ fontSize: '0.75rem', color: '#E9D5FF', fontWeight: 500 }}>
                  Equipo: {effectiveTeamMembers.map(m => m.fullName.split(' ')[0]).join(' & ')}
                </span>
              </div>
            )
          )}
        </div>

        {/* Acciones de Guardado y Entrega */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveStatusMessage && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
              <CheckCircle2 size={13} /> {saveStatusMessage}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSaveDraftOffline}
            title="Guardar borrador en el almacenamiento local IndexedDB"
          >
            <Save size={13} /> Guardar Borrador
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSubmitActivity}
            title={isTeam ? 'Entregar para todos los integrantes' : 'Entregar tu actividad'}
          >
            <Send size={13} /> {isTeam ? 'Entregar para el Equipo' : 'Entregar Actividad'}
          </button>
        </div>
      </div>

      {/* 2. CUERPO PRINCIPAL: LOBBY DE CONFORMACIÓN DE EQUIPO O ÁREA DE TRABAJO */}
      {isTeamActivity && !isStarted && selectedActivity ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TeamLobby
            activity={selectedActivity}
            currentStudent={{ controlNumber: studentControlNumber, fullName: studentFullName }}
            classmates={classmates}
            currentTeam={currentTeam}
            invitationsReceived={invitationsReceived}
            invitationsSent={invitationsSent}
            onSendInvitation={handleSendInvitation}
            onAcceptInvitation={handleAcceptInvitation}
            onRejectInvitation={handleRejectInvitation}
            onCancelInvitation={handleCancelInvitation}
            onStartWithTeam={handleStartWithTeam}
            onStartSolo={handleStartSolo}
          />
        </div>
      ) : (
        <>
          {/* 2. BARRA DE NAVEGACIÓN ENTRE EJERCICIOS (ANTERIOR / PESTAÑAS / SIGUIENTE) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 18px',
            background: '#181818',
            borderBottom: '1px solid #2B2B2B'
          }}>
            {/* Botones de navegación Anterior / Siguiente */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={selectedExerciseIndex === 0}
                onClick={() => handleNavigateToExercise(selectedExerciseIndex - 1)}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                title="Ir al ejercicio anterior (guarda borrador automáticamente)"
              >
                <ChevronLeft size={14} /> Anterior
              </button>

              {/* Pestañas de todos los ejercicios de la actividad */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {selectedActivity?.exercises.map((ex, idx) => {
                  const isCurrent = selectedExerciseIndex === idx
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={() => handleNavigateToExercise(idx)}
                    >
                      <span style={{ fontWeight: 600 }}>{idx + 1}.</span>
                      <span>{ex.type === 'LEXER_DIAGRAM' ? 'Diagrama Léxico' : 'AFD'}</span>
                      {isCurrent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#111' }} />}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={selectedExerciseIndex >= totalExercises - 1}
                onClick={() => handleNavigateToExercise(selectedExerciseIndex + 1)}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                title="Ir al siguiente ejercicio (guarda borrador automáticamente)"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>

            {/* Info de posición y sincronización */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Ejercicio {selectedExerciseIndex + 1} de {totalExercises}
              </span>

              {isTeam && (
                <span style={{ fontSize: '0.725rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {lastEditedByInfo}
                </span>
              )}
            </div>
          </div>

          {/* 3. ÁREA DE TRABAJO: LIENZO (65%) + SIMULADOR / PRUEBAS (35%) */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 410px', overflow: 'hidden' }}>
            <div style={{ height: '100%', position: 'relative' }}>
              <GraphCanvas
                graph={currentGraph}
                onChange={setCurrentGraph}
                activeStateId={activeSimulationState}
              />
            </div>

            <div style={{
              borderLeft: '1px solid #333',
              background: '#1A1A1A',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: 'auto'
            }}>
              {currentExercise && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #2E2E2E', background: '#161616' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-header)' }}>{currentExercise.title}</h4>
                    <span className={`badge ${currentExercise.type === 'LEXER_DIAGRAM' ? 'badge-lexer' : 'badge-afd'}`}>
                      {currentExercise.type === 'LEXER_DIAGRAM' ? 'Léxico' : 'AFD'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {currentExercise.instructions}
                  </p>
                </div>
              )}

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
        </>
      )}

      {/* Modal Primer Login */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Lock size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-header)' }}>Primer Inicio de Sesión</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Hola <strong>{studentFullName}</strong>. Debes cambiar tu contraseña temporal por una personal para acceder.
            </p>

            {passwordError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: 12 }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Nueva Contraseña:
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
                  Confirmar Contraseña:
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
                style={{ marginTop: 8, width: '100%' }}
              >
                Actualizar Contraseña y Acceder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DE RESOLUCIÓN DE CONFLICTOS Y FUSIÓN EN EQUIPO */}
      {conflictData && (
        <ConflictModal
          localGraph={conflictData.localGraph}
          remoteGraph={conflictData.remoteGraph}
          remoteAuthorName={conflictData.remoteAuthorName}
          remoteTimestamp={conflictData.remoteTimestamp}
          onChooseRemote={handleResolveConflictChooseRemote}
          onChooseLocal={handleResolveConflictChooseLocal}
          onMerge={handleResolveConflictMerge}
        />
      )}
    </div>
  )
}
