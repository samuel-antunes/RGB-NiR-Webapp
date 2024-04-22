const Slider = ({ label, value, onChange, onMouseUp }) => {
  return (
    <div
      style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}
    >
      <div style={{ width: "50px", marginRight: "10px" }}>{label}</div>
      <input
        type="range"
        value={value}
        onChange={onChange}
        onMouseUp={onMouseUp}
        min={label === "radius" ? "1" : label === "epsilon" ? "0.01" : "0"}
        max={label === "radius" ? "15" : label === "epsilon" ? "0.1" : "100"}
        step={label === "epsilon" ? "0.01" : "1"}
        style={{ color: "blue", width: "100%" }}
      />
    </div>
  );
};

export default Slider;
