const colors = [
  "#00e5ff",
  "#ff00d4",
  "#39ff14",
  "#4d6dff",
  "#ff2d75",
  "#ffd600",
  "#a100ff",
  "#ffffff",
];

const ColorPalette = ({ selectedColor, onColorChange }) => {
  return (
    <div className="color-palette">
      {colors.map((color, index) => (
        <button
          key={index}
          className={`color-dot ${selectedColor === color ? "active-color" : ""}`}
          style={{ backgroundColor: color }}
          onClick={() => onColorChange(color)}
        />
      ))}
    </div>
  );
};

export default ColorPalette;