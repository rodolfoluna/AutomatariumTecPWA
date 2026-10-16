import React from 'react'
import { AutomataGraph } from '../../types/automata'
import { getDiagramDiffSummary } from '../../utils/diagramMerge'
import { AlertTriangle, GitMerge, Download, Upload, CheckCircle2 } from 'lucide-react'

interface ConflictModalProps {
  localGraph: AutomataGraph
  remoteGraph: AutomataGraph
  remoteAuthorName: string
  remoteTimestamp?: number
  onChooseRemote: () => void
  onChooseLocal: () => void
  onMerge: () => void
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  localGraph,
  remoteGraph,
  remoteAuthorName,
  remoteTimestamp,
  onChooseRemote,
  onChooseLocal,
  onMerge
}) => {
  const diff = getDiagramDiffSummary(localGraph, remoteGraph)
  const timeFormatted = remoteTimestamp 
    ? new Date(remoteTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : 'recientemente'

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div 
        className="modal-content"
        style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #333', paddingBottom: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={22} color="#EF4444" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-header)', margin: 0, color: '#F87171' }}>
              Conflicto de Edición en Equipo
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Se detectaron cambios en la nube guardados por <strong>{remoteAuthorName}</strong> a las {timeFormatted}.
            </p>
          </div>
        </div>

        {/* Comparación de Versiones */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Tarjeta Local */}
          <div className="automatarium-card" style={{ padding: 14, border: '1px solid #404040' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem' }}>
              <Upload size={16} /> Tu Versión Local
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>• Estados: <strong>{diff.localStateCount}</strong></div>
              <div>• Transiciones: <strong>{diff.localTransitionCount}</strong></div>
              {diff.addedStates.length > 0 && (
                <div style={{ color: '#FBBF24', fontSize: '0.75rem', marginTop: 4 }}>
                  Nuevos en tu equipo: {diff.addedStates.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta Remota */}
          <div className="automatarium-card" style={{ padding: 14, border: '1px solid #3B82F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#60A5FA', fontWeight: 600, fontSize: '0.88rem' }}>
              <Download size={16} /> Versión de {remoteAuthorName} (Nube)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>• Estados: <strong>{diff.remoteStateCount}</strong></div>
              <div>• Transiciones: <strong>{diff.remoteTransitionCount}</strong></div>
              {diff.remoteAddedStates.length > 0 && (
                <div style={{ color: '#60A5FA', fontSize: '0.75rem', marginTop: 4 }}>
                  Nuevos de tu compañero: {diff.remoteAddedStates.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: '#202020', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          💡 <strong>Recomendación:</strong> Si ambos compañeros diseñaron partes diferentes del autómata, selecciona <strong>Fusionar</strong> para combinar automáticamente los estados y transiciones de ambos.
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px' }}
            onClick={onMerge}
          >
            <GitMerge size={17} /> <strong>Fusionar ambas versiones (Recomendado)</strong>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
              onClick={onChooseRemote}
            >
              <Download size={15} /> Usar versión de {remoteAuthorName}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem' }}
              onClick={onChooseLocal}
            >
              <Upload size={15} /> Conservar solo mi versión local
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
