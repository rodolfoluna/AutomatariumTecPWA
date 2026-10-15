/**
 * Barra de Navegación Superior:
 * - Indicador de Conectividad en tiempo real (En línea / Offline / Sincronizando)
 * - Selector de Rol (Docente / Alumno)
 * - Botón de Licencia y Atribución Automatarium
 * - Botón de Instalación PWA
 */

import React, { useState, useEffect } from 'react'
import { UserRole } from '../../types/academic'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Info, 
  GraduationCap, 
  Layers 
} from 'lucide-react'

interface NavbarProps {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
  onOpenAbout: () => void
  pendingSyncCount?: number
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onOpenAbout,
  pendingSyncCount = 0
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Escuchar eventos de conectividad de red
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsSyncing(true)
      // Simular sincronización al recuperar conexión
      setTimeout(() => {
        setIsSyncing(false)
      }, 1500)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsSyncing(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Capturar evento de instalación PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  return (
    <nav style={{
      height: '65px',
      background: 'rgba(11, 15, 25, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Logotipo y Título de la Aplicación */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--primary-glow)'
        }}>
          <Layers size={22} color="#ffffff" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Automatarium<span style={{ color: 'var(--accent-cyan)' }}>Tec</span>
            </span>
            <span className="badge badge-afd" style={{ fontSize: '0.65rem' }}>PWA</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
            AFDs & Analizadores Léxicos Offline
          </div>
        </div>
      </div>

      {/* Centro: Semáforo e Indicador de Conexión / Sincronización */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border)'
      }}>
        {isSyncing ? (
          <>
            <RefreshCw size={14} className="status-dot-syncing" color="var(--primary)" />
            <span style={{ fontSize: '0.775rem', color: '#a5b4fc', fontWeight: 500 }}>
              Sincronizando con el servidor...
            </span>
          </>
        ) : isOnline ? (
          <>
            <span className="status-dot status-dot-online" />
            <span style={{ fontSize: '0.775rem', color: '#6ee7b7', fontWeight: 500 }}>
              En línea {pendingSyncCount > 0 ? `(${pendingSyncCount} pendientes)` : '(Sincronizado)'}
            </span>
          </>
        ) : (
          <>
            <span className="status-dot status-dot-offline" />
            <span style={{ fontSize: '0.775rem', color: '#fcd34d', fontWeight: 500 }}>
              Sin conexión (Modo Offline activo)
            </span>
          </>
        )}
      </div>

      {/* Derecha: Cambiador de Rol, Botón Instalar y Acerca de */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {deferredPrompt && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleInstallClick}
            title="Instalar como aplicación de escritorio o móvil"
          >
            <Download size={14} /> Instalar PWA
          </button>
        )}

        {/* Selector de Rol para demo / pruebas */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: 3,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <button
            type="button"
            className={`btn btn-sm ${currentRole === 'teacher' ? 'btn-primary' : ''}`}
            style={{
              padding: '4px 10px',
              fontSize: '0.775rem',
              background: currentRole === 'teacher' ? undefined : 'transparent',
              border: 'none',
              boxShadow: currentRole === 'teacher' ? undefined : 'none'
            }}
            onClick={() => onRoleChange('teacher')}
          >
            <GraduationCap size={13} /> Profesor
          </button>
          <button
            type="button"
            className={`btn btn-sm ${currentRole === 'student' ? 'btn-primary' : ''}`}
            style={{
              padding: '4px 10px',
              fontSize: '0.775rem',
              background: currentRole === 'student' ? undefined : 'transparent',
              border: 'none',
              boxShadow: currentRole === 'student' ? undefined : 'none'
            }}
            onClick={() => onRoleChange('student')}
          >
            Alumno
          </button>
        </div>

        {/* Botón Acerca de / Licencia MIT */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onOpenAbout}
          title="Ver Licencia MIT y Créditos a Automatarium"
        >
          <Info size={14} /> Licencia
        </button>
      </div>
    </nav>
  )
}
