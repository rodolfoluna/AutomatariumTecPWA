/**
 * Lobby de Conformación de Equipos para Actividades Colaborativas:
 * - El profesor únicamente define si es en equipo y el tamaño máximo (2, 3 o 4 alumnos).
 * - Los alumnos gestionan las invitaciones: enviar solicitud a un compañero y aceptar/rechazar.
 * - Una actividad en equipo solo se inicia cuando el equipo está conformado o si el alumno elige trabajar individualmente.
 */

import React, { useState } from 'react'
import { Activity, StudentTeam, TeamInvitation } from '../../types/academic'
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Send, 
  UserCheck, 
  ArrowRight, 
  User, 
  Clock, 
  AlertCircle,
  ShieldAlert
} from 'lucide-react'

interface TeamLobbyProps {
  activity: Activity
  currentStudent: { controlNumber: string; fullName: string }
  classmates: Array<{ controlNumber: string; fullName: string }>
  currentTeam: StudentTeam | null
  invitationsReceived: TeamInvitation[]
  invitationsSent: TeamInvitation[]
  onSendInvitation: (toControlNumber: string, toFullName: string) => Promise<void>
  onAcceptInvitation: (invitation: TeamInvitation) => Promise<void>
  onRejectInvitation: (invitationId: string) => Promise<void>
  onCancelInvitation: (invitationId: string) => Promise<void>
  onStartWithTeam: (team: StudentTeam) => void
  onStartSolo: () => void
}

export const TeamLobby: React.FC<TeamLobbyProps> = ({
  activity,
  currentStudent,
  classmates,
  currentTeam,
  invitationsReceived,
  invitationsSent,
  onSendInvitation,
  onAcceptInvitation,
  onRejectInvitation,
  onCancelInvitation,
  onStartWithTeam,
  onStartSolo
}) => {
  const maxTeamSize = activity.maxTeamSize || 2
  const [selectedPartnerControl, setSelectedPartnerControl] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  // Miembros actuales del equipo (si no hay equipo registrado, empieza con el alumno actual)
  const teamMembers = currentTeam?.members || [currentStudent]
  const isTeamFull = teamMembers.length >= maxTeamSize
  const hasAtLeastTwo = teamMembers.length >= 2

  // Filtrar compañeros disponibles (que no sean uno mismo ni ya estén en el equipo)
  const availableClassmates = classmates.filter(c => 
    c.controlNumber !== currentStudent.controlNumber &&
    !teamMembers.some(m => m.controlNumber === c.controlNumber) &&
    !invitationsSent.some(inv => inv.toControlNumber === c.controlNumber && inv.status === 'pending')
  )

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPartnerControl) return

    const partner = classmates.find(c => c.controlNumber === selectedPartnerControl)
    if (!partner) return

    setIsSending(true)
    try {
      await onSendInvitation(partner.controlNumber, partner.fullName)
      setSelectedPartnerControl('')
      setActionMessage(`Invitación enviada a ${partner.fullName}.`)
      setTimeout(() => setActionMessage(null), 3000)
    } catch (err: any) {
      setActionMessage(err.message || 'Error al enviar invitación.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div style={{
      maxWidth: 820,
      margin: '24px auto',
      padding: '0 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }}>
      {/* 1. Encabezado de la Actividad */}
      <div className="automatarium-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-team" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                👥 Actividad Colaborativa en Equipo (Hasta {maxTeamSize} integrantes)
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', marginTop: 10, fontFamily: 'var(--font-header)' }}>
              {activity.title}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
              {activity.description}
            </p>
          </div>
        </div>

        {/* Mensaje de Regla */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'rgba(242, 153, 74, 0.1)',
          border: '1px solid rgba(242, 153, 74, 0.35)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.825rem',
          color: 'hsl(var(--primary-h), 85%, 93%)'
        }}>
          <AlertCircle size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Requisito de Inicio:</strong> El lienzo de diseño se desbloqueará una vez que hayas conformado tu equipo mediante invitaciones aceptadas, o bien si decides realizar la actividad de forma individual.
          </span>
        </div>
      </div>

      {/* 2. INVITACIONES RECIBIDAS (Si otros compañeros invitaron a este alumno) */}
      {invitationsReceived.length > 0 && (
        <div className="automatarium-card" style={{
          padding: 20,
          border: '1.5px solid var(--primary)',
          background: 'linear-gradient(180deg, rgba(242, 153, 74, 0.08) 0%, #202020 100%)'
        }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-header)', color: 'var(--primary)' }}>
            🔔 Invitaciones Recibidas ({invitationsReceived.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invitationsReceived.map(inv => (
              <div
                key={inv.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#1A1A1A',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #383838'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {inv.fromFullName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    No. Control: {inv.fromControlNumber} • Te invitó a su equipo
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onAcceptInvitation(inv)}
                  >
                    <Check size={14} /> Aceptar y Unirse
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#F87171' }}
                    onClick={() => onRejectInvitation(inv.id)}
                  >
                    <X size={14} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. GESTIÓN Y CONFORMACIÓN DEL EQUIPO */}
      <div className="automatarium-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-header)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--primary)" />
            Miembros del Equipo ({teamMembers.length} de {maxTeamSize})
          </h3>
          {hasAtLeastTwo && (
            <span className="badge badge-success" style={{ padding: '3px 8px' }}>
              ✓ Equipo listo para iniciar
            </span>
          )}
        </div>

        {/* Lista de Miembros Actuales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {teamMembers.map((member, idx) => (
            <div
              key={member.controlNumber}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: member.controlNumber === currentStudent.controlNumber ? '#262626' : '#1A1A1A',
                border: '1px solid #333',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-afd" style={{ fontSize: '0.7rem' }}>
                  Integrante {idx + 1}
                </span>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {member.fullName} {member.controlNumber === currentStudent.controlNumber ? '(Tú)' : ''}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    [{member.controlNumber}]
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <UserCheck size={14} /> Confirmado
              </span>
            </div>
          ))}

          {/* Espacios vacíos restantes */}
          {Array.from({ length: maxTeamSize - teamMembers.length }).map((_, i) => (
            <div
              key={`empty_${i}`}
              style={{
                padding: '10px 14px',
                background: '#151515',
                border: '1px dashed #404040',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-subtle)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <UserPlus size={14} /> Espacio disponible para invitar a compañero ({teamMembers.length + i + 1} de {maxTeamSize})
            </div>
          ))}
        </div>

        {/* Enviar Invitación a un Compañero (si hay espacio) */}
        {!isTeamFull && (
          <div style={{
            padding: 16,
            background: '#1A1A1A',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #333',
            marginBottom: 20
          }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserPlus size={15} color="var(--primary)" /> Invitar a un Compañero de Clase
            </h4>

            {availableClassmates.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Todos los compañeros de tu grupo ya han sido invitados o ya están en tu equipo.
              </p>
            ) : (
              <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: 10 }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={selectedPartnerControl}
                  onChange={(e) => setSelectedPartnerControl(e.target.value)}
                  required
                >
                  <option value="">-- Selecciona un compañero de tu grupo --</option>
                  {availableClassmates.map(c => (
                    <option key={c.controlNumber} value={c.controlNumber}>
                      {c.fullName} ({c.controlNumber})
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={!selectedPartnerControl || isSending}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Send size={14} /> {isSending ? 'Enviando...' : 'Enviar Invitación'}
                </button>
              </form>
            )}

            {actionMessage && (
              <div style={{ fontSize: '0.75rem', color: 'var(--green)', marginTop: 8 }}>
                ✓ {actionMessage}
              </div>
            )}
          </div>
        )}

        {/* Invitaciones Enviadas Pendientes de Respuesta */}
        {invitationsSent.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Invitaciones enviadas pendientes ({invitationsSent.length}):
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {invitationsSent.map(inv => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#161616',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #303030',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={13} color="var(--primary)" />
                    <span>Invitación enviada a <strong>{inv.toFullName}</strong> ({inv.toControlNumber})</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>• Esperando respuesta</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    onClick={() => onCancelInvitation(inv.id)}
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón para Iniciar con el Equipo (si ya hay al menos 2 integrantes) */}
        {hasAtLeastTwo && (
          <div style={{ borderTop: '1px solid #333', paddingTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: '0.95rem' }}
              onClick={() => onStartWithTeam(currentTeam || {
                id: `team_${activity.id}_${teamMembers.map(m => m.controlNumber).sort().join('_')}`,
                activityId: activity.id,
                members: teamMembers,
                maxTeamSize,
                isLocked: true,
                createdAt: Date.now()
              })}
            >
              🚀 Comenzar Actividad con este Equipo ({teamMembers.length} alumnos) <ArrowRight size={16} />
            </button>
            <div style={{ textAlign: 'center', fontSize: '0.725rem', color: 'var(--text-subtle)', marginTop: 6 }}>
              * Una vez iniciada, todos los integrantes compartirán el mismo lienzo y avance.
            </div>
          </div>
        )}
      </div>

      {/* 4. MODALIDAD INDIVIDUAL (Alternativa si el alumno prefiere trabajar solo) */}
      <div className="automatarium-card" style={{ padding: 20, background: '#191919' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} /> ¿Prefieres trabajar de forma individual?
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Si no deseas trabajar en equipo, puedes optar por resolver esta práctica por tu cuenta de manera individual.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onStartSolo}
          >
            Trabajar Individualmente
          </button>
        </div>
      </div>
    </div>
  )
}
