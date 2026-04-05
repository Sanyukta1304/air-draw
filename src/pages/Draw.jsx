import { useEffect, useRef, useState } from "react";
import ControlPanel from "../components/ControlPanel";
import StatusBadge from "../components/StatusBadge";
import "../styles/draw.css";

const Draw = () => {
  const videoRef = useRef(null);
  const landmarkCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);

  const [mode, setMode] = useState("READY");
  const [selectedColor, setSelectedColor] = useState("#00e5ff");
  const [brushSize, setBrushSize] = useState(6);

  const prevPointRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);

  const redrawStrokes = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    strokesRef.current.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      if (stroke.color === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
      }

      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
    });
  };

  useEffect(() => {
    let stream;
    let animationId;
    let hands;

    const setup = async () => {
      try {
        const video = videoRef.current;
        const landmarkCanvas = landmarkCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;

        if (!video || !landmarkCanvas || !drawCanvas) {
          setMode("ERROR");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        video.srcObject = stream;

        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });

        await video.play();

        const Hands = window.Hands;
        const drawConnectors = window.drawConnectors;
        const drawLandmarks = window.drawLandmarks;
        const HAND_CONNECTIONS = window.HAND_CONNECTIONS;

        if (!Hands || !drawConnectors || !drawLandmarks || !HAND_CONNECTIONS) {
          console.error("MediaPipe CDN scripts not loaded properly");
          setMode("ERROR");
          return;
        }

        hands = new Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          const landmarkCtx = landmarkCanvas.getContext("2d");
          const drawCtx = drawCanvas.getContext("2d");

          const width = video.videoWidth || 640;
          const height = video.videoHeight || 480;

          if (
            landmarkCanvas.width !== width ||
            landmarkCanvas.height !== height
          ) {
            landmarkCanvas.width = width;
            landmarkCanvas.height = height;
          }

          if (drawCanvas.width !== width || drawCanvas.height !== height) {
            drawCanvas.width = width;
            drawCanvas.height = height;
            redrawStrokes();
          }

          landmarkCtx.clearRect(0, 0, width, height);

          if (
            results.multiHandLandmarks &&
            results.multiHandLandmarks.length > 0
          ) {
            const landmarks = results.multiHandLandmarks[0];

            drawConnectors(landmarkCtx, landmarks, HAND_CONNECTIONS, {
              color: "#00e5ff",
              lineWidth: 2,
            });

            drawLandmarks(landmarkCtx, landmarks, {
              color: "#ffffff",
              lineWidth: 1,
              radius: 3,
            });

            const tip = landmarks[8];
            const x = tip.x * width;
            const y = tip.y * height;

            landmarkCtx.beginPath();
            landmarkCtx.arc(x, y, 10, 0, Math.PI * 2);
            landmarkCtx.fillStyle = "red";
            landmarkCtx.fill();

            const indexUp = landmarks[8].y < landmarks[6].y;
            const middleUp = landmarks[12].y < landmarks[10].y;
            const ringUp = landmarks[16].y < landmarks[14].y;
            const pinkyUp = landmarks[20].y < landmarks[18].y;

            const isDrawGesture =
              indexUp && !middleUp && !ringUp && !pinkyUp;

            const isOpenPalm =
              indexUp && middleUp && ringUp && pinkyUp;

            const activeSize = isOpenPalm
              ? Math.max(brushSize + 10, 16)
              : brushSize;

            if (isDrawGesture || isOpenPalm) {
              setMode(isOpenPalm ? "ERASING" : "DRAWING");

              if (!currentStrokeRef.current) {
                currentStrokeRef.current = {
                  color: isOpenPalm ? "erase" : selectedColor,
                  size: activeSize,
                  points: [{ x, y }],
                };
              } else {
                currentStrokeRef.current.points.push({ x, y });
              }

              if (prevPointRef.current) {
                drawCtx.beginPath();
                drawCtx.moveTo(prevPointRef.current.x, prevPointRef.current.y);
                drawCtx.lineTo(x, y);

                if (isOpenPalm) {
                  drawCtx.globalCompositeOperation = "destination-out";
                  drawCtx.strokeStyle = "rgba(0,0,0,1)";
                } else {
                  drawCtx.globalCompositeOperation = "source-over";
                  drawCtx.strokeStyle = selectedColor;
                }

                drawCtx.lineWidth = activeSize;
                drawCtx.lineCap = "round";
                drawCtx.lineJoin = "round";
                drawCtx.stroke();
                drawCtx.globalCompositeOperation = "source-over";
              }

              prevPointRef.current = { x, y };
            } else {
              setMode("READY");

              if (currentStrokeRef.current) {
                if (currentStrokeRef.current.points.length > 1) {
                  strokesRef.current.push(currentStrokeRef.current);
                }
                currentStrokeRef.current = null;
              }

              prevPointRef.current = null;
            }
          } else {
            setMode("READY");

            if (currentStrokeRef.current) {
              if (currentStrokeRef.current.points.length > 1) {
                strokesRef.current.push(currentStrokeRef.current);
              }
              currentStrokeRef.current = null;
            }

            prevPointRef.current = null;
          }
        });

        const loop = async () => {
          try {
            if (video.readyState >= 2 && hands) {
              await hands.send({ image: video });
            }
          } catch (err) {
            console.error("Frame processing error:", err);
            setMode("ERROR");
          }

          animationId = requestAnimationFrame(loop);
        };

        loop();
      } catch (error) {
        console.error("Setup error:", error);
        setMode("ERROR");
      }
    };

    setup();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedColor, brushSize]);

  const handleClearCanvas = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const drawCtx = drawCanvas.getContext("2d");
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    strokesRef.current = [];
    currentStrokeRef.current = null;
    prevPointRef.current = null;
    setMode("READY");
  };

  const handleUndo = () => {
    if (currentStrokeRef.current) {
      currentStrokeRef.current = null;
    }

    strokesRef.current.pop();
    prevPointRef.current = null;
    redrawStrokes();
    setMode("READY");
  };

  const handleSaveImage = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const link = document.createElement("a");
    link.download = `air-draw-${Date.now()}.png`;
    link.href = drawCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="draw-page">
      <div className="camera-status">Camera ON</div>

      <div className="draw-area">
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video-feed"
          />
          <div className="camera-overlay"></div>
          <canvas ref={drawCanvasRef} className="draw-canvas" />
          <canvas ref={landmarkCanvasRef} className="landmark-canvas" />
        </div>

        <ControlPanel
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          onClear={handleClearCanvas}
          onSave={handleSaveImage}
          onUndo={handleUndo}
        />
      </div>

      <StatusBadge mode={mode} />
    </div>
  );
};

export default Draw;