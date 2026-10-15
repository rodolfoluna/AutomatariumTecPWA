/**
 * Componente de Lienzo Interactivo SVG para diseño de AFDs y Diagramas Léxicos.
 * Adaptado de Automatarium (Licencia MIT) con soporte especializado para tokens y retroceso.
 */

import React, { useState, useRef } from 'react'
import { AutomataGraph, AutomataState, AutomataTransition } from '../../types/automata'
import { 
  STATE_RADIUS, 
  groupTransitions, 
  calculateTransitionGeometry 
} from '../../utils/geometry'
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  CircleDot, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2 
} from 'lucide-react'

interface GraphCanvasProps {
  graph: AutomataGraph
  onChange: (updatedGraph: AutomataGraph) => void
  activeStateId?: number | null
  readOnly?: boolean
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graph,
  onChange,
  activeStateId,
  readOnly = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null)
  const [selectedTransId, setSelectedTransId] = useState<number | null>(null)
  const [connectingFromId, setConnectingFromId] = useState<number | null>(null)
  const [draggingStateId, setDraggingStateId] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Modal para editar transición o estado
  const [editingTransition, setEditingTransition] = useState<AutomataTransition | null>(null)
  const [newTransRead, setNewTransRead] = useState('')

  const isLexerMode = graph.projectType === 'LEXER_DIAGRAM'

  // Manejadores de arrastre de estados
  const handleMouseDownState = (e: React.MouseEvent, state: AutomataState) => {
    if (readOnly) return
    e.stopPropagation()

    if (connectingFromId !== null) {
      // Completar conexión de transición
      createTransition(connectingFromId, state.id)
      setConnectingFromId(null)
      return
    }

    setSelectedStateId(state.id)
    setSelectedTransId(null)
    setDraggingStateId(state.id)

    const svgRect = svgRef.current?.getBoundingClientRect()
    if (svgRect) {
      const mouseX = (e.clientX - svgRect.left - pan.x) / zoom
      const mouseY = (e.clientY - svgRect.top - pan.y) / zoom
      setDragOffset({ x: mouseX - state.x, y: mouseY - state.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingStateId === null || readOnly) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return

    const mouseX = (e.clientX - svgRect.left - pan.x) / zoom
    const mouseY = (e.clientY - svgRect.top - pan.y) / zoom

    const newX = Math.round(mouseX - dragOffset.x)
    const newY = Math.round(mouseY - dragOffset.y)

    const updatedStates = graph.states.map(s => 
      s.id === draggingStateId ? { ...s, x: Math.max(40, newX), y: Math.max(40, newY) } : s
    )

    onChange({ ...graph, states: updatedStates })
  }

  const handleMouseUp = () => {
    setDraggingStateId(null)
  }

  // Operaciones de grafo
  const handleAddState = () => {
    const nextId = graph.states.length === 0 ? 0 : Math.max(...graph.states.map(s => s.id)) + 1
    const newState: AutomataState = {
      id: nextId,
      name: `q${nextId}`,
      x: 100 + (nextId % 5) * 90,
      y: 120 + Math.floor(nextId / 5) * 90,
      isFinal: false,
      token: isLexerMode ? 'TOKEN_ID' : undefined,
      retract: false,
      installSymbolTable: false
    }

    const isFirst = graph.states.length === 0
    onChange({
      ...graph,
      states: [...graph.states, newState],
      initialState: isFirst ? newState.id : graph.initialState
    })
    setSelectedStateId(newState.id)
  }

  const handleDeleteSelected = () => {
    if (selectedStateId !== null) {
      const updatedStates = graph.states.filter(s => s.id !== selectedStateId)
      const updatedTransitions = graph.transitions.filter(
        t => t.from !== selectedStateId && t.to !== selectedStateId
      )
      const newInitial = graph.initialState === selectedStateId 
        ? (updatedStates[0]?.id ?? null) 
        : graph.initialState

      onChange({
        ...graph,
        states: updatedStates,
        transitions: updatedTransitions,
        initialState: newInitial
      })
      setSelectedStateId(null)
    } else if (selectedTransId !== null) {
      const updatedTransitions = graph.transitions.filter(t => t.id !== selectedTransId)
      onChange({ ...graph, transitions: updatedTransitions })
      setSelectedTransId(null)
    }
  }

  const createTransition = (fromId: number, toId: number) => {
    const nextTransId = graph.transitions.length === 0 ? 1 : Math.max(...graph.transitions.map(t => t.id)) + 1
    const defaultSymbol = isLexerMode ? '[a-zA-Z]' : '0'

    const newTrans: AutomataTransition = {
      id: nextTransId,
      from: fromId,
      to: toId,
      read: defaultSymbol
    }

    onChange({
      ...graph,
      transitions: [...graph.transitions, newTrans]
    })
    setEditingTransition(newTrans)
    setNewTransRead(defaultSymbol)
  }

  const toggleInitialState = (stateId: number) => {
    onChange({
      ...graph,
      initialState: graph.initialState === stateId ? null : stateId
    })
  }

  const toggleFinalState = (stateId: number) => {
    const updatedStates = graph.states.map(s => 
      s.id === stateId ? { ...s, isFinal: !s.isFinal } : s
    )
    onChange({ ...graph, states: updatedStates })
  }

  const updateSelectedStateProps = (updates: Partial<AutomataState>) => {
    if (selectedStateId === null) return
    const updatedStates = graph.states.map(s => 
      s.id === selectedStateId ? { ...s, ...updates } : s
    )
    onChange({ ...graph, states: updatedStates })
  }

  const selectedState = graph.states.find(s => s.id === selectedStateId)
  const grouped = groupTransitions(graph.transitions, graph.states)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Barra de herramientas superior del lienzo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid var(--border)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${isLexerMode ? 'badge-lexer' : 'badge-afd'}`}>
            {isLexerMode ? 'Diagrama Léxico' : 'AFD Clásico'}
          </span>

          {!readOnly && (
            <>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleAddState}
              >
                <Plus size={14} /> Añadir Estado
              </button>

              <button 
                type="button" 
                className={`btn btn-sm ${connectingFromId !== null ? 'btn-primary' : 'btn-secondary'}`}
                disabled={selectedStateId === null}
                onClick={() => setConnectingFromId(connectingFromId ? null : selectedStateId)}
                title="Selecciona el estado origen y luego haz clic en el destino"
              >
                <ArrowRight size={14} /> {connectingFromId ? 'Haz clic en destino...' : 'Conectar Transición'}
              </button>

              {(selectedStateId !== null || selectedTransId !== null) && (
                <button 
                  type="button" 
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
            </>
          )}
        </div>

        {/* Controles de vista / zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
            title="Alejar"
          >
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 42, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
            title="Acercar"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            title="Restablecer vista"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Área del Lienzo SVG */}
      <div 
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: 'var(--canvas-bg)',
          backgroundImage: 'radial-gradient(var(--canvas-grid) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          cursor: connectingFromId ? 'crosshair' : 'default',
          overflow: 'hidden'
        }}
        onClick={() => {
          setSelectedStateId(null)
          setSelectedTransId(null)
          setConnectingFromId(null)
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: '100%',
            userSelect: 'none'
          }}
        >
          <defs>
            {/* Marcador de flecha para transiciones estándar */}
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 7 4, 0 7" fill="#94a3b8" />
            </marker>

            {/* Marcador para transición activa / seleccionada */}
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 7 4, 0 7" fill="var(--primary)" />
            </marker>

            {/* Sombra suave para estados */}
            <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 1. Trazado de Transiciones */}
            {grouped.map(gt => {
              const geom = calculateTransitionGeometry(gt)
              const hasSelected = gt.transitions.some(t => t.id === selectedTransId)

              return (
                <g key={`${gt.fromId}->${gt.toId}`}>
                  {/* Línea de detección táctil/clic gruesa invisible */}
                  <path
                    d={geom.pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTransId(gt.transitions[0].id)
                      setSelectedStateId(null)
                      setEditingTransition(gt.transitions[0])
                      setNewTransRead(gt.transitions.map(t => t.read).join(', '))
                    }}
                  />

                  {/* Línea visible de la transición */}
                  <path
                    d={geom.pathD}
                    fill="none"
                    stroke={hasSelected ? 'var(--primary)' : 'var(--edge-stroke)'}
                    strokeWidth={hasSelected ? '2.5' : '1.8'}
                    markerEnd={hasSelected ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    strokeDasharray={hasSelected ? 'none' : 'none'}
                    style={{ transition: 'stroke 0.2s' }}
                  />

                  {/* Rotulación / Etiqueta de la transición */}
                  <g
                    transform={`translate(${geom.labelPos.x}, ${geom.labelPos.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTransId(gt.transitions[0].id)
                      setEditingTransition(gt.transitions[0])
                      setNewTransRead(gt.transitions.map(t => t.read).join(', '))
                    }}
                  >
                    <rect
                      x="-14"
                      y="-12"
                      width={Math.max(28, gt.transitions.map(t => t.read).join(', ').length * 8 + 12)}
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke={hasSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.15)'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={hasSelected ? '#818cf8' : '#e2e8f0'}
                      fontSize="12"
                      fontFamily="var(--font-mono)"
                      fontWeight="500"
                    >
                      {gt.transitions.map(t => t.read).join(', ')}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* 2. Trazado de Estados */}
            {graph.states.map(state => {
              const isInitial = graph.initialState === state.id
              const isSelected = selectedStateId === state.id
              const isActiveSimulation = activeStateId === state.id
              const isConnectOrigin = connectingFromId === state.id

              return (
                <g
                  key={state.id}
                  transform={`translate(${state.x}, ${state.y})`}
                  style={{ cursor: connectingFromId ? 'crosshair' : 'grab' }}
                  onMouseDown={(e) => handleMouseDownState(e, state)}
                >
                  {/* Flecha indicadora de Estado Inicial */}
                  {isInitial && (
                    <g transform="translate(-48, 0)">
                      <line
                        x1="0"
                        y1="0"
                        x2="18"
                        y2="0"
                        stroke="var(--accent-cyan)"
                        strokeWidth="2.5"
                        markerEnd="url(#arrowhead)"
                      />
                      <polygon points="12 -4, 20 0, 12 4" fill="var(--accent-cyan)" />
                    </g>
                  )}

                  {/* Halo de selección o simulación activa */}
                  {(isSelected || isActiveSimulation || isConnectOrigin) && (
                    <circle
                      r={STATE_RADIUS + 7}
                      fill="none"
                      stroke={
                        isActiveSimulation 
                          ? 'var(--success)' 
                          : isConnectOrigin 
                            ? 'var(--warning)' 
                            : 'var(--primary)'
                      }
                      strokeWidth="2"
                      strokeDasharray={isConnectOrigin ? '4 3' : 'none'}
                      opacity="0.85"
                    />
                  )}

                  {/* Círculo Principal del Estado */}
                  <circle
                    r={STATE_RADIUS}
                    fill={isActiveSimulation ? 'rgba(16, 185, 129, 0.25)' : '#1e293b'}
                    stroke={
                      isActiveSimulation
                        ? 'var(--success)'
                        : isSelected
                          ? 'var(--primary)'
                          : state.isFinal
                            ? 'var(--node-final-border)'
                            : 'var(--node-border)'
                    }
                    strokeWidth={state.isFinal ? '2.5' : '2'}
                    filter="url(#nodeShadow)"
                  />

                  {/* Círculo interior concéntrico si es Estado de Aceptación (Final) */}
                  {state.isFinal && (
                    <circle
                      r={STATE_RADIUS - 5}
                      fill="none"
                      stroke={
                        isActiveSimulation
                          ? 'var(--success)'
                          : isSelected
                            ? 'var(--primary)'
                            : 'var(--node-final-border)'
                      }
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Nombre del Estado (ej: q0, q1) */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#f8fafc"
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="var(--font-mono)"
                  >
                    {state.name || `q${state.id}`}
                  </text>

                  {/* Información extra para modo Diagrama Léxico */}
                  {isLexerMode && state.isFinal && state.token && (
                    <g transform={`translate(0, ${STATE_RADIUS + 16})`}>
                      <rect
                        x="-45"
                        y="-10"
                        width="90"
                        height="20"
                        rx="4"
                        fill="#0b132b"
                        stroke="rgba(6, 182, 212, 0.4)"
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#67e8f9"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="var(--font-mono)"
                      >
                        {state.token}{state.retract ? ' *' : ''}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Panel lateral flotante de propiedades del estado seleccionado */}
        {selectedState && !readOnly && (
          <div 
            className="glass-panel"
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              width: 290,
              padding: 16,
              zIndex: 20
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>
                Estado: {selectedState.name || `q${selectedState.id}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{selectedState.id}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Renombrar estado */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Etiqueta:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  value={selectedState.name}
                  onChange={(e) => updateSelectedStateProps({ name: e.target.value })}
                />
              </div>

              {/* Botones de alternancia de Inicial / Final */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${graph.initialState === selectedState.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => toggleInitialState(selectedState.id)}
                >
                  <CircleDot size={13} /> {graph.initialState === selectedState.id ? 'Inicial ✓' : 'Hacer Inicial'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedState.isFinal ? 'btn-success' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => toggleFinalState(selectedState.id)}
                >
                  <CheckCircle2 size={13} /> {selectedState.isFinal ? 'Aceptación ✓' : 'Hacer Final'}
                </button>
              </div>

              {/* Opciones adicionales para Diagramas Léxicos */}
              {isLexerMode && selectedState.isFinal && (
                <div style={{ marginTop: 4, padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ fontSize: '0.75rem', color: '#67e8f9', display: 'block', marginBottom: 4 }}>
                    Token retornado:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', marginBottom: 8 }}
                    value={selectedState.token || ''}
                    placeholder="ej. TOKEN_ID"
                    onChange={(e) => updateSelectedStateProps({ token: e.target.value.toUpperCase() })}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.775rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedState.retract || false}
                        onChange={(e) => updateSelectedStateProps({ retract: e.target.checked })}
                      />
                      <span>Retraer cursor 1 carácter (<strong>*</strong>)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.775rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedState.installSymbolTable || false}
                        onChange={(e) => updateSelectedStateProps({ installSymbolTable: e.target.checked })}
                      />
                      <span>Validar en Tabla de Símbolos</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para editar símbolo de la transición */}
      {editingTransition && (
        <div className="modal-overlay" onClick={() => setEditingTransition(null)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, fontSize: '1.1rem' }}>Símbolo(s) de la Transición</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              {isLexerMode 
                ? 'Escribe el símbolo, rango como [a-zA-Z], [0-9], o escribe "otro" para la rama default.' 
                : 'Escribe el símbolo o lista de símbolos separados por comas (ej. 0, 1).'}
            </p>
            <input
              type="text"
              className="form-input"
              value={newTransRead}
              autoFocus
              onChange={(e) => setNewTransRead(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const updatedTransitions = graph.transitions.map(t => 
                    t.id === editingTransition.id ? { ...t, read: newTransRead.trim() || '0' } : t
                  )
                  onChange({ ...graph, transitions: updatedTransitions })
                  setEditingTransition(null)
                }
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingTransition(null)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const updatedTransitions = graph.transitions.map(t => 
                    t.id === editingTransition.id ? { ...t, read: newTransRead.trim() || '0' } : t
                  )
                  onChange({ ...graph, transitions: updatedTransitions })
                  setEditingTransition(null)
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
