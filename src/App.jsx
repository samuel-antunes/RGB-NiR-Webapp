import { useState, useEffect, useRef } from "react";
import FileUpload, { drawImageOnCanvas } from "./components/FileUpload";
import Collapsible from "./components/Collapsible";
import convert from "color-convert";
import Sliders from "./components/Sliders";
import {
  defaultFalseColoring,
  defaultFilter,
  defaultHSVColoring,
  defaultLABColoring,
  defaultSliders,
  defaultXYZColoring,
} from "./utils/defaultSliderValues";

const App = () => {
  // arrays to track additional files and canvasRefs
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [additionalCanvasRefs, setAdditionalCanvasRefs] = useState([]);
  const [additionalFilesSliders, setAdditionalFilesSliders] = useState({
    linearCombination: {},
    XYZColoring: {},
    HSVColoring: {},
    LABColoring: {},
  });
  // track openTool to only expand one collapsible element
  const [openTool, setOpenTool] = useState("");

  // state to display loading hi-res image editing
  const [displayLoading, setDisplayLoading] = useState(false);

  // Initial values for sliders (all from rgb image)
  const [sliderValuesFalseColoring, setSliderValuesFalseColoring] =
    useState(defaultFalseColoring);

  // Initial values for sliders (all from hsv image)
  const [sliderValuesHSVColoring, setSliderValuesHSVColoring] =
    useState(defaultHSVColoring);

  // Initial values for sliders (all from lab image)
  const [sliderValuesLAB, setSliderValuesLAB] = useState(defaultLABColoring);

  // Initial values for sliders(filtering components)
  const [filterSettings, setFilterSettings] = useState(defaultFilter);

  // Initial values for sliders(traditional xyz transform matrix)
  const [XYZSliders, setXYZSliders] = useState(defaultXYZColoring);

  // Keeping history for undo/redo and hi-res editing
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // states to track original files
  const [rgbFile, setRgbFile] = useState(null);
  const [nirFile, setNirFile] = useState(null);

  // pointers to the canvases
  const nirCanvasRef = useRef(null);
  const rgbCanvasRef = useRef(null);
  const resultCanvasRef = useRef(null);
  const previewChangeRef = useRef(null);

  const resetAdditionalSliders = () => {
    setAdditionalFilesSliders((prevValues) => {
      let newSliders = {
        linearCombination: {},
        XYZColoring: {},
        HSVColoring: {},
        LABColoring: {},
      };
      additionalFiles
        .map((file) => file.type)
        .forEach((type) => {
          newSliders.linearCombination = {
            ...newSliders.linearCombination,
            [type]: { red: 0, green: 0, blue: 0 },
          };
          newSliders.XYZColoring = {
            ...newSliders.XYZColoring,
            [type]: { X: 0, Y: 0, Z: 0 },
          };
          newSliders.HSVColoring = {
            ...newSliders.HSVColoring,
            [type]: { values: 0 },
          };
          newSliders.LABColoring = {
            ...newSliders.LABColoring,
            [type]: { values: 0 },
          };
        });

      return newSliders;
    });
  };

  // undo function
  const handleUndo = () => {
    // return if index at the start
    if (currentHistoryIndex === -1) return;

    setCurrentHistoryIndex(currentHistoryIndex - 1);

    if (currentHistoryIndex === 0) {
      // return to original image
      copyCanvasData(rgbCanvasRef, resultCanvasRef);
    } else {
      // return to previous change
      const resultCanvas = resultCanvasRef.current;
      const resultCtx = resultCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      resultCtx.putImageData(history[currentHistoryIndex - 1].resultData, 0, 0);
    }

    copyCanvasData(resultCanvasRef, previewChangeRef);
  };

  // redo function
  const handleRedo = () => {
    // return if index at the end
    if (currentHistoryIndex === history.length - 1) return;
    // repaint next change
    setCurrentHistoryIndex(currentHistoryIndex + 1);
    const resultCanvas = resultCanvasRef.current;
    const resultCtx = resultCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    resultCtx.putImageData(history[currentHistoryIndex + 1].resultData, 0, 0);
    copyCanvasData(resultCanvasRef, previewChangeRef);
  };

  const add = (partialSum, a) => partialSum + a;

  // helper function to copy data from canvas
  const copyCanvasData = (sourceRef, destinationRef) => {
    const sourceCanvas = sourceRef.current ? sourceRef.current : sourceRef;
    const destinationCanvas = destinationRef.current;

    const sourceCtx = sourceCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const destinationCtx = destinationCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    const { width, height } = sourceCanvas;

    destinationCanvas.width = width;
    destinationCanvas.height = height;

    const sourceData = sourceCtx.getImageData(0, 0, width, height);

    destinationCtx.putImageData(sourceData, 0, 0);
    const aspectRatio = height / width;
    const displayWidth =
      aspectRatio > 1.3 ? window.innerWidth * 0.6 : window.innerWidth * 0.4;
    const displayHeight = displayWidth * aspectRatio;

    destinationCanvas.style.width = `${displayWidth}px`;
    destinationCanvas.style.height = `${displayHeight}px`;
  };

  // Initializes both result and preview canvas to rgb data
  const initCanvases = () => {
    copyCanvasData(rgbCanvasRef, resultCanvasRef);
    copyCanvasData(rgbCanvasRef, previewChangeRef);
  };

  // edits to downsampled preview version
  const previewEdit = (editType) => {
    if (!nirFile || !rgbFile) return;

    // getting canvases
    const nirCanvas = nirCanvasRef.current;
    const resultCanvas = resultCanvasRef.current;
    const previewCanvas = previewChangeRef.current;

    // quit if one is not initialized
    if (!nirCanvas || !resultCanvas || !previewCanvas) return;

    // getting the ctxs with willReadFrequently to speed up next reads
    const nirCtx = nirCanvas.getContext("2d", { willReadFrequently: true });
    const resultCtx = resultCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const previewCtx = previewCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    // copying dimensions
    const { width, height } = resultCanvas;

    previewCanvas.width = width;
    previewCanvas.height = height;

    // getting actual data
    const nirData = nirCtx.getImageData(0, 0, width, height);
    let resultData = resultCtx.getImageData(0, 0, width, height);
    let previewData = previewCtx.createImageData(width, height);

    const additionalCtxs = additionalCanvasRefs.map((canvas) =>
      canvas.getContext("2d", { willReadFrequently: true })
    );
    const additionalData = additionalCtxs.map((ctx, index) =>
      ctx.getImageData(
        0,
        0,
        additionalCanvasRefs[index].width,
        additionalCanvasRefs[index].height
      )
    );

    // applying the chosen edit
    if (editType === "linearCombination") {
      previewData = applyLinearCombination(
        resultData,
        nirData,
        resultData,
        sliderValuesFalseColoring,
        additionalFilesSliders[editType],
        additionalData
      );
    } else if (editType === "HSVColoring") {
      previewData = applyHSVColoring(
        resultData,
        nirData,
        resultData,
        sliderValuesHSVColoring,
        additionalFilesSliders[editType],
        additionalData
      );
    } else if (editType === "LABColoring") {
      previewData = applyLABColoring(
        resultData,
        nirData,
        resultData,
        sliderValuesLAB,
        additionalFilesSliders[editType],
        additionalData
      );
    } else if (editType === "Filtering") {
      previewData = applyGuidedFilter(resultData, nirData, filterSettings);
    } else if (editType === "XYZColoring") {
      previewData = applyXYZ(
        resultData,
        nirData,
        resultData,
        XYZSliders,
        additionalFilesSliders[editType],
        additionalData
      );
    }

    // putting result to display with appropriate size
    previewCtx.putImageData(previewData, 0, 0);

    const aspectRatio = height / width;
    const displayWidth =
      aspectRatio > 1.3 ? window.innerWidth * 0.6 : window.innerWidth * 0.4;
    const displayHeight = displayWidth * aspectRatio;

    previewCanvas.style.width = `${displayWidth}px`;
    previewCanvas.style.height = `${displayHeight}px`;
  };

  // Function to apply false coloring linar combination
  const applyLinearCombination = (
    rgbData,
    nirData,
    resultData,
    sliderValues,
    additionalFilesSliders,
    additionalData
  ) => {
    console.log("starting to blend");

    // performing linear combination
    for (let i = 0; i < rgbData.data.length; i += 4) {
      const nirIntensity = nirData.data[i];
      const additionalIntensity = additionalData.map((data) => {
        return data.data[i];
      });
      Object.keys(sliderValuesFalseColoring).forEach((color, index) => {
        const nirContribution = sliderValues[color].NiR / 100;
        const redContribution = sliderValues[color]["Red"] / 100;
        const greenContribution = sliderValues[color]["Green"] / 100;
        const blueContribution = sliderValues[color]["Blue"] / 100;

        const contributions = Object.keys(additionalFilesSliders).map(
          (imgType) => additionalFilesSliders[imgType][color] / 100
        );
        // reference: https://stackoverflow.com/questions/1230233/how-to-find-the-sum-of-an-array-of-numbers
        resultData.data[i + index] =
          rgbData.data[i] * redContribution +
          rgbData.data[i + 1] * greenContribution +
          rgbData.data[i + 2] * blueContribution +
          nirIntensity * nirContribution +
          additionalIntensity
            .map((intensity, index) => intensity * contributions[index])
            .reduce(add, 0);
      });
      // alpha to full value
      resultData.data[i + 3] = 255;
    }

    console.log("finished blending");

    return resultData;
  };

  // function to apply hsv blending
  const applyHSVColoring = (
    rgbData,
    nirData,
    resultData,
    sliderValues,
    additionalFilesSliders,
    additionalData
  ) => {
    console.log("HSV coloring");
    const nirContribution = sliderValues.values["NiR"] / 100;
    const valuesContribution = sliderValues.values["V"] / 100;
    const contributions = Object.keys(additionalFilesSliders).map(
      (imgType) => additionalFilesSliders[imgType].values / 100
    );

    // convert RGB to HSV / perform linear combination / convert HSV to RGB
    for (let i = 0; i < rgbData.data.length; i += 4) {
      const nirIntensity = nirData.data[i];
      const additionalIntensity = additionalData.map((data) => {
        return data.data[i];
      });

      const [h, s, v1] = RGB2HSV(
        rgbData.data[i],
        rgbData.data[i + 1],
        rgbData.data[i + 2]
      );
      let v2 = nirIntensity * nirContribution + v1 * valuesContribution;

      // reference: https://stackoverflow.com/questions/1230233/how-to-find-the-sum-of-an-array-of-numbers
      v2 += additionalIntensity
        .map((intensity, index) => intensity * contributions[index])
        .reduce(add, 0);
      const [r, g, b] = HSV2RGB(h, s, v2);

      resultData.data[i] = r;
      resultData.data[i + 1] = g;
      resultData.data[i + 2] = b;
      // alpha to full value
      resultData.data[i + 3] = 255;
    }
    console.log("finished values");

    return resultData;
  };

  // function to apply lab blending
  const applyLABColoring = (
    rgbData,
    nirData,
    resultData,
    sliderValues,
    additionalFilesSliders,
    additionalData
  ) => {
    console.log("LAB coloring");
    const nirContribution = sliderValues.values["NiR"] / 100;
    const lightnessContribution = sliderValues.values["L"] / 100;
    const contributions = Object.keys(additionalFilesSliders).map(
      (imgType) => additionalFilesSliders[imgType].values / 100
    );

    // convert RGB to HSV / perform linear combination / convert HSV to RGB
    for (let i = 0; i < rgbData.data.length; i += 4) {
      const nirIntensity = nirData.data[i];
      const additionalIntensity = additionalData.map((data) => {
        return data.data[i];
      });

      const [l1, a1, b1] = RGB2LAB(
        rgbData.data[i],
        rgbData.data[i + 1],
        rgbData.data[i + 2]
      );
      let l2 = nirIntensity * nirContribution + l1 * lightnessContribution;
      l2 += additionalIntensity
        .map((intensity, index) => intensity * contributions[index])
        .reduce(add, 0);
      const [r, g, b] = LAB2RGB(l2, a1, b1);

      resultData.data[i] = r;
      resultData.data[i + 1] = g;
      resultData.data[i + 2] = b;
      // alpha to full value
      resultData.data[i + 3] = 255;
    }
    console.log("finished LAB");

    return resultData;
  };

  // function to apply XYZ coloring
  const applyXYZ = (
    rgbData,
    nirData,
    resultData,
    sliderValues,
    additionalFilesSliders,
    additionalData
  ) => {
    console.log("applying xyz coloring");
    for (let i = 0; i < rgbData.data.length; i += 4) {
      const nirIntensity = nirData.data[i];
      const additionalIntensity = additionalData.map((data) => {
        return data.data[i];
      });
      // reference: https://www.npmjs.com/package/color-convert?activeTab=code
      const [r, g, b] = [
        (rgbData.data[i] / 255 + 0.055 / 1.055) ** 2.4,
        (rgbData.data[i + 1] / 255 + 0.055 / 1.055) ** 2.4,
        (rgbData.data[i + 2] / 255 + 0.055 / 1.055) ** 2.4,
      ];

      const newNiR = (nirIntensity / 255 + 0.055 / 1.055) ** 2.4;
      const newIntensities = additionalIntensity.map(
        (intensity) => (intensity / 255 + 0.055 / 1.055) ** 2.4
      );

      let [x, y, z] = [0, 0, 0];
      Object.keys(XYZSliders).forEach((color) => {
        const nirContribution = sliderValues[color].NiR / 100;
        const redContribution = sliderValues[color]["Red"] / 100;
        const greenContribution = sliderValues[color]["Green"] / 100;
        const blueContribution = sliderValues[color]["Blue"] / 100;
        const contributions = Object.keys(additionalFilesSliders).map(
          (imgType) => additionalFilesSliders[imgType][color] / 100
        );
        const newVal =
          (100 *
            (r * redContribution +
              g * greenContribution +
              b * blueContribution +
              newNiR * nirContribution +
              newIntensities
                .map((intensity, index) => intensity * contributions[index])
                .reduce(add, 0))) /
          (redContribution +
            greenContribution +
            blueContribution +
            nirContribution +
            contributions.reduce(add, 0));
        if (color == "X") {
          x = newVal;
        }
        if (color == "Y") {
          y = newVal;
        }
        if (color == "Z") {
          z = newVal;
        }
      });

      const [newR, newG, newB] = convert.xyz.rgb([x, y, z]);

      resultData.data[i] = newR;
      resultData.data[i + 1] = newG;
      resultData.data[i + 2] = newB;

      // alpha to full value
      resultData.data[i + 3] = 255;
    }

    console.log("finished xyz coloring");

    return resultData;
  };

  // RGB to HSV conversion
  const RGB2HSV = (r, g, b) => {
    return convert.rgb.hsv([r, g, b]);
  };

  // HSV to RGB conversion
  const HSV2RGB = (h, s, v) => {
    return convert.hsv.rgb([h, s, v]);
  };

  // RGB to LAB conversion
  const RGB2LAB = (r, g, b) => {
    return convert.rgb.lab([r, g, b]);
  };

  // LAB to RGB converison
  const LAB2RGB = (l, a, b) => {
    return convert.lab.rgb([l, a, b]);
  };

  // Convert imageData to a matrix representation, handling single and three-channel data
  function imageDataToMatrix(imageData, channels) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const matrix = new Array(height)
      .fill()
      .map(() =>
        new Array(width).fill().map(() => new Array(channels).fill(0))
      );

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < channels; c++) {
          matrix[y][x][c] = data[idx + c];
        }
      }
    }
    return matrix;
  }

  // Function that applies a box filter to a matrix
  function boxFilter(src, r, channels) {
    const width = src[0].length;
    const height = src.length;
    const output = new Array(height)
      .fill()
      .map(() =>
        new Array(width).fill().map(() => new Array(channels).fill(0))
      );
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = new Array(channels).fill(0);
        let count = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              for (let c = 0; c < channels; c++) {
                sum[c] += src[ny][nx][c];
              }
              count++;
            }
          }
        }
        for (let c = 0; c < channels; c++) {
          output[y][x][c] = sum[c] / count;
        }
      }
    }
    return output;
  }

  // Element-wise matrix subtraction
  function subtractMatrices(mat1, mat2, channels) {
    const height = mat1.length;
    const width = mat1[0].length;
    const result = new Array(height)
      .fill()
      .map(() =>
        new Array(width).fill().map(() => new Array(channels).fill(0))
      );
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          result[y][x][c] = mat1[y][x][c] - mat2[y][x][c];
        }
      }
    }
    return result;
  }

  // Channel-wise matrix multiplication
  function multiplyMatrices(mat1, mat2, channels) {
    const height = mat1.length;
    const width = mat1[0].length;
    const result = new Array(height)
      .fill()
      .map(() =>
        new Array(width).fill().map(() => new Array(channels).fill(0))
      );
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mat1[y][x].length !== channels && mat1[y][x].length === 1) {
          for (let c = 0; c < channels; c++) {
            result[y][x][c] = mat1[y][x][0] * mat2[y][x][c];
          }
        } else if (mat2[y][x].length !== channels && mat2[y][x].length === 1) {
          for (let c = 0; c < channels; c++) {
            result[y][x][c] = mat1[y][x][c] * mat2[y][x][0];
          }
        } else {
          for (let c = 0; c < channels; c++) {
            result[y][x][c] = mat1[y][x][c] * mat2[y][x][c];
          }
        }
      }
    }
    return result;
  }

  // Add value to all entries of a matrix
  function addToMatrix(mat, value, channels) {
    const height = mat.length;
    const width = mat[0].length;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          mat[y][x][c] += value;
        }
      }
    }
  }

  // function to apply guided filter
  function applyGuidedFilter(rgbData, nirData, sliderValues) {
    const { radius: r, epsilon: eps } = sliderValues.Settings;
    const channels = 3; // For RGB data
    const nir = imageDataToMatrix(nirData, 1);
    const rgb = imageDataToMatrix(rgbData, channels);

    const meanI = boxFilter(nir, r, 1);
    const meanP = boxFilter(rgb, r, channels);
    const meanII = boxFilter(multiplyMatrices(nir, nir, 1), r, 1);
    const meanIP = boxFilter(multiplyMatrices(nir, rgb, channels), r, channels);

    const varI = subtractMatrices(meanII, multiplyMatrices(meanI, meanI, 1), 1);
    const covIP = subtractMatrices(
      meanIP,
      multiplyMatrices(meanI, meanP, channels),
      channels
    );

    addToMatrix(varI, eps, 1);

    const a = divideMatrices(covIP, varI, channels);
    const b = subtractMatrices(
      meanP,
      multiplyMatrices(a, meanI, channels),
      channels
    );

    const meanA = boxFilter(a, r, channels);
    const meanB = boxFilter(b, r, channels);

    // Reconstruct the output
    const output = new ImageData(rgbData.width, rgbData.height);
    for (let y = 0; y < output.height; y++) {
      for (let x = 0; x < output.width; x++) {
        const index = (y * output.width + x) * 4;
        const I = nir[y][x][0];
        for (let c = 0; c < channels; c++) {
          const res = meanA[y][x][c] * I + meanB[y][x][c];
          output.data[index + c] = Math.min(Math.max(0, res), 255); // Clamp to [0, 255]
        }
        output.data[index + 3] = 255; // set alpha to full value
      }
    }
    return output;
  }

  // Element-wise division of two matrices, handling single and multi-channel data
  function divideMatrices(mat1, mat2, channels) {
    const height = mat1.length;
    const width = mat1[0].length;
    const result = new Array(height)
      .fill()
      .map(() =>
        new Array(width).fill().map(() => new Array(channels).fill(0))
      );

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          // Check for division by zero
          if (mat2[y][x][c] !== 0) {
            // check how many channels in mat2
            if (mat2[y][x].length !== channels && mat2[y][x].length === 1) {
              result[y][x][c] = mat1[y][x][c] / mat2[y][x][0];
            } else {
              result[y][x][c] = mat1[y][x][c] / mat2[y][x][c];
            }
          } else {
            result[y][x][c] = 0;
          }
        }
      }
    }
    return result;
  }

  // Transfer data from previewCanvas to resultCanvas and append to history
  const finalizeEdit = (type) => {
    // Close all collapsibles
    setOpenTool("");

    // Get current edit sliderValues and setter
    const sliderValues =
      type === "linearCombination"
        ? sliderValuesFalseColoring
        : type === "HSVColoring"
        ? sliderValuesHSVColoring
        : type === "LABColoring"
        ? sliderValuesLAB
        : type === "Filtering"
        ? filterSettings
        : type === "XYZColoring"
        ? XYZSliders
        : "";

    const setSliderValues =
      type === "linearCombination"
        ? setSliderValuesFalseColoring
        : type === "HSVColoring"
        ? setSliderValuesHSVColoring
        : type === "LABColoring"
        ? setSliderValuesLAB
        : type === "Filtering"
        ? setFilterSettings
        : type === "XYZColoring"
        ? setXYZSliders
        : "";

    // Reset it to default
    setSliderValues(defaultSliders[type]);
    resetAdditionalSliders();

    // Get previewData to input it into the history array
    const previewCanvas = previewChangeRef.current;
    const previewCtx = previewCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const { width, height } = previewCanvas;
    const previewData = previewCtx.getImageData(0, 0, width, height);

    setHistory((prevValues) => [
      ...prevValues.slice(0, currentHistoryIndex + 1),
      {
        editType: type,
        sliderValues: sliderValues,
        resultData: previewData,
        additionalSliders: additionalFilesSliders,
      },
    ]);

    setCurrentHistoryIndex(currentHistoryIndex + 1);

    copyCanvasData(previewChangeRef, resultCanvasRef);
  };

  // Helper function to apply edits to hi-res version
  const applyEdit = (editItem) => {
    const { editType, sliderValues, additionalSliders } = editItem;
    if (!nirFile || !rgbFile) return;

    // getting canvases
    const nirCanvas = nirCanvasRef.current;
    const resultCanvas = resultCanvasRef.current;

    // quit if one is not initialized
    if (!nirCanvas || !resultCanvas) return;

    // getting the ctxs with willReadFrequently to speed up next reads
    const nirCtx = nirCanvas.getContext("2d", { willReadFrequently: true });
    const resultCtx = resultCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    const { width, height } = resultCanvas;

    // getting actual data
    const nirData = nirCtx.getImageData(0, 0, width, height);
    let resultData = resultCtx.getImageData(0, 0, width, height);
    let outputData = resultCtx.createImageData(width, height);

    const additionalCtxs = additionalCanvasRefs.map((canvas) =>
      canvas.getContext("2d", { willReadFrequently: true })
    );
    const additionalData = additionalCtxs.map((ctx, index) =>
      ctx.getImageData(
        0,
        0,
        additionalCanvasRefs[index].width,
        additionalCanvasRefs[index].height
      )
    );

    const startTime = performance.now();

    // Apply appropriate edit
    if (editType === "linearCombination") {
      outputData = applyLinearCombination(
        resultData,
        nirData,
        resultData,
        sliderValues,
        additionalSliders[editType],
        additionalData
      );
    } else if (editType === "HSVColoring") {
      outputData = applyHSVColoring(
        resultData,
        nirData,
        resultData,
        sliderValues,
        additionalSliders[editType],
        additionalData
      );
    } else if (editType === "LABColoring") {
      outputData = applyLABColoring(
        resultData,
        nirData,
        resultData,
        sliderValues,
        additionalSliders[editType],
        additionalData
      );
    } else if (editType === "Filtering") {
      outputData = applyGuidedFilter(resultData, nirData, sliderValues);
    } else if (editType === "XYZColoring") {
      outputData = applyXYZ(
        resultData,
        nirData,
        resultData,
        sliderValues,
        additionalSliders[editType],
        additionalData
      );
    }

    const endTime = performance.now();
    console.log(`${editType}-${(endTime - startTime) / 1000}s`);
    // putting result to display with appropriate size
    resultCtx.putImageData(outputData, 0, 0);

    const aspectRatio = height / width;
    const displayWidth =
      aspectRatio > 1.3 ? window.innerWidth * 0.6 : window.innerWidth * 0.4;
    const displayHeight = displayWidth * aspectRatio;

    resultCanvas.style.width = `${displayWidth}px`;
    resultCanvas.style.height = `${displayHeight}px`;
  };

  const downloadImage = async () => {
    // Redraw rgbCanvas to hi-res version
    await drawImageOnCanvas(URL.createObjectURL(rgbFile), rgbCanvasRef, false);
    // Display loading
    setDisplayLoading(true);
    // Redraw nirCanvas to hi-res version
    await drawImageOnCanvas(URL.createObjectURL(nirFile), nirCanvasRef, false);
    // reference: https://stackoverflow.com/questions/10179815/get-loop-counter-index-using-for-of-syntax-in-javascript
    for (const [index, file] of additionalFiles.entries()) {
      await drawImageOnCanvas(
        URL.createObjectURL(file.file),
        additionalCanvasRefs[index],
        false
      );
    }
    copyCanvasData(rgbCanvasRef, resultCanvasRef);

    // apply all edits to hi-res version
    history.slice(0, currentHistoryIndex + 1).forEach((editItem) => {
      applyEdit(editItem);
    });

    // Get the canvas
    const canvas = resultCanvasRef.current;
    if (!canvas) return; // Return if no canvas is found

    // Create image URL
    const imageUrl = canvas.toDataURL("image/png");

    // Create a temporary link to trigger the download
    const downloadLink = document.createElement("a");
    downloadLink.href = imageUrl;
    downloadLink.download = "result-image.png"; // Set the name of the download file

    // Append to the document, trigger, and remove the link
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // go back to downsampled version for further edits
    drawImageOnCanvas(URL.createObjectURL(rgbFile), rgbCanvasRef, true);
    drawImageOnCanvas(URL.createObjectURL(nirFile), nirCanvasRef, true);
    additionalFiles.forEach(async (file, index) => {
      await drawImageOnCanvas(
        URL.createObjectURL(file.file),
        additionalCanvasRefs[index],
        true
      );
    });
    copyCanvasData(previewChangeRef, resultCanvasRef);
    // Hide loading
    setDisplayLoading(false);
  };

  const resetCanvas = () => {
    copyCanvasData(resultCanvasRef, previewChangeRef);
  };

  // loads initial image
  useEffect(() => {
    if (rgbCanvasRef.current && nirCanvasRef.current && rgbFile && nirFile) {
      if (
        getComputedStyle(rgbCanvasRef.current).display === "block" &&
        getComputedStyle(nirCanvasRef.current).display === "block"
      ) {
        // only if canvases are being displayed
        initCanvases();
      }
    }
  }, [rgbFile, nirFile]);

  useEffect(() => {
    if (Object.keys(additionalFiles).length < 1) return;
    setAdditionalFilesSliders((prevValues) => {
      const type = additionalFiles[additionalFiles.length - 1].type;
      return {
        linearCombination: {
          ...additionalFilesSliders.linearCombination,
          [type]: { red: 0, blue: 0, green: 0 },
        },
        XYZColoring: {
          ...additionalFilesSliders.XYZColoring,
          [type]: { X: 0, Y: 0, Z: 0 },
        },
        HSVColoring: {
          ...additionalFilesSliders.HSVColoring,
          [type]: { values: 0 },
        },
        LABColoring: {
          ...additionalFilesSliders.HSVColoring,
          [type]: { values: 0 },
        },
      };
    });
  }, [additionalFiles]);

  // setup function to resize result and preview canvas when window is resized
  useEffect(() => {
    const handleResizeCanvas = () => {
      // resize canvas to appropriate size
      const resultCanvas = resultCanvasRef.current;
      const previewCanvas = previewChangeRef.current;

      const resultCtx = resultCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      const previewCtx = resultCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      const { height, width } = resultCanvas;

      const resultData = resultCtx.getImageData(0, 0, width, height);
      const previewData = previewCtx.getImageData(0, 0, width, height);

      resultCtx.clearRect(0, 0, width, height);
      previewCtx.clearRect(0, 0, width, height);

      resultCtx.putImageData(resultData, 0, 0);
      previewCtx.putImageData(previewData, 0, 0);

      const aspectRatio = height / width;
      const displayWidth =
        aspectRatio > 1.3 ? window.innerWidth * 0.6 : window.innerWidth * 0.4;
      const displayHeight = displayWidth * aspectRatio;

      resultCanvas.style.width = `${displayWidth}px`;
      resultCanvas.style.height = `${displayHeight}px`;
      previewCanvas.style.width = `${displayWidth}px`;
      previewCanvas.style.height = `${displayHeight}px`;
    };
    window.addEventListener("resize", handleResizeCanvas);
    return () => {
      window.removeEventListener("resize", handleResizeCanvas);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            backgroundColor: "#b9b8b8",
            color: "#000",
            position: "relative",
          }}
        >
          <canvas
            id="preview-canvas"
            ref={previewChangeRef}
            style={{ zIndex: 10, position: "absolute" }}
          ></canvas>
          <canvas
            id="result-canvas"
            ref={resultCanvasRef}
            style={{ zIndex: 1, position: "absolute", display: "none" }}
          ></canvas>
        </div>
        <div
          style={{
            width: "300px",
            backgroundColor: "#e7e7e7",
            padding: "20px",
          }}
        >
          <FileUpload
            rgbFile={rgbFile}
            setRgbFile={setRgbFile}
            nirFile={nirFile}
            setNirFile={setNirFile}
            nirCanvasRef={nirCanvasRef}
            rgbCanvasRef={rgbCanvasRef}
            resultCanvasRef={resultCanvasRef}
            previewCanvasRef={previewChangeRef}
            history={history}
            setHistory={setHistory}
            setCurrentHistoryIndex={setCurrentHistoryIndex}
            displayLoading={displayLoading}
            additionalFiles={additionalFiles}
            setAdditionalFiles={setAdditionalFiles}
            additionalCanvasRefs={additionalCanvasRefs}
            setAdditionalCanvasRefs={setAdditionalCanvasRefs}
          />
          <div
            style={{
              left: "10px",
              top: "10px",
              display: "flex",
              flexDirection: "row",
            }}
          >
            <button
              onClick={handleUndo}
              disabled={currentHistoryIndex === -1}
              style={{ width: "50%" }}
            >
              {"↺"}
            </button>
            <button
              onClick={handleRedo}
              disabled={currentHistoryIndex === history.length - 1}
              style={{ width: "50%" }}
            >
              {"↻"}
            </button>
          </div>
          <Collapsible
            title="False coloring"
            openTool={openTool}
            setOpenTool={setOpenTool}
            setSliderValues={setSliderValuesFalseColoring}
            type={"linearCombination"}
            resetCanvas={resetCanvas}
            resetAdditionalSliders={resetAdditionalSliders}
          >
            <Sliders
              type={"linearCombination"}
              sliderValues={sliderValuesFalseColoring}
              setSliderValues={setSliderValuesFalseColoring}
              applyEdit={() => previewEdit("linearCombination")}
              finalizeEdit={(type) => finalizeEdit(type)}
              additionalFiles={additionalFiles}
              additionalFilesSliders={additionalFilesSliders}
              setAdditionalFilesSliders={setAdditionalFilesSliders}
              resetCanvas={resetCanvas}
              resetAdditionalSliders={resetAdditionalSliders}
            />
          </Collapsible>
          <Collapsible
            title="XYZ Coloring"
            openTool={openTool}
            setOpenTool={setOpenTool}
            setSliderValues={setXYZSliders}
            type="XYZColoring"
            resetCanvas={resetCanvas}
            resetAdditionalSliders={resetAdditionalSliders}
          >
            <Sliders
              type="XYZColoring"
              sliderValues={XYZSliders}
              setSliderValues={setXYZSliders}
              applyEdit={() => previewEdit("XYZColoring")}
              finalizeEdit={(type) => finalizeEdit(type)}
              additionalFiles={additionalFiles}
              additionalFilesSliders={additionalFilesSliders}
              setAdditionalFilesSliders={setAdditionalFilesSliders}
              resetCanvas={resetCanvas}
              resetAdditionalSliders={resetAdditionalSliders}
            />
          </Collapsible>
          <Collapsible
            title="HSV Enhancement"
            openTool={openTool}
            setOpenTool={setOpenTool}
            setSliderValues={setSliderValuesHSVColoring}
            type={"HSVColoring"}
            resetCanvas={resetCanvas}
            resetAdditionalSliders={resetAdditionalSliders}
          >
            <Sliders
              type={"HSVColoring"}
              sliderValues={sliderValuesHSVColoring}
              setSliderValues={setSliderValuesHSVColoring}
              applyEdit={() => previewEdit("HSVColoring")}
              finalizeEdit={(type) => finalizeEdit(type)}
              additionalFiles={additionalFiles}
              additionalFilesSliders={additionalFilesSliders}
              setAdditionalFilesSliders={setAdditionalFilesSliders}
              resetCanvas={resetCanvas}
              resetAdditionalSliders={resetAdditionalSliders}
            />
          </Collapsible>
          <Collapsible
            title="LAB Enhancement"
            openTool={openTool}
            setOpenTool={setOpenTool}
            setSliderValues={setSliderValuesLAB}
            type="LABColoring"
            resetCanvas={resetCanvas}
            resetAdditionalSliders={resetAdditionalSliders}
          >
            <Sliders
              type="LABColoring"
              sliderValues={sliderValuesLAB}
              setSliderValues={setSliderValuesLAB}
              applyEdit={() => previewEdit("LABColoring")}
              finalizeEdit={(type) => finalizeEdit(type)}
              additionalFiles={additionalFiles}
              additionalFilesSliders={additionalFilesSliders}
              setAdditionalFilesSliders={setAdditionalFilesSliders}
              resetCanvas={resetCanvas}
              resetAdditionalSliders={resetAdditionalSliders}
            />
          </Collapsible>
          <Collapsible
            title="Filtering"
            openTool={openTool}
            setOpenTool={setOpenTool}
            setSliderValues={setFilterSettings}
            type="Filtering"
            resetCanvas={resetCanvas}
            resetAdditionalSliders={resetAdditionalSliders}
          >
            <Sliders
              type="Filtering"
              sliderValues={filterSettings}
              setSliderValues={setFilterSettings}
              applyEdit={() => previewEdit("Filtering")}
              finalizeEdit={(type) => finalizeEdit(type)}
              additionalFiles={additionalFiles}
              additionalFilesSliders={additionalFilesSliders}
              setAdditionalFilesSliders={setAdditionalFilesSliders}
              resetCanvas={resetCanvas}
              resetAdditionalSliders={resetAdditionalSliders}
            />
          </Collapsible>

          <button
            onClick={downloadImage}
            style={{ padding: "10px 20px", marginTop: "20px" }}
          >
            Download Result Image
          </button>
        </div>
      </div>
    </div>
  );
};
export default App;
