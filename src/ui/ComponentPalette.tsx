import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { COMPONENTS, ComponentKey } from "../sim";

interface ComponentPaletteProps {
  onDragStart: (key: ComponentKey, position: { x: number; y: number }) => void;
  draggingComponent: ComponentKey | null;
}

interface ContextMenuState {
  key: ComponentKey;
  x: number;
  y: number;
}

export const ComponentPalette = ({ onDragStart, draggingComponent }: ComponentPaletteProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, [contextMenu]);

  const handleContextMenu = (event: ReactMouseEvent, key: ComponentKey) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setContextMenu({
      key,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  const handlePointerDown = (event: ReactPointerEvent, key: ComponentKey) => {
    if (event.button !== 0) return;
    event.preventDefault();
    onDragStart(key, { x: event.clientX, y: event.clientY });
  };

  return (
    <div className="panel component-palette" ref={containerRef}>
      <div className="palette-header">
        <div>
          <strong>Component Palette</strong>
        </div>
        <div className="small">Drag into the scene or right-click for options.</div>
      </div>
      <div className="palette-grid">
        {Object.values(COMPONENTS).map((component) => (
          <div
            key={component.key}
            className={`palette-card${draggingComponent === component.key ? " is-dragging" : ""}`}
            onPointerDown={(event) => handlePointerDown(event, component.key)}
            onContextMenu={(event) => handleContextMenu(event, component.key)}
            role="button"
            tabIndex={0}
          >
            <div className="palette-title">{component.name}</div>
            <div className="palette-meta">Base {component.baseCapacity} RPS</div>
          </div>
        ))}
      </div>
      {contextMenu && (
        <div
          className="palette-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="palette-menu-title">{COMPONENTS[contextMenu.key].name}</div>
          <button type="button">Configure</button>
          <button type="button">Duplicate</button>
          <button type="button">Details</button>
        </div>
      )}
    </div>
  );
};
