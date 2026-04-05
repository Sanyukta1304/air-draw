const GestureCard = ({ icon, title, desc }) => {
  return (
    <div className="gesture-card">
      <div className="gesture-icon">{icon}</div>
      <div className="gesture-text">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  );
};

export default GestureCard;