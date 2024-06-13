import { useEffect, useState, useRef } from "react";
import "../App.css";

// async function to draw image on canvas
export const drawImageOnCanvas = async (imageUrl, canvasRef, downsample) => {
  // returning promise to enable waiting draw
  return new Promise((resolve, reject) => {
    if (!canvasRef) {
      reject("canvas not loaded");
      return;
    }
    // additionalCanvasRefs keeps direct ref to canvas
    // so if current is undefined -> load direct canvasRef
    const canvas = canvasRef.current ? canvasRef.current : canvasRef;

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const targetWidth = downsample ? 800 : img.width;
      const aspectRatio = img.height / img.width;
      const targetHeight = targetWidth * aspectRatio;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const displayWidth = 50;
      const displayHeight = displayWidth * aspectRatio;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      URL.revokeObjectURL(imageUrl);
      resolve();
    };

    img.src = imageUrl;
  });
};

const FileUpload = ({
  rgbFile,
  setRgbFile,
  nirFile,
  setNirFile,
  nirCanvasRef,
  rgbCanvasRef,
  resultCanvasRef,
  previewCanvasRef,
  history,
  setHistory,
  setCurrentHistoryIndex,
  displayLoading,
  additionalFiles,
  setAdditionalFiles,
  additionalCanvasRefs,
  setAdditionalCanvasRefs,
}) => {
  // state to display upload box for additional files
  const [displayUploadBox, setDisplayUploadBox] = useState(false);

  // temp states for additional files
  const [tempName, setTempName] = useState("");
  const [tempFile, setTempFile] = useState(null);

  // Temp states for errors in upload
  const [uploadError, setUploadError] = useState("");

  const rgbInputRef = useRef(null);
  const nirInputRef = useRef(null);

  // Function to handle upload of files based on type
  const handleUploadFile = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    if (type === "RGB") {
      setRgbFile(file);
      const fileURL = URL.createObjectURL(file);
      drawImageOnCanvas(fileURL, rgbCanvasRef, true);
    } else if (type === "NIR") {
      setNirFile(file);
      const fileURL = URL.createObjectURL(file);
      drawImageOnCanvas(fileURL, nirCanvasRef, true);
    } else {
      setAdditionalFiles((prevValues) => [
        ...prevValues,
        { type: type, file: file },
      ]);
      setAdditionalCanvasRefs((prevValues) => [...prevValues, null]);
    }
  };

  // reset states to restart editing
  const handleResetImages = () => {
    setRgbFile(null);
    setNirFile(null);

    // clearing all canvases
    const rgbCanvas = rgbCanvasRef.current;
    const rgbCtx = rgbCanvas.getContext("2d");
    rgbCtx.clearRect(0, 0, rgbCanvas.width, rgbCanvas.height);
    const nirCanvas = nirCanvasRef.current;
    const nirCtx = nirCanvas.getContext("2d");
    nirCtx.clearRect(0, 0, nirCanvas.width, nirCanvas.height);
    const resultCanvas = resultCanvasRef.current;
    const resultCtx = resultCanvas.getContext("2d");
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    const previewCanvas = previewCanvasRef.current;
    const previewCtx = previewCanvas.getContext("2d");
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    setAdditionalFiles([]);
    setAdditionalCanvasRefs([]);

    setCurrentHistoryIndex(-1);
    setHistory([]);
  };

  // if new canvas ref is rendered -> draw the additional file on the last rendered canvas
  useEffect(() => {
    console.log(additionalFiles);
    if (additionalCanvasRefs.length > 0)
      drawImageOnCanvas(
        URL.createObjectURL(additionalFiles[additionalFiles.length - 1].file),
        additionalCanvasRefs[additionalCanvasRefs.length - 1],
        true
      );
    setTempName("");
  }, [additionalCanvasRefs]);

  return (
    <div>
      <div>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <label style={{ flex: 1, color: "#efefef" }}>RGB Image:</label>
          <input
            type="file"
            value=""
            onChange={(event) => handleUploadFile(event, "RGB")}
            style={{ display: "none" }}
            ref={rgbInputRef}
          />
          <button
            className="default-button"
            onClick={() => rgbInputRef.current.click()}
            style={{ flex: 2, display: !rgbFile ? "block" : "none" }}
          >
            Browse...
          </button>
          <canvas
            id="rgb-canvas"
            style={{
              flex: "0 0 auto",
              display: rgbFile ? "block" : "none",
              width: "20px",
            }}
            height={20}
            ref={rgbCanvasRef}
          ></canvas>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
          }}
        >
          <label style={{ flex: 1, color: "#efefef" }}>NIR Image:</label>
          <button
            className="default-button"
            onClick={() => nirInputRef.current.click()}
            style={{ flex: 2, display: !nirFile ? "block" : "none" }}
          >
            Browse...
          </button>
          <canvas
            id="nir-canvas"
            style={{
              flex: "0 0 auto",
              display: nirFile ? "block" : "none",
              width: "20px",
            }}
            height={20}
            ref={nirCanvasRef}
          ></canvas>
          <input
            type="file"
            value=""
            onChange={(event) => handleUploadFile(event, "NIR")}
            style={{ display: "none" }}
            ref={nirInputRef}
          />

          {additionalFiles.map((additionalFile, index) => {
            return (
              <div key={`${additionalFile.type}-${index}`}>
                <label style={{ flex: 1 }}>{additionalFile.type} Image:</label>
                <canvas
                  style={{ flex: 2, zIndex: "20", display: "block" }}
                  height={20}
                  ref={(currentRef) => {
                    additionalCanvasRefs[index] = currentRef;
                  }}
                ></canvas>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "row" }}>
          <button onClick={handleResetImages} className="default-button">
            Reset Images
          </button>
          <button
            onClick={() => setDisplayUploadBox(true)}
            className="default-button"
          >
            + Add More Files
          </button>
        </div>
      </div>
      {displayUploadBox && (
        <div
          style={{
            position: "fixed",
            width: "500px",
            height: "500px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: "translate(-50%, -50%)",
            top: "50%",
            left: "50%",
            backgroundColor: "#e7e7e7",
            zIndex: "50",
            borderRadius: "20px",
          }}
        >
          <div
            style={{
              width: "200px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <input
              type="file"
              onChange={(event) => {
                setTempFile(event);
              }}
              style={{ flex: 2 }}
            />
            <input
              type="text"
              style={{ flex: 1 }}
              value={tempName}
              onChange={(event) => setTempName(event.target.value)}
            ></input>
          </div>
          <label style={{ color: "red" }}>{uploadError}</label>
          <button
            style={{ width: "200px" }}
            onClick={() => {
              if (tempName === "") {
                setUploadError("Please input a filename.");
              } else if (Object.keys(additionalFiles).includes(tempName)) {
                setUploadError("Please input a new filename.");
              } else if (!tempFile) {
                setUploadError("Please upload an image.");
              } else {
                setDisplayUploadBox(false);
                handleUploadFile(tempFile, tempName);
                setUploadError("");
              }
            }}
          >
            Add File
          </button>
          <button
            style={{ width: "200px" }}
            onClick={() => {
              setDisplayUploadBox(false);
              setUploadError("");
              setTempName("");
              setTempFile(null);
            }}
          >
            Close
          </button>
        </div>
      )}
      {displayLoading && (
        <div
          style={{
            position: "fixed",
            width: "500px",
            height: "500px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: "translate(-50%, -50%)",
            top: "50%",
            left: "50%",
            backgroundColor: "#e7e7e7",
            zIndex: "100",
            borderRadius: "20px",
            boxSizing: "border-box",
            padding: "50px",
            textAlign: "center",
          }}
        >
          <label>Loading result...</label>
          <label>
            Processing {history.length} edits, with image of size{" "}
            {rgbCanvasRef.current.width}x{rgbCanvasRef.current.height}
          </label>
          <label>
            Note: this may take a while, depending on the number of tools used
            and original photo size
          </label>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
