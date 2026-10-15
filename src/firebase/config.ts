/**
 * Configuración de Firebase con soporte offline nativo de Firestore.
 * Utiliza variables de entorno (VITE_FIREBASE_*) para despliegue en GitHub / Firebase Hosting.
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "automatarium-tec.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "automatarium-tec",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "automatarium-tec.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
}

// Inicializar Firebase evitando duplicaciones
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Autenticación
export const auth = getAuth(app)

// Firestore con caché persistente offline en IndexedDB (soporte multi-pestaña)
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    })
  } catch {
    // Si ya fue inicializado previamente o en entornos de prueba
    return getFirestore(app)
  }
})()
