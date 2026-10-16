/**
 * Barra de Navegación Superior con el Estilo Oficial de Automatarium:
 * - Tipografía Space Mono y paleta carbón/naranja
 * - Indicador de Conectividad en tiempo real (En línea / Offline / Sincronizando)
 * - Selector de Rol (Docente / Alumno)
 * - Botón de Licencia y Atribución Automatarium
 * - Botón de Instalación PWA
 */

import React, { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  Download, 
  Info, 
  GraduationCap, 
  User,
  LogOut
} from 'lucide-react'
import { UserProfile } from '../../types/academic'

interface NavbarProps {
  currentUser?: UserProfile | null
  onLogout?: () => void
  onOpenAbout: () => void
  pendingSyncCount?: number
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenAbout,
  pendingSyncCount = 0
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCellular, setIsCellular] = useState<boolean>(() => {
    const conn = (navigator as any).connection
    return conn?.type === 'cellular' || conn?.effectiveType === '2g' || conn?.effectiveType === '3g'
  })
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsSyncing(true)
      setTimeout(() => {
        setIsSyncing(false)
      }, 1500)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsSyncing(false)
    }

    const checkConnection = () => {
      const conn = (navigator as any).connection
      setIsCellular(conn?.type === 'cellular' || conn?.effectiveType === '2g' || conn?.effectiveType === '3g')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const conn = (navigator as any).connection
    if (conn) {
      conn.addEventListener('change', checkConnection)
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (conn) {
        conn.removeEventListener('change', checkConnection)
      }
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
      height: '60px',
      background: '#181818',
      borderBottom: '1px solid #333333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 18px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Logotipo Estilo Automatarium */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* SVG Mini Logo de Automatarium (Tres círculos conectados) */}
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="8" cy="16" r="6" fill="hsl(var(--primary-h), 84%, 50%)" />
          <circle cx="24" cy="8" r="5" fill="none" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
          <circle cx="24" cy="24" r="5" fill="none" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
          <line x1="13" y1="13" x2="20" y2="10" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
          <line x1="13" y1="19" x2="20" y2="22" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
        </svg>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '1.15rem', fontFamily: 'var(--font-header)', letterSpacing: '-0.02em', color: 'var(--white)' }}>
              automatarium<span style={{ color: 'var(--primary)' }}>.tec</span>
            </span>
            <span className="badge badge-afd" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>PWA</span>
          </div>
        </div>
      </div>

      {/* Centro: Semáforo de Sincronización Offline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        background: '#111111',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid #333'
      }}>
        {isSyncing ? (
          <>
            <RefreshCw size={13} className="status-dot-syncing" color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              Sincronizando con servidor...
            </span>
          </>
        ) : isOnline ? (
          isCellular ? (
            <>
              <span className="status-dot" style={{ background: '#F59E0B' }} />
              <span style={{ fontSize: '0.75rem', color: '#FCD34D', fontFamily: 'var(--font-mono)' }}>
                📱 Datos móviles (Se recomienda Wi-Fi)
              </span>
            </>
          ) : (
            <>
              <span className="status-dot status-dot-online" />
              <span style={{ fontSize: '0.75rem', color: '#86EFAC', fontFamily: 'var(--font-mono)' }}>
                En línea (Sincronizado)
              </span>
            </>
          )
        ) : (
          <>
            <span className="status-dot status-dot-offline" />
            <span style={{ fontSize: '0.75rem', color: '#EF4444', fontFamily: 'var(--font-mono)' }}>
              ⚠️ Sin conexión (Conéctate a Wi-Fi)
            </span>
          </>
        )}
      </div>

      {/* Derecha: Selector de Rol y Licencia */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {deferredPrompt && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleInstallClick}
            title="Instalar PWA"
          >
            <Download size={13} /> Instalar
          </button>
        )}

        {/* Perfil del Usuario Activo */}
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            background: '#222222',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #383838',
            fontSize: '0.775rem'
          }}>
            <span 
              className={`badge ${currentUser.role === 'teacher' ? 'badge-afd' : 'badge-lexer'}`}
              style={{ fontSize: '0.68rem', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {currentUser.role === 'teacher' ? (
                <>
                  <GraduationCap size={12} /> Docente
                </>
              ) : (
                <>
                  <User size={12} /> Alumno
                </>
              )}
            </span>
            <span style={{ fontWeight: 600 }}>{currentUser.fullName}</span>
            {currentUser.controlNumber && (
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                [{currentUser.controlNumber}]
              </span>
            )}
          </div>
        )}

        {/* Botón Cerrar Sesión */}
        {onLogout && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            title="Cerrar sesión activa"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#F87171' }}
          >
            <LogOut size={13} /> Salir
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onOpenAbout}
          title="Ver Licencia MIT"
        >
          <Info size={13} /> Licencia
        </button>
      </div>
    </nav>
  )
}
