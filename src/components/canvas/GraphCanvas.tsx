/**
 * Lienzo Interactivo SVG con el Estilo Visual Oficial de Automatarium.
 * Barra de herramientas lateral flotante (Cursor, Mano, Estado, Transición)
 * Cuadrícula de puntos radial y nodos con la paleta de colores de Automatarium.
 */

import React, { useState, useRef } from 'react'
import { AutomataGraph, AutomataState, AutomataTransition } from '../../types/automata'
import { 
  STATE_RADIUS, 
  groupTransitions, 
  calculateTransitionGeometry 
} from '../../utils/geometry'
import { 
  MousePointer2, 
  Hand, 
  Circle, 
  ArrowUpRight, 
  Trash2, 
  CircleDot, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  X
} from 'lucide-react'

type CanvasTool = 'cursor' | 'hand' | 'state' | 'transition'

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
  const [selectedTool, setSelectedTool] = useState<CanvasTool>('cursor')
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null)
  const [selectedTransId, setSelectedTransId] = useState<number | null>(null)
  const [connectingFromId, setConnectingFromId] = useState<number | null>(null)
  const [draggingStateId, setDraggingStateId] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  
  // Pan & Zoom
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Edición de transición
  const [editingTransition, setEditingTransition] = useState<AutomataTransition | null>(null)
  const [newTransRead, setNewTransRead] = useState('')

  const isLexerMode = graph.projectType === 'LEXER_DIAGRAM'

  // Manejar clic en el canvas según la herramienta activa (solo en el fondo)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (readOnly) return

    // Ignorar clics en la barra de herramientas
    const target = e.target as HTMLElement | SVGElement
    if (target.closest('button') || target.closest('.tool-btn')) return

    if (selectedTool === 'state') {
      const svgRect = svgRef.current?.getBoundingClientRect()
      if (!svgRect) return

      const clickX = Math.round((e.clientX - svgRect.left - pan.x) / zoom)
      const clickY = Math.round((e.clientY - svgRect.top - pan.y) / zoom)

      const nextId = graph.states.length === 0 ? 0 : Math.max(...graph.states.map(s => s.id)) + 1
      const newState: AutomataState = {
        id: nextId,
        name: `q${nextId}`,
        x: clickX,
        y: clickY,
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
      setSelectedTool('cursor') // Vuelve a cursor tras colocar estado
    } else {
      setSelectedStateId(null)
      setSelectedTransId(null)
      setConnectingFromId(null)
    }
  }

  // Interacción de estados
  const handleMouseDownState = (e: React.MouseEvent, state: AutomataState) => {
    if (readOnly) return
    e.stopPropagation()

    if (selectedTool === 'transition' || connectingFromId !== null) {
      if (connectingFromId === null) {
        setConnectingFromId(state.id)
      } else {
        createTransition(connectingFromId, state.id)
        setConnectingFromId(null)
        if (selectedTool === 'transition') setSelectedTool('cursor')
      }
      return
    }

    if (selectedTool === 'cursor') {
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
  }

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (selectedTool === 'hand' || e.button === 1 || e.shiftKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      return
    }

    if (draggingStateId !== null && !readOnly) {
      const svgRect = svgRef.current?.getBoundingClientRect()
      if (!svgRect) return

      const mouseX = (e.clientX - svgRect.left - pan.x) / zoom
      const mouseY = (e.clientY - svgRect.top - pan.y) / zoom

      const newX = Math.round(mouseX - dragOffset.x)
      const newY = Math.round(mouseY - dragOffset.y)

      const updatedStates = graph.states.map(s => 
        s.id === draggingStateId ? { ...s, x: Math.max(STATE_RADIUS + 10, newX), y: Math.max(STATE_RADIUS + 10, newY) } : s
      )

      onChange({ ...graph, states: updatedStates })
    }
  }

  const handleMouseUp = () => {
    setDraggingStateId(null)
    setIsPanning(false)
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
      {/* Barra de Menú Estilo Automatarium */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#1E1E1E',
        borderBottom: '1px solid #333',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`badge ${isLexerMode ? 'badge-lexer' : 'badge-afd'}`}>
            {isLexerMode ? 'DIAGRAMA LÉXICO' : 'AFD'}
          </span>

          {(selectedStateId !== null || selectedTransId !== null) && !readOnly && (
            <button 
              type="button" 
              className="btn btn-danger btn-sm"
              onClick={handleDeleteSelected}
              title="Eliminar elemento seleccionado"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          )}

          {connectingFromId !== null && (
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              Selecciona el estado destino para la transición...
            </span>
          )}
        </div>

        {/* Controles de Vista Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
            title="Alejar"
          >
            <ZoomOut size={13} />
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 42, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
            title="Acercar"
          >
            <ZoomIn size={13} />
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            title="Restablecer vista"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Área del Lienzo SVG con Estilo Oficial Automatarium */}
      <div 
        id="automatarium-graph"
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#1B1B1B',
          backgroundImage: 'radial-gradient(#333333 12.5%, #1B1B1B 12.5%)',
          backgroundSize: '16px 16px',
          cursor: selectedTool === 'hand' ? 'grab' : selectedTool === 'state' ? 'cell' : selectedTool === 'transition' ? 'crosshair' : 'default',
          overflow: 'hidden'
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* BARRA DE HERRAMIENTAS FLOTANTE LATERAL IZQUIERDA (Estilo Automatarium) */}
        {!readOnly && (
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            background: '#242424',
            padding: 4,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #3E3E3E',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            zIndex: 20
          }}>
            <button
              type="button"
              className={`tool-btn ${selectedTool === 'cursor' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setSelectedTool('cursor'); setConnectingFromId(null) }}
              title="Cursor / Seleccionar (V)"
            >
              <MousePointer2 size={18} />
            </button>
            <button
              type="button"
              className={`tool-btn ${selectedTool === 'hand' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setSelectedTool('hand'); setConnectingFromId(null) }}
              title="Mover lienzo / Mano (H)"
            >
              <Hand size={18} />
            </button>
            <button
              type="button"
              className={`tool-btn ${selectedTool === 'state' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setSelectedTool('state'); setConnectingFromId(null) }}
              title="Crear Estado (S)"
            >
              <Circle size={18} />
            </button>
            <button
              type="button"
              className={`tool-btn ${selectedTool === 'transition' ? 'active' : ''}`}
              onClick={(e) => { 
                e.stopPropagation()
                setSelectedTool('transition')
                if (selectedStateId !== null) setConnectingFromId(selectedStateId)
              }}
              title="Crear Transición (T)"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        )}

        {/* SVG Drawing Canvas */}
        <svg
          id="automatarium-graph"
          ref={svgRef}
          style={{ width: '100%', height: '100%', userSelect: 'none' }}
        >
          <defs>
            {/* Marcadores de flecha estándar y seleccionado */}
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 7 4, 0 7" fill="hsl(var(--primary-h), 85%, 93%)" />
            </marker>

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
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 1. Transiciones con Curvas Bezier */}
            {grouped.map(gt => {
              const geom = calculateTransitionGeometry(gt)
              const hasSelected = gt.transitions.some(t => t.id === selectedTransId)

              return (
                <g key={`${gt.fromId}->${gt.toId}`}>
                  {/* Detección de clic gruesa */}
                  <path
                    d={geom.pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                    onClick={(e) => {
                      if (readOnly) return
                      e.stopPropagation()
                      setSelectedTransId(gt.transitions[0].id)
                      setSelectedStateId(null)
                      setEditingTransition(gt.transitions[0])
                      setNewTransRead(gt.transitions.map(t => t.read).join(', '))
                    }}
                  />

                  {/* Línea visible de transición */}
                  <path
                    d={geom.pathD}
                    fill="none"
                    stroke={hasSelected ? 'var(--primary)' : 'hsl(var(--primary-h), 85%, 93%)'}
                    strokeWidth={hasSelected ? '2.8' : '2'}
                    markerEnd={hasSelected ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  />

                  {/* Rotulación / Etiqueta del arco */}
                  <g
                    transform={`translate(${geom.labelPos.x}, ${geom.labelPos.y})`}
                    style={{ cursor: readOnly ? 'default' : 'pointer' }}
                    onClick={(e) => {
                      if (readOnly) return
                      e.stopPropagation()
                      setSelectedTransId(gt.transitions[0].id)
                      setEditingTransition(gt.transitions[0])
                      setNewTransRead(gt.transitions.map(t => t.read).join(', '))
                    }}
                  >
                    <rect
                      x="-14"
                      y="-11"
                      width={Math.max(28, gt.transitions.map(t => t.read).join(', ').length * 8 + 14)}
                      height="22"
                      rx="4"
                      fill="#1E1E1E"
                      stroke={hasSelected ? 'var(--primary)' : '#444444'}
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={hasSelected ? 'var(--primary)' : 'hsl(var(--primary-h), 85%, 93%)'}
                      fontSize="13"
                      fontFamily="var(--font-mono)"
                      fontWeight="500"
                    >
                      {gt.transitions.map(t => t.read).join(', ')}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* 2. Estados con Estilo Oficial Automatarium */}
            {graph.states.map(state => {
              const isInitial = graph.initialState === state.id
              const isSelected = selectedStateId === state.id
              const isActiveSimulation = activeStateId === state.id
              const isConnectOrigin = connectingFromId === state.id

              return (
                <g
                  key={state.id}
                  transform={`translate(${state.x}, ${state.y})`}
                  style={{ cursor: selectedTool === 'cursor' ? 'grab' : 'pointer' }}
                  onMouseDown={(e) => handleMouseDownState(e, state)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedStateId(state.id)
                    setSelectedTransId(null)
                  }}
                >
                  {/* Flecha indicadora de Estado Inicial estilo Automatarium */}
                  {isInitial && (
                    <g transform={`translate(-${STATE_RADIUS + 24}, 0)`}>
                      <line
                        x1="0"
                        y1="0"
                        x2="16"
                        y2="0"
                        stroke="hsl(var(--primary-h), 85%, 93%)"
                        strokeWidth="2.5"
                      />
                      <polygon points="12 -5, 20 0, 12 5" fill="hsl(var(--primary-h), 85%, 93%)" />
                    </g>
                  )}

                  {/* Halo de selección */}
                  {(isSelected || isActiveSimulation || isConnectOrigin) && (
                    <circle
                      r={STATE_RADIUS + 7}
                      fill="none"
                      stroke={isActiveSimulation ? 'var(--success)' : 'var(--primary)'}
                      strokeWidth="2.5"
                      strokeDasharray={isConnectOrigin ? '4 3' : 'none'}
                    />
                  )}

                  {/* Círculo Principal con Color Oficial de Estado */}
                  <circle
                    r={STATE_RADIUS}
                    fill={isActiveSimulation ? 'hsl(var(--success-h), 50%, 25%)' : isSelected ? 'var(--state-bg-selected)' : 'var(--state-bg)'}
                    stroke="var(--stroke)"
                    strokeWidth="2.5"
                  />

                  {/* Círculo concéntrico de estado final */}
                  {state.isFinal && (
                    <circle
                      r={STATE_RADIUS - 6}
                      fill="none"
                      stroke="var(--stroke)"
                      strokeWidth="2"
                    />
                  )}

                  {/* Nombre del Estado en Fira Code */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--stroke)"
                    fontSize="15"
                    fontWeight="600"
                    fontFamily="var(--font-mono)"
                  >
                    {state.name || `q${state.id}`}
                  </text>

                  {/* Token de Diagrama Léxico debajo del estado */}
                  {isLexerMode && state.isFinal && state.token && (
                    <g transform={`translate(0, ${STATE_RADIUS + 18})`}>
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="20"
                        rx="4"
                        fill="#111"
                        stroke="var(--cyan)"
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="var(--cyan)"
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

        {/* Panel Inspector de Propiedades del Estado Seleccionado */}
        {selectedState && !readOnly && (
          <div 
            className="automatarium-card"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              width: 320,
              padding: 16,
              zIndex: 30
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-header)' }}>
                Estado: {selectedState.name || `q${selectedState.id}`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>ID #{selectedState.id}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                  onClick={() => setSelectedStateId(null)}
                  title="Cerrar panel de propiedades"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Nombre del Estado:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  value={selectedState.name}
                  onChange={(e) => updateSelectedStateProps({ name: e.target.value })}
                />
              </div>

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
                  <CheckCircle2 size={13} /> {selectedState.isFinal ? 'Final ✓' : 'Hacer Final'}
                </button>
              </div>

              {isLexerMode && selectedState.isFinal && (
                <div style={{ padding: '10px', background: '#191919', borderRadius: 'var(--radius-sm)', border: '1px solid #333' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--cyan)', display: 'block', marginBottom: 4 }}>
                    Token retornado:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginBottom: 8 }}
                    value={selectedState.token || ''}
                    placeholder="ej. TOKEN_ID"
                    onChange={(e) => updateSelectedStateProps({ token: e.target.value.toUpperCase() })}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedState.retract || false}
                        onChange={(e) => updateSelectedStateProps({ retract: e.target.checked })}
                      />
                      <span>Retraer cursor 1 carácter (<strong>*</strong>)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedState.installSymbolTable || false}
                        onChange={(e) => updateSelectedStateProps({ installSymbolTable: e.target.checked })}
                      />
                      <span>Instalar en Tabla de Símbolos</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para editar símbolo de la transición */}
      {editingTransition && !readOnly && (
        <div className="modal-overlay" onClick={() => setEditingTransition(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, fontSize: '1.1rem', fontFamily: 'var(--font-header)' }}>Símbolo de la Transición</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              {isLexerMode 
                ? 'Escribe símbolos, rangos como [a-zA-Z], [0-9], o escribe "otro" para la rama default.' 
                : 'Escribe el símbolo o lista de símbolos separados por comas (ej. 0, 1).'}
            </p>
            <input
              type="text"
              className="form-input"
              style={{ fontFamily: 'var(--font-mono)' }}
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
