/**
 * Ventana Modal "Acerca de / Licencia y Atribución"
 * Da cumplimiento expreso a la Licencia MIT de Automatarium (https://github.com/automatarium/automatarium).
 */

import React from 'react'
import { Info, ExternalLink, ShieldCheck, Heart } from 'lucide-react'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Info size={22} color="var(--primary)" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Acerca de AutomatariumTec PWA</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
          <p>
            <strong>AutomatariumTec PWA</strong> es una plataforma educativa de código abierto diseñada para operar 
            <strong> 100% fuera de línea (offline-first)</strong>, permitiendo a los estudiantes diseñar, probar y evaluar:
          </p>

          <ul style={{ paddingLeft: 20, color: 'var(--text-main)' }}>
            <li><strong>Autómatas Finitos Deterministas (AFD)</strong> con simulación y trazas paso a paso.</li>
            <li><strong>Diagramas de Transición para Analizadores Léxicos</strong> con clases de caracteres, retroceso de cursor (<code>*</code>) e integración con tablas de símbolos.</li>
          </ul>

          <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>
              <ShieldCheck size={16} /> Cumplimiento de Licencia de Software Libre (MIT)
            </div>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              Este software se basa en el proyecto de código abierto <strong>Automatarium</strong>, disponible bajo la 
              <strong> Licencia MIT</strong> en GitHub:
            </p>
            <div style={{ marginTop: 8 }}>
              <a
                href="https://github.com/automatarium/automatarium"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--accent-cyan)',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                <span>https://github.com/automatarium/automatarium</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: 4 }}>Autores y Colaboradores de Automatarium:</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Maxwell Reid, Thomas Dib, Ewan Breakey, Benji Grant y Timothy Tran.
              <br />
              <em>Copyright (c) 2022 Automatarium. Todos los derechos reservados bajo la licencia MIT.</em>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
