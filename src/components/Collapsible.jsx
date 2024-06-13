import React, { useState } from "react";
import { defaultSliders } from "../utils/defaultSliderValues";
import "../App.css";

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
      <button onClick={handleClick} className="default-button">
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
