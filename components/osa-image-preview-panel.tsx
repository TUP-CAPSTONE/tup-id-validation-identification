"use client"

import { useState, useRef, useEffect } from "react"
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  image: string
  title: string
  onClose: () => void
  /** If true, removes fixed positioning so it can be placed inside a flex container */
  staticPosition?: boolean
}

export function ImagePreviewPanel({
  open,
  image,
  title,
  onClose,
  staticPosition = false,
}: Props) {
  // --- STATE FOR ZOOM/PAN/ROTATE ---
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)

  // Reset transforms when the image changes
  useEffect(() => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }, [image])

  if (!open) return null

  const titleMap: Record<string, string> = {
    idPicture: "TUP ID",
    corFile: "COR",
    left: "Left Selfie",
    front: "Front Selfie",
    back: "Back Selfie",
    "TUP ID": "TUP ID",
    COR: "COR",
  }

  const displayTitle = titleMap[title] || title

  // --- HANDLERS ---

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4)) // Max zoom 4x
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1)) // Min zoom 1x
    if (scale <= 1.5) setPosition({ x: 0, y: 0 }) // Reset position if zoomed out
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleReset = () => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  // Drag Logic
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return // Only allow drag if zoomed in
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const onMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className={cn(
        // Base styles
        "rounded-xl border bg-background shadow-2xl p-4 flex flex-col min-w-75 max-w-100",
        // Conditional Positioning
        staticPosition
          ? "h-fit max-h-[85vh]"
          : "fixed top-1/2 -translate-y-1/2 z-9999 max-h-[85vh]"
      )}
      style={
        !staticPosition
          ? { left: `calc(50% + 300px)` }
          : undefined
      }
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3 border-b pb-2">
        <h3 className="text-sm font-bold uppercase tracking-tight">
          {displayTitle}
        </h3>

        {/* ❌ PANEL CLOSE */}
        <button
          type="button"
          aria-label="Close preview"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <ToolBtn onClick={handleZoomOut} icon={<ZoomOut size={14} />} disabled={scale <= 1} />
        <span className="text-xs font-mono w-8 text-center">{Math.round(scale * 100)}%</span>
        <ToolBtn onClick={handleZoomIn} icon={<ZoomIn size={14} />} disabled={scale >= 4} />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={handleRotate} icon={<RotateCw size={14} />} />
        <ToolBtn onClick={handleReset} icon={<RefreshCcw size={14} />} title="Reset" />
      </div>

      {/* IMAGE VIEWPORT */}
      <div
        ref={containerRef}
        className={cn(
          "relative rounded-lg overflow-hidden bg-slate-100 border shadow-inner flex items-center justify-center min-h-75 h-[50vh]",
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={displayTitle}
          draggable={false} // Prevent browser native drag
          style={{
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.2s ease-out", // Smooth zoom, instant drag
          }}
          className="max-w-full max-h-full object-contain select-none"
        />
      </div>
    </div>
  )
}

// Helper for toolbar buttons
function ToolBtn({
  onClick,
  icon,
  disabled,
  title,
}: {
  onClick: () => void
  icon: React.ReactNode
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
    </button>
  )
}