/**
 * Configuración de Firebase conectada 100% en vivo a Cloud Firestore.
 * Sin persistencia offline local para evitar desincronizaciones entre dispositivos y navegadores.
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { 
  initializeFirestore, 
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

// Firestore 100% en línea (con ignoreUndefinedProperties habilitado)
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true
    })
  } catch {
    return getFirestore(app)
  }
})()
