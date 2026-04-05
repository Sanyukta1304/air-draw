const StatusBadge = ({ mode }) => {
  return (
    <div className="status-badge">
      <span className="status-icon">☝️</span>
      <span>{mode}</span>
    </div>
  );
};

export default StatusBadge;