import ColorPalette from "./ColorPalette";

const ControlPanel = ({
  selectedColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  onClear,
}) => {
  return (
    <div className="control-panel">
      <div>
        <div className="panel-section">
          <h4>COLORS</h4>
          <ColorPalette
            selectedColor={selectedColor}
            onColorChange={onColorChange}
          />
        </div>

        <div className="panel-section">
          <h4>THICKNESS</h4>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          />
          <p>{brushSize}px</p>
        </div>

        <div className="panel-section">
          <h4>GLOW</h4>
          <input type="range" min="0" max="100" defaultValue="60" />
          <p>60%</p>
        </div>
      </div>

      <div className="panel-actions">
        <button title="Undo">↶</button>
        <button title="Clear" onClick={onClear}>🗑</button>
        <button title="Eraser">🧽</button>
        <button title="Save">⇩</button>
      </div>
    </div>
  );
};

export default ControlPanel;