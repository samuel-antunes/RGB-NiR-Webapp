import React, { useState } from "react";
import { defaultSliders } from "../utils/defaultSliderValues";

const Collapsible = ({
  children,
  title,
  openTool,
  setOpenTool,
  setSliderValues,
  type,
  resetCanvas,
  resetAdditionalSliders,
}) => {
  // Only display if this is openTool
  const isOpen = openTool === title;
  const [hover, setHover] = useState(false);

  const handleClick = () => {
    if (openTool === title) {
      // reset states
      setOpenTool("");
      setSliderValues(defaultSliders[type]);
      resetCanvas();
      resetAdditionalSliders();
    } else {
      setOpenTool(title);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <button
        onClick={handleClick}
        style={{
          width: "100%",
          padding: "10px",
          textAlign: "left",
          backgroundColor: !hover ? "#f0f0f0" : "#e9e9e9",
          border: "none",
          cursor: "pointer",
          outline: "none",
          borderBottom: "1px solid #ccc",
          transition: "background-color 0.3s ease",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {title}{" "}
        <span
          style={{
            float: "right",
            transition: "transform 0.3s ease",
            transform: isOpen ? "rotate(0deg)" : "rotate(180deg)",
          }}
        >
          ▼
        </span>
      </button>
      <div
        style={{
          overflowY: "scroll",
          overflowX: "hidden",
          transition: "max-height 0.3s ease",
          maxHeight: isOpen ? "40vh" : "0",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Collapsible;
