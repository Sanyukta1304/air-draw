const GestureCard = ({ icon, title, desc }) => {
  return (
    <div className="gesture-card">
      <div className="icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
};

export default GestureCard;