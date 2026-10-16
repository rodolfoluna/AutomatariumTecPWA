/**
 * Pantalla de Inicio de Sesión Oficial de AutomatariumTec PWA:
 * - Alumnos: Acceso con Número de Control y Contraseña.
 * - Profesores: Acceso con Correo Institucional registrado en Firebase y Contraseña.
 * - Estética fiel a Automatarium (Space Mono, carbón, naranja #f2994a, dot-grid).
 */

import React, { useState } from 'react'
import { UserRole, UserProfile, StudentGroup } from '../../types/academic'
import { loginStudent, loginTeacher } from '../../services/authService'
import { User, GraduationCap, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'

interface LoginViewProps {
  groups: StudentGroup[]
  onLoginSuccess: (user: UserProfile) => void
  onOpenAbout: () => void
}

export const LoginView: React.FC<LoginViewProps> = ({
  groups,
  onLoginSuccess,
  onOpenAbout
}) => {
  const [activeTab, setActiveTab] = useState<UserRole>('student')
  
  // Campos Alumno (vacíos para producción con solo hints)
  const [controlNumber, setControlNumber] = useState('')
  const [studentPassword, setStudentPassword] = useState('')

  // Campos Profesor (vacíos para producción con solo hints)
  const [teacherEmail, setTeacherEmail] = useState('')
  const [teacherPassword, setTeacherPassword] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const user = await loginStudent(controlNumber, studentPassword, groups)
      onLoginSuccess(user)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión como alumno.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const user = await loginTeacher(teacherEmail, teacherPassword)
      onLoginSuccess(user)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión como profesor.')
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      backgroundColor: '#181818',
      backgroundImage: 'radial-gradient(#2A2A2A 12.5%, #181818 12.5%)',
      backgroundSize: '16px 16px'
    }}>
      {/* Contenedor Principal de Login */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#202020',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #383838',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        padding: '32px 28px',
        position: 'relative'
      }}>
        {/* Encabezado con Logotipo Automatarium */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
              <circle cx="8" cy="16" r="6" fill="hsl(var(--primary-h), 84%, 50%)" />
              <circle cx="24" cy="8" r="5" fill="none" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
              <circle cx="24" cy="24" r="5" fill="none" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
              <line x1="13" y1="13" x2="20" y2="10" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
              <line x1="13" y1="19" x2="20" y2="22" stroke="hsl(var(--primary-h), 85%, 93%)" strokeWidth="2" />
            </svg>
          </div>

          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            fontFamily: 'var(--font-header)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            automatarium<span style={{ color: 'var(--primary)' }}>.tec</span>
          </h1>

          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginTop: 6
          }}>
            Modelado de AFDs y Diagramas Léxicos Offline
          </p>
        </div>

        {/* Pestañas de Selección de Rol */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: '#151515',
          padding: 4,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #333',
          marginBottom: 20
        }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              justifyContent: 'center',
              border: activeTab === 'student' ? undefined : 'none',
              background: activeTab === 'student' ? undefined : 'transparent'
            }}
            onClick={() => { setActiveTab('student'); setErrorMessage(null) }}
          >
            <User size={14} /> Acceso Alumnos
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'teacher' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              justifyContent: 'center',
              border: activeTab === 'teacher' ? undefined : 'none',
              background: activeTab === 'teacher' ? undefined : 'transparent'
            }}
            onClick={() => { setActiveTab('teacher'); setErrorMessage(null) }}
          >
            <GraduationCap size={14} /> Acceso Docentes
          </button>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            borderRadius: 'var(--radius-sm)',
            color: '#FCA5A5',
            fontSize: '0.8rem',
            marginBottom: 16
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* FORMULARIO DE ALUMNOS (Número de Control + Contraseña) */}
        {activeTab === 'student' && (
          <form onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Número de Control Institucional:
              </label>
              <input
                type="text"
                required
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="ej. 21280145"
                value={controlNumber}
                onChange={(e) => setControlNumber(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Contraseña:
              </label>
              <input
                type="password"
                required
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="Ingresa tu contraseña"
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'block', marginTop: 4 }}>
                * Si es tu primer ingreso, usa la clave temporal que te dio el profesor.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            >
              {isLoading ? 'Iniciando sesión...' : 'Ingresar como Alumno'} <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* FORMULARIO DE PROFESOR (Correo registrado en Firebase + Contraseña) */}
        {activeTab === 'teacher' && (
          <form onSubmit={handleTeacherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Correo Institucional:
              </label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="ej. profesor@tec.edu.mx"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                Contraseña:
              </label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="Ingresa tu contraseña"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            >
              {isLoading ? 'Iniciando sesión...' : 'Ingresar al Panel Docente'} <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* Pie de modal con enlace de licencia */}
        <div style={{
          marginTop: 22,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-subtle)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={13} color="var(--green)" /> Modo Offline PWA
          </span>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.72rem'
            }}
            onClick={onOpenAbout}
          >
            Licencia MIT Automatarium
          </button>
        </div>
      </div>
    </div>
  )
}
