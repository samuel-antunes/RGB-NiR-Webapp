import React from "react";
import Slider from "./Slider";
import { defaultSliders } from "../utils/defaultSliderValues";

const Sliders = ({
  type,
  sliderValues,
  setSliderValues,
  applyEdit,
  finalizeEdit,
  additionalFiles,
  additionalFilesSliders,
  setAdditionalFilesSliders,
  resetCanvas,
  resetAdditionalSliders,
}) => {
  // handle changes for any slider
  const handleSliderChange = (output, input, value) => {
    setSliderValues((prevValues) => ({
      ...prevValues,
      [output]: { ...prevValues[output], [input]: value },
    }));
  };

  const handleAdditionalSliderChange = (output, imgType, value) => {
    setAdditionalFilesSliders((prevValues) => ({
      ...prevValues,
      [type]: {
        ...additionalFilesSliders[type],
        [imgType]: {
          ...additionalFilesSliders[type][imgType],
          [output]: value,
        },
      },
    }));
  };

  // load default values based on type of slider
  const handleReset = () => {
    setSliderValues(defaultSliders[type]);
    resetCanvas();
    resetAdditionalSliders();
  };

  return (
    <div
      style={{ padding: "10px", color: "#efefef", backgroundColor: "#484848" }}
    >
      <label></label>
      {Object.keys(sliderValues).map((output) => (
        <div key={output}>
          <div style={{ marginBottom: "10px" }}>
            {type === "linearCombination"
              ? "Output "
              : type === "XYZColoring"
              ? "Input "
              : ""}
            {output.charAt(0).toUpperCase() + output.slice(1)}:
          </div>
          {type !== "Filtering" ? (
            additionalFiles.map((additionalFile, index) => {
              return (
                <Slider
                  key={additionalFile.type + index}
                  label={`${additionalFile.type}`}
                  value={
                    additionalFilesSliders[type][additionalFile.type]
                      ? additionalFilesSliders[type][additionalFile.type][
                          output
                        ]
                      : ""
                  }
                  onChange={(e) => {
                    handleAdditionalSliderChange(
                      output,
                      additionalFile.type,
                      parseFloat(e.target.value)
                    );
                  }}
                  onMouseUp={() => applyEdit()}
                />
              );
            })
          ) : (
            <></>
          )}

          {Object.keys(sliderValues[output]).map((input) => (
            <Slider
              key={`${output}-${input}`}
              label={`${input}`}
              value={sliderValues[output][input]}
              onChange={(e) =>
                handleSliderChange(output, input, parseFloat(e.target.value))
              }
              onMouseUp={() => applyEdit()}
            />
          ))}
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "row" }}>
        <button onClick={handleReset} className="default-button">
          Reset Values
        </button>
        <button onClick={() => finalizeEdit(type)} className="default-button">
          Apply edit
        </button>
      </div>
    </div>
  );
};

export default Sliders;
