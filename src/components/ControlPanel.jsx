import ColorPalette from "./ColorPalette";

const ControlPanel = ({
  selectedColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  glowValue = 60,
  onGlowChange,
  onClear,
  onSave,
  onUndo,
  backgroundMode,
  onToggleBackground,
}) => {
  return (
    <div className="control-panel">
      <div className="panel-top">
        <div className="panel-section">
          <h4>COLORS</h4>
          <ColorPalette
            selectedColor={selectedColor}
            onColorChange={onColorChange}
          />
        </div>

        <div className="panel-section">
          <h4>THICKNESS</h4>
          <div className="vertical-slider-wrap">
            <input
              className="vertical-slider"
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            />
          </div>
          <p>{brushSize}px</p>
        </div>

        <div className="panel-divider"></div>

        <div className="panel-section">
          <h4>GLOW</h4>
          <div className="vertical-slider-wrap">
            <input
              className="vertical-slider"
              type="range"
              min="0"
              max="100"
              value={glowValue}
              onChange={(e) => onGlowChange(Number(e.target.value))}
            />
          </div>
          <p>{glowValue}%</p>
        </div>

        <div className="panel-divider"></div>
      </div>

      <div className="panel-actions">
        <button title="Undo" onClick={onUndo} type="button">
          ↶
        </button>

        <button title="Clear" onClick={onClear} type="button">
          🗑
        </button>

        <button
          title="Toggle Background"
          className="active-tool"
          type="button"
          onClick={onToggleBackground}
        >
          {backgroundMode === "blackboard" ? "⬛" : "☺"}
        </button>

        <button title="Save" onClick={onSave} type="button">
          ⇩
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;