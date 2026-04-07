const StatusBadge = ({ mode }) => {
  const getIcon = () => {
    if (mode === "DRAWING") return "☝️";
    if (mode === "ERASING") return "🖐️";
    if (mode === "MOVING") return "🤏";
    if (mode === "IDLE") return "✊";
    if (mode === "READY") return "🖐️";
    if (mode === "ERROR") return "⚠️";
    return "✨";
  };

  return (
    <div className="status-badge">
      <span className="status-icon">{getIcon()}</span>
      <span>{mode}</span>
    </div>
  );
};

export default StatusBadge;