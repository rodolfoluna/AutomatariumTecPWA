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
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { StudentGroup, Activity, ActivitySubmission } from '../types/academic'

const SETTINGS_COLLECTION = 'settings'
const GROUPS_COLLECTION = 'groups'
const ACTIVITIES_COLLECTION = 'activities'
const STUDENTS_COLLECTION = 'students'
const SUBMISSIONS_COLLECTION = 'submissions'

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
