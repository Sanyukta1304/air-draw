const colors = [
  "#19e6ff",
  "#ff00d4",
  "#39ff14",
  "#5a73ff",
  "#ff2d75",
  "#ffd600",
  "#a100ff",
  "#ffffff",
];

const ColorPalette = ({ selectedColor, onColorChange }) => {
  return (
    <div className="color-palette">
      {colors.map((color) => (
        <button
          key={color}
          className={`color-dot ${selectedColor === color ? "active-color" : ""}`}
          style={{ backgroundColor: color }}
          onClick={() => onColorChange(color)}
          type="button"
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
};

export default ColorPalette;