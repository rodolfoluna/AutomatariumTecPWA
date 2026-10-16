/**
 * Servicio Central de Sincronización en la Nube con Cloud Firestore:
 * - Grupos, Actividades, Alumnos, Entregas y Perfil Docente.
 * - Sincronización multi-dispositivo y multi-navegador en tiempo real (onSnapshot).
 * - Persistencia offline automática en IndexedDB y LocalStorage.
 * - Respeta las eliminaciones: los datos borrados no reaparecen en otros equipos.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { StudentGroup, Activity, ActivitySubmission, StudentTeam, TeamInvitation } from '../types/academic'

const SETTINGS_COLLECTION = 'settings'
const GROUPS_COLLECTION = 'groups'
const ACTIVITIES_COLLECTION = 'activities'
const STUDENTS_COLLECTION = 'students'
const SUBMISSIONS_COLLECTION = 'submissions'
const TEAMS_COLLECTION = 'teams'
const INVITATIONS_COLLECTION = 'invitations'
const PREFERENCES_COLLECTION = 'student_preferences'

// Claves de LocalStorage para contingencia offline
const LOCAL_STORAGE_GROUPS = 'automatarium_tec_groups'
const LOCAL_STORAGE_ACTIVITIES = 'automatarium_tec_activities'
const LOCAL_STORAGE_STUDENTS = 'automatarium_tec_student_passwords'
const LOCAL_STORAGE_TEACHER_NAME = 'automatarium_teacher_custom_name'

export interface StudentRecord {
  password: string
  changed: boolean
  fullName: string
}

/**
 * Inicializar datos en la nube únicamente la primera vez que se crea la base de datos.
 * Si ya fue inicializada, no recrea los datos para respetar lo que el profesor haya borrado.
 */
export const initializeCloudDataOnce = async (
  defaultGroups: StudentGroup[],
  defaultActivities: Activity[],
  defaultStudents: Record<string, StudentRecord>
): Promise<void> => {
  try {
    const initRef = doc(db, SETTINGS_COLLECTION, 'init_marker')
    const initSnap = await getDoc(initRef)

    if (initSnap.exists()) {
      // Ya fue inicializado previamente: respetar estado actual en la nube
      return
    }

    // Sembrar grupos iniciales
    for (const g of defaultGroups) {
      await setDoc(doc(db, GROUPS_COLLECTION, g.id), g, { merge: true })
    }

    // Sembrar actividades iniciales
    for (const a of defaultActivities) {
      await setDoc(doc(db, ACTIVITIES_COLLECTION, a.id), a, { merge: true })
    }

    // Sembrar alumnos iniciales
    for (const [ctrl, record] of Object.entries(defaultStudents)) {
      await setDoc(doc(db, STUDENTS_COLLECTION, ctrl), record, { merge: true })
    }

    // Marcar como inicializado en Firestore
    await setDoc(initRef, {
      initialized: true,
      initializedAt: Date.now()
    })
    console.log('[FirestoreSync] Base de datos en la nube inicializada con éxito.')
  } catch (err: any) {
    console.warn('[FirestoreSync] Nota al verificar inicialización en Firestore:', err?.message || err)
  }
}

/**
 * Suscribirse a los GRUPOS en tiempo real desde Cloud Firestore
 */
export const subscribeToGroups = (
  onUpdate: (groups: StudentGroup[]) => void
): Unsubscribe => {
  const colRef = collection(db, GROUPS_COLLECTION)
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StudentGroup[] = []
      snapshot.forEach((d) => {
        list.push(d.data() as StudentGroup)
      })
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

      // Guardar en LocalStorage para disponibilidad offline
      try {
        localStorage.setItem(LOCAL_STORAGE_GROUPS, JSON.stringify(list))
      } catch {}

      onUpdate(list)
    },
    (error) => {
      console.warn('[FirestoreSync] Error al sincronizar grupos:', error.message)
      // Si falla Firestore, leer LocalStorage
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_GROUPS)
        if (saved) onUpdate(JSON.parse(saved))
      } catch {}
    }
  )
}

/**
 * Guardar o actualizar un Grupo en Firestore y LocalStorage
 */
export const syncSaveGroup = async (group: StudentGroup): Promise<void> => {
  try {
    await setDoc(doc(db, GROUPS_COLLECTION, group.id), group, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al guardar grupo en Firestore:', err)
  }
}

/**
 * Eliminar un Grupo de Firestore y LocalStorage
 */
export const syncDeleteGroup = async (groupId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, GROUPS_COLLECTION, groupId))
  } catch (err) {
    console.warn('[FirestoreSync] Error al eliminar grupo de Firestore:', err)
  }
}

/**
 * Suscribirse a las ACTIVIDADES en tiempo real desde Cloud Firestore
 */
export const subscribeToActivities = (
  onUpdate: (activities: Activity[]) => void
): Unsubscribe => {
  const colRef = collection(db, ACTIVITIES_COLLECTION)
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Activity[] = []
      snapshot.forEach((d) => {
        list.push(d.data() as Activity)
      })
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

      // Guardar en LocalStorage para disponibilidad offline
      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVITIES, JSON.stringify(list))
      } catch {}

      onUpdate(list)
    },
    (error) => {
      console.warn('[FirestoreSync] Error al sincronizar actividades:', error.message)
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVITIES)
        if (saved) onUpdate(JSON.parse(saved))
      } catch {}
    }
  )
}

/**
 * Guardar o actualizar una Actividad en Firestore
 */
export const syncSaveActivity = async (activity: Activity): Promise<void> => {
  try {
    await setDoc(doc(db, ACTIVITIES_COLLECTION, activity.id), activity, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al guardar actividad en Firestore:', err)
  }
}

/**
 * Eliminar permanentemente una Actividad de Firestore
 */
export const syncDeleteActivity = async (activityId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ACTIVITIES_COLLECTION, activityId))
  } catch (err) {
    console.warn('[FirestoreSync] Error al eliminar actividad de Firestore:', err)
  }
}

/**
 * Suscribirse al directorio de ALUMNOS (credenciales/nombres) en tiempo real
 */
export const subscribeToStudents = (
  onUpdate: (students: Record<string, StudentRecord>) => void
): Unsubscribe => {
  const colRef = collection(db, STUDENTS_COLLECTION)
  return onSnapshot(
    colRef,
    (snapshot) => {
      const dict: Record<string, StudentRecord> = {}
      snapshot.forEach((d) => {
        dict[d.id] = d.data() as StudentRecord
      })

      // Guardar en LocalStorage para disponibilidad offline
      try {
        localStorage.setItem(LOCAL_STORAGE_STUDENTS, JSON.stringify(dict))
      } catch {}

      onUpdate(dict)
    },
    (error) => {
      console.warn('[FirestoreSync] Error al sincronizar alumnos:', error.message)
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_STUDENTS)
        if (saved) onUpdate(JSON.parse(saved))
      } catch {}
    }
  )
}

/**
 * Registrar o actualizar alumno en Firestore
 */
export const syncSaveStudent = async (
  controlNumber: string,
  record: StudentRecord
): Promise<void> => {
  try {
    await setDoc(doc(db, STUDENTS_COLLECTION, controlNumber), record, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al registrar alumno en Firestore:', err)
  }
}

/**
 * Eliminar alumno permanentemente de Firestore
 */
export const syncDeleteStudent = async (controlNumber: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, controlNumber))
  } catch (err) {
    console.warn('[FirestoreSync] Error al eliminar alumno de Firestore:', err)
  }
}

/**
 * Suscribirse a las ENTREGAS de alumnos en tiempo real
 */
export const subscribeToSubmissions = (
  onUpdate: (submissions: ActivitySubmission[]) => void
): Unsubscribe => {
  const colRef = collection(db, SUBMISSIONS_COLLECTION)
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ActivitySubmission[] = []
      snapshot.forEach((d) => {
        list.push(d.data() as ActivitySubmission)
      })
      onUpdate(list)
    },
    (error) => {
      console.warn('[FirestoreSync] Error al sincronizar entregas:', error.message)
    }
  )
}

/**
 * Guardar o calificar entrega en Firestore
 */
export const syncSaveSubmission = async (submission: ActivitySubmission): Promise<void> => {
  try {
    await setDoc(doc(db, SUBMISSIONS_COLLECTION, submission.id), {
      ...submission,
      lastSyncedAt: Date.now()
    }, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al guardar entrega en Firestore:', err)
  }
}

/**
 * Guardar nombre personalizado del profesor en Firestore
 */
export const syncTeacherName = async (fullName: string): Promise<void> => {
  try {
    localStorage.setItem(LOCAL_STORAGE_TEACHER_NAME, fullName)
    await setDoc(doc(db, SETTINGS_COLLECTION, 'teacher_profile'), {
      fullName,
      updatedAt: Date.now()
    }, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al guardar perfil docente en Firestore:', err)
  }
}

/**
 * Obtener nombre del docente de Firestore si existe
 */
export const fetchTeacherName = async (): Promise<string | null> => {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, 'teacher_profile'))
    if (snap.exists() && snap.data()?.fullName) {
      return snap.data().fullName
    }
  } catch {}
  return localStorage.getItem(LOCAL_STORAGE_TEACHER_NAME)
}

/**
 * -------------------------------------------------------------
 * SINCRONIZACIÓN DE EQUIPOS (TEAMS) EN FIRESTORE
 * Se almacena en la colección 'settings' autorizada por reglas de Firestore
 * -------------------------------------------------------------
 */
export const syncSaveTeam = async (team: StudentTeam): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, `teams_${team.activityId}`)
    const snap = await getDoc(docRef)
    let list: StudentTeam[] = []
    if (snap.exists() && Array.isArray(snap.data()?.teams)) {
      list = [...(snap.data()?.teams as StudentTeam[])]
    }
    const idx = list.findIndex(t => t.id === team.id)
    if (idx >= 0) {
      list[idx] = team
    } else {
      list.push(team)
    }
    await setDoc(docRef, { teams: list, updatedAt: Date.now() }, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al guardar equipo en Firestore:', err)
  }
}

export const syncDeleteTeam = async (teamId: string, activityId?: string): Promise<void> => {
  try {
    if (!activityId) return
    const docRef = doc(db, SETTINGS_COLLECTION, `teams_${activityId}`)
    const snap = await getDoc(docRef)
    if (snap.exists() && Array.isArray(snap.data()?.teams)) {
      const list = (snap.data()?.teams as StudentTeam[]).filter(t => t.id !== teamId)
      await setDoc(docRef, { teams: list, updatedAt: Date.now() }, { merge: true })
    }
  } catch (err) {
    console.warn('[FirestoreSync] Error al eliminar equipo de Firestore:', err)
  }
}

export const subscribeToTeams = (
  activityId: string,
  onUpdate: (teams: StudentTeam[]) => void
): Unsubscribe => {
  const docRef = doc(db, SETTINGS_COLLECTION, `teams_${activityId}`)
  return onSnapshot(
    docRef,
    (snap) => {
      const list: StudentTeam[] = (snap.exists() && Array.isArray(snap.data()?.teams))
        ? (snap.data()?.teams as StudentTeam[])
        : []
      onUpdate(list)
    },
    (err) => console.warn('[FirestoreSync] Error al suscribirse a equipos:', err)
  )
}

export const fetchTeams = async (activityId: string): Promise<StudentTeam[]> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, `teams_${activityId}`)
    const snap = await getDoc(docRef)
    if (snap.exists() && Array.isArray(snap.data()?.teams)) {
      return snap.data()?.teams as StudentTeam[]
    }
  } catch {}
  return []
}

/**
 * -------------------------------------------------------------
 * SINCRONIZACIÓN DE INVITACIONES (INVITATIONS) EN FIRESTORE
 * Se almacena en la colección 'settings' autorizada por reglas de Firestore
 * -------------------------------------------------------------
 */
export const syncSaveInvitation = async (invitation: TeamInvitation): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, `invitations_${invitation.activityId}`)
    const snap = await getDoc(docRef)
    let list: TeamInvitation[] = []
    if (snap.exists() && Array.isArray(snap.data()?.invitations)) {
      list = [...(snap.data()?.invitations as TeamInvitation[])]
    }
    const idx = list.findIndex(i => i.id === invitation.id)
    if (idx >= 0) {
      list[idx] = invitation
    } else {
      list.push(invitation)
    }
    await setDoc(docRef, { invitations: list, updatedAt: Date.now() }, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al guardar invitación en Firestore:', err)
  }
}

export const syncDeleteInvitation = async (invitationId: string, activityId?: string): Promise<void> => {
  try {
    if (!activityId) return
    const docRef = doc(db, SETTINGS_COLLECTION, `invitations_${activityId}`)
    const snap = await getDoc(docRef)
    if (snap.exists() && Array.isArray(snap.data()?.invitations)) {
      const list = (snap.data()?.invitations as TeamInvitation[]).filter(i => i.id !== invitationId)
      await setDoc(docRef, { invitations: list, updatedAt: Date.now() }, { merge: true })
    }
  } catch (err) {
    console.warn('[FirestoreSync] Error al eliminar invitación de Firestore:', err)
  }
}

export const subscribeToInvitations = (
  activityId: string,
  onUpdate: (invitations: TeamInvitation[]) => void
): Unsubscribe => {
  const docRef = doc(db, SETTINGS_COLLECTION, `invitations_${activityId}`)
  return onSnapshot(
    docRef,
    (snap) => {
      const list: TeamInvitation[] = (snap.exists() && Array.isArray(snap.data()?.invitations))
        ? (snap.data()?.invitations as TeamInvitation[])
        : []
      onUpdate(list)
    },
    (err) => console.warn('[FirestoreSync] Error al suscribirse a invitaciones:', err)
  )
}

export const fetchInvitations = async (activityId: string): Promise<TeamInvitation[]> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, `invitations_${activityId}`)
    const snap = await getDoc(docRef)
    if (snap.exists() && Array.isArray(snap.data()?.invitations)) {
      return snap.data()?.invitations as TeamInvitation[]
    }
  } catch {}
  return []
}

/**
 * -------------------------------------------------------------
 * PREFERENCIAS DE ALUMNO (TRABAJAR INDIVIDUAL O EN EQUIPO)
 * Se almacena en la colección 'settings' autorizada por reglas de Firestore
 * -------------------------------------------------------------
 */
export const syncSaveStudentPreference = async (
  activityId: string,
  controlNumber: string,
  isSolo: boolean
): Promise<void> => {
  try {
    const prefDoc = doc(db, SETTINGS_COLLECTION, `pref_${activityId}_${controlNumber}`)
    await setDoc(prefDoc, {
      activityId,
      controlNumber,
      isSolo,
      updatedAt: Date.now()
    }, { merge: true })
  } catch (err) {
    console.warn('[FirestoreSync] Error al guardar preferencia de alumno:', err)
  }
}

export const fetchStudentPreference = async (
  activityId: string,
  controlNumber: string
): Promise<boolean | null> => {
  try {
    const prefDoc = doc(db, SETTINGS_COLLECTION, `pref_${activityId}_${controlNumber}`)
    const snap = await getDoc(prefDoc)
    if (snap.exists()) {
      return snap.data()?.isSolo === true
    }
  } catch {}
  return null
}

/**
 * -------------------------------------------------------------
 * CONSULTA Y RECUPERACIÓN INTELIGENTE DE ENTREGAS / BORRADORES
 * Encuentra la entrega o borrador más reciente para un alumno o su equipo en cualquier navegador
 * -------------------------------------------------------------
 */
export const fetchStudentSubmission = async (
  activityId: string,
  controlNumber: string
): Promise<ActivitySubmission | null> => {
  try {
    const colRef = collection(db, SUBMISSIONS_COLLECTION)
    const snap = await getDocs(colRef)
    const matches: ActivitySubmission[] = []

    snap.forEach((d) => {
      const sub = d.data() as ActivitySubmission & Record<string, any>
      const sCtrl = sub.controlNumber || sub.studentControlNumber
      const sActId = sub.activityId
      const matchesAct = sActId === activityId || d.id.includes(activityId)
      const matchesCtrl = sCtrl === controlNumber ||
                          d.id.includes(controlNumber) ||
                          (sub.isTeamSubmission && sub.teamMembers?.some((m: any) => m.controlNumber === controlNumber))

      if (matchesAct && matchesCtrl) {
        matches.push({ ...sub, id: sub.id || d.id })
      }
    })

    if (matches.length === 0) return null

    // Ordenar de más reciente a más antiguo según lastSyncedAt, updatedAt o submittedAt
    matches.sort((a: any, b: any) => {
      const timeA = a.lastSyncedAt || (typeof a.updatedAt === 'number' ? a.updatedAt : 0) || a.submittedAt || 0
      const timeB = b.lastSyncedAt || (typeof b.updatedAt === 'number' ? b.updatedAt : 0) || b.submittedAt || 0
      return timeB - timeA
    })

    return matches[0]
  } catch (err) {
    console.warn('[FirestoreSync] Error al consultar entrega del alumno:', err)
    return null
  }
}

/**
 * -------------------------------------------------------------
 * CONSULTA Y SUSCRIPCIÓN ESPECÍFICA A UNA ENTREGA / BORRADOR
 * -------------------------------------------------------------
 */
export const fetchSubmissionDoc = async (submissionId: string): Promise<ActivitySubmission | null> => {
  try {
    const snap = await getDoc(doc(db, SUBMISSIONS_COLLECTION, submissionId))
    if (snap.exists()) {
      return snap.data() as ActivitySubmission
    }
  } catch {}
  return null
}

export const subscribeToSubmissionDoc = (
  submissionId: string,
  onUpdate: (submission: ActivitySubmission | null) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, SUBMISSIONS_COLLECTION, submissionId),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as ActivitySubmission)
      } else {
        onUpdate(null)
      }
    },
    (err) => console.warn('[FirestoreSync] Error al suscribirse a entrega:', err)
  )
}

