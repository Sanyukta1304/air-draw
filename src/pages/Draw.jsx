import { useEffect, useRef, useState } from "react";
import ControlPanel from "../components/ControlPanel";
import StatusBadge from "../components/StatusBadge";
import "../styles/draw.css";

const Draw = () => {
  const videoRef = useRef(null);
  const landmarkCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);

  const [mode, setMode] = useState("READY");
  const [selectedColor, setSelectedColor] = useState("#19e6ff");
  const [brushSize, setBrushSize] = useState(6);
  const [glowValue, setGlowValue] = useState(60);
  const [backgroundMode, setBackgroundMode] = useState("blur");

  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);

  const prevDrawPointRef = useRef(null);
  const smoothDrawPointRef = useRef(null);

  const isMovingRef = useRef(false);
  const selectedStrokeIndexRef = useRef(null);
  const prevMovePointRef = useRef(null);
  const smoothMovePointRef = useRef(null);

  const pinchFramesRef = useRef(0);
  const idleFramesRef = useRef(0);
  const pinchHoldFramesRef = useRef(0);

  const getGlowBlur = (glow) => Math.max((glow / 100) * 18, 0);

  const smoothPoint = (ref, x, y, factor = 0.24) => {
    if (!ref.current) {
      ref.current = { x, y };
      return ref.current;
    }

    ref.current = {
      x: ref.current.x + (x - ref.current.x) * factor,
      y: ref.current.y + (y - ref.current.y) * factor,
    };

    return ref.current;
  };

  const resetDrawRefs = () => {
    prevDrawPointRef.current = null;
    smoothDrawPointRef.current = null;
    currentStrokeRef.current = null;
  };

  const resetMoveRefs = () => {
    isMovingRef.current = false;
    selectedStrokeIndexRef.current = null;
    prevMovePointRef.current = null;
    smoothMovePointRef.current = null;
    pinchHoldFramesRef.current = 0;
  };

  const getDistance = (a, b) => {
    if (!a || !b) return 0;
    return Math.hypot(b.x - a.x, b.y - a.y);
  };

  const redrawStrokes = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokesRef.current.forEach((stroke, index) => {
      if (!stroke.points || stroke.points.length < 2) return;

      const isSelected =
        isMovingRef.current && index === selectedStrokeIndexRef.current;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      if (stroke.type === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = isSelected ? "#ffd600" : stroke.color;
        ctx.shadowColor = isSelected ? "#ffd600" : stroke.color;
        ctx.shadowBlur = isSelected
          ? Math.max((stroke.glowBlur ?? 0) + 8, 12)
          : stroke.glowBlur ?? 0;
      }

      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    });
  };

  const finalizeCurrentStroke = () => {
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      strokesRef.current.push(currentStrokeRef.current);
    }
    currentStrokeRef.current = null;
    prevDrawPointRef.current = null;
    smoothDrawPointRef.current = null;
  };

  const findClosestStrokeIndex = (x, y) => {
    if (strokesRef.current.length === 0) return null;

    let closestIndex = null;
    let closestDistance = Infinity;

    strokesRef.current.forEach((stroke, strokeIndex) => {
      if (!stroke.points || stroke.points.length === 0) return;
      if (stroke.type === "erase") return;

      stroke.points.forEach((pt) => {
        const d = Math.hypot(pt.x - x, pt.y - y);
        if (d < closestDistance) {
          closestDistance = d;
          closestIndex = strokeIndex;
        }
      });
    });

    return closestDistance <= 55 ? closestIndex : null;
  };

  const moveSelectedStroke = (dx, dy) => {
    const index = selectedStrokeIndexRef.current;
    if (index === null) return;

    const target = strokesRef.current[index];
    if (!target) return;

    strokesRef.current[index] = {
      ...target,
      points: target.points.map((pt) => ({
        x: pt.x + dx,
        y: pt.y + dy,
      })),
    };
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
          video: { width: 1280, height: 720 },
          audio: false,
        });

        video.srcObject = stream;

        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });

        await video.play();

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        landmarkCanvas.width = width;
        landmarkCanvas.height = height;
        drawCanvas.width = width;
        drawCanvas.height = height;

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
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results) => {
          try {
            const landmarkCtx = landmarkCanvas.getContext("2d");
            const drawCtx = drawCanvas.getContext("2d");

            landmarkCtx.clearRect(
              0,
              0,
              landmarkCanvas.width,
              landmarkCanvas.height
            );

            if (
              !results.multiHandLandmarks ||
              results.multiHandLandmarks.length === 0
            ) {
              finalizeCurrentStroke();
              resetMoveRefs();
              setMode("READY");
              redrawStrokes();
              return;
            }

            const lm = results.multiHandLandmarks[0];

            drawConnectors(landmarkCtx, lm, HAND_CONNECTIONS, {
              color: "rgba(255,255,255,0.24)",
              lineWidth: 2,
            });

            drawLandmarks(landmarkCtx, lm, {
              color: "rgba(255,255,255,0.88)",
              lineWidth: 1,
              radius: 3,
            });

            const thumbTip = { x: lm[4].x * width, y: lm[4].y * height };
            const indexTip = { x: lm[8].x * width, y: lm[8].y * height };

            const indexUp = lm[8].y < lm[6].y;
            const middleUp = lm[12].y < lm[10].y;
            const ringUp = lm[16].y < lm[14].y;
            const pinkyUp = lm[20].y < lm[18].y;

            const isDrawGesture =
              indexUp && !middleUp && !ringUp && !pinkyUp;

            const isOpenPalm =
              indexUp && middleUp && ringUp && pinkyUp;

            const pinchDistance = Math.hypot(
              thumbTip.x - indexTip.x,
              thumbTip.y - indexTip.y
            );

            const pinchCenter = {
              x: (thumbTip.x + indexTip.x) / 2,
              y: (thumbTip.y + indexTip.y) / 2,
            };

            const rawPinch =
              pinchDistance < 42 &&
              Math.abs(lm[8].y - lm[4].y) < 0.09 &&
              !middleUp &&
              !ringUp &&
              !pinkyUp;

            if (rawPinch) {
              pinchFramesRef.current += 1;
            } else {
              pinchFramesRef.current = 0;
            }

            const isPinching = pinchFramesRef.current >= 2;

            const rawIdle =
              !indexUp &&
              !middleUp &&
              !ringUp &&
              !pinkyUp &&
              !isPinching;

            if (rawIdle) {
              idleFramesRef.current += 1;
            } else {
              idleFramesRef.current = 0;
            }

            const isIdleGesture = idleFramesRef.current >= 4;

            const palmCenter = {
              x:
                ((lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5) *
                width,
              y:
                ((lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5) *
                height,
            };

            const eraseRadius = Math.max(brushSize + 18, 24);

            if (isOpenPalm) {
              landmarkCtx.save();
              landmarkCtx.beginPath();
              landmarkCtx.arc(
                palmCenter.x,
                palmCenter.y,
                eraseRadius,
                0,
                Math.PI * 2
              );
              landmarkCtx.setLineDash([6, 5]);
              landmarkCtx.lineWidth = 2;
              landmarkCtx.strokeStyle = "#ff2d75";
              landmarkCtx.shadowColor = "#ff2d75";
              landmarkCtx.shadowBlur = 10;
              landmarkCtx.stroke();
              landmarkCtx.restore();
            } else if (isPinching) {
              landmarkCtx.save();
              landmarkCtx.beginPath();
              landmarkCtx.arc(pinchCenter.x, pinchCenter.y, 12, 0, Math.PI * 2);
              landmarkCtx.fillStyle = "rgba(255,214,0,0.16)";
              landmarkCtx.fill();

              landmarkCtx.beginPath();
              landmarkCtx.arc(pinchCenter.x, pinchCenter.y, 12, 0, Math.PI * 2);
              landmarkCtx.lineWidth = 2;
              landmarkCtx.strokeStyle = "#ffd600";
              landmarkCtx.shadowColor = "#ffd600";
              landmarkCtx.shadowBlur = 10;
              landmarkCtx.stroke();
              landmarkCtx.restore();
            } else {
              landmarkCtx.beginPath();
              landmarkCtx.arc(indexTip.x, indexTip.y, 10, 0, Math.PI * 2);
              landmarkCtx.fillStyle = "red";
              landmarkCtx.shadowColor = "red";
              landmarkCtx.shadowBlur = 10;
              landmarkCtx.fill();
              landmarkCtx.shadowBlur = 0;
            }

            if (isPinching) {
              finalizeCurrentStroke();
              setMode("MOVING");

              const smoothMove = smoothPoint(
                smoothMovePointRef,
                pinchCenter.x,
                pinchCenter.y,
                0.28
              );

              if (!isMovingRef.current) {
                pinchHoldFramesRef.current += 1;

                if (pinchHoldFramesRef.current >= 2) {
                  const pickedIndex = findClosestStrokeIndex(
                    smoothMove.x,
                    smoothMove.y
                  );

                  if (pickedIndex !== null) {
                    isMovingRef.current = true;
                    selectedStrokeIndexRef.current = pickedIndex;

                    prevMovePointRef.current = {
                      x: smoothMove.x,
                      y: smoothMove.y,
                    };

                    redrawStrokes();
                  }
                }

                return;
              }

              if (
                selectedStrokeIndexRef.current !== null &&
                prevMovePointRef.current
              ) {
                const dx = smoothMove.x - prevMovePointRef.current.x;
                const dy = smoothMove.y - prevMovePointRef.current.y;

                if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) {
                  moveSelectedStroke(dx, dy);
                  redrawStrokes();
                }

                prevMovePointRef.current = {
                  x: smoothMove.x,
                  y: smoothMove.y,
                };
              }

              return;
            }

            if (isMovingRef.current && !isPinching && !rawPinch) {
              if (idleFramesRef.current >= 2 || isDrawGesture || isOpenPalm) {
                resetMoveRefs();
                redrawStrokes();
              }
            }

            if (isOpenPalm) {
              setMode("ERASING");

              const smoothErase = smoothPoint(
                smoothDrawPointRef,
                palmCenter.x,
                palmCenter.y,
                0.22
              );

              if (!currentStrokeRef.current) {
                currentStrokeRef.current = {
                  type: "erase",
                  color: "erase",
                  size: eraseRadius * 2,
                  glowBlur: 0,
                  points: [{ x: smoothErase.x, y: smoothErase.y }],
                };
              } else {
                const last =
                  currentStrokeRef.current.points[
                    currentStrokeRef.current.points.length - 1
                  ];

                if (getDistance(last, smoothErase) > 2.2) {
                  currentStrokeRef.current.points.push({
                    x: smoothErase.x,
                    y: smoothErase.y,
                  });
                }
              }

              if (prevDrawPointRef.current) {
                if (getDistance(prevDrawPointRef.current, smoothErase) > 1.8) {
                  drawCtx.beginPath();
                  drawCtx.moveTo(
                    prevDrawPointRef.current.x,
                    prevDrawPointRef.current.y
                  );
                  drawCtx.lineTo(smoothErase.x, smoothErase.y);
                  drawCtx.globalCompositeOperation = "destination-out";
                  drawCtx.strokeStyle = "rgba(0,0,0,1)";
                  drawCtx.lineWidth = eraseRadius * 2;
                  drawCtx.lineCap = "round";
                  drawCtx.lineJoin = "round";
                  drawCtx.stroke();
                  drawCtx.globalCompositeOperation = "source-over";
                }
              }

              prevDrawPointRef.current = smoothErase;
              return;
            }

            if (isDrawGesture) {
              setMode("DRAWING");

              const glowBlur = getGlowBlur(glowValue);

              const smoothDraw = smoothPoint(
                smoothDrawPointRef,
                indexTip.x,
                indexTip.y,
                0.22
              );

              if (!currentStrokeRef.current) {
                currentStrokeRef.current = {
                  type: "draw",
                  color: selectedColor,
                  size: brushSize,
                  glowBlur,
                  points: [{ x: smoothDraw.x, y: smoothDraw.y }],
                };
              } else {
                const last =
                  currentStrokeRef.current.points[
                    currentStrokeRef.current.points.length - 1
                  ];

                if (getDistance(last, smoothDraw) > 2.2) {
                  currentStrokeRef.current.points.push({
                    x: smoothDraw.x,
                    y: smoothDraw.y,
                  });
                }
              }

              if (prevDrawPointRef.current) {
                if (getDistance(prevDrawPointRef.current, smoothDraw) > 1.8) {
                  drawCtx.beginPath();
                  drawCtx.moveTo(
                    prevDrawPointRef.current.x,
                    prevDrawPointRef.current.y
                  );
                  drawCtx.lineTo(smoothDraw.x, smoothDraw.y);
                  drawCtx.globalCompositeOperation = "source-over";
                  drawCtx.strokeStyle = selectedColor;
                  drawCtx.shadowColor = selectedColor;
                  drawCtx.shadowBlur = glowBlur;
                  drawCtx.lineWidth = brushSize;
                  drawCtx.lineCap = "round";
                  drawCtx.lineJoin = "round";
                  drawCtx.stroke();
                  drawCtx.shadowBlur = 0;
                  drawCtx.shadowColor = "transparent";
                }
              }

              prevDrawPointRef.current = smoothDraw;
              return;
            }

            if (isIdleGesture) {
              finalizeCurrentStroke();
              setMode("IDLE");
              return;
            }

            finalizeCurrentStroke();
            setMode("READY");
          } catch (err) {
            console.error("onResults error:", err);
            setMode("ERROR");
          }
        });

        const detectLoop = async () => {
          try {
            if (video.readyState >= 2 && hands) {
              await hands.send({ image: video });
            }
          } catch (err) {
            console.error("Frame processing error:", err);
            setMode("ERROR");
          }

          animationId = requestAnimationFrame(detectLoop);
        };

        detectLoop();
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
  }, [selectedColor, brushSize, glowValue]);

  const handleToggleBackground = () => {
    setBackgroundMode((prev) =>
      prev === "blur" ? "blackboard" : "blur"
    );
  };

  const handleClearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokesRef.current = [];
    resetDrawRefs();
    resetMoveRefs();
    setMode("READY");
  };

  const handleUndo = () => {
    finalizeCurrentStroke();
    strokesRef.current.pop();
    resetMoveRefs();
    redrawStrokes();
    setMode("READY");
  };

  const handleSaveImage = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `air-draw-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
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
            className={`video-feed ${
              backgroundMode === "blackboard" ? "blackboard-mode" : ""
            }`}
          />

          <div
            className={`camera-overlay ${
              backgroundMode === "blackboard" ? "blackboard-overlay" : ""
            }`}
          />

          <canvas ref={drawCanvasRef} className="draw-canvas" />
          <canvas ref={landmarkCanvasRef} className="landmark-canvas" />
        </div>

        <ControlPanel
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          glowValue={glowValue}
          onGlowChange={setGlowValue}
          onClear={handleClearCanvas}
          onSave={handleSaveImage}
          onUndo={handleUndo}
          backgroundMode={backgroundMode}
          onToggleBackground={handleToggleBackground}
        />
      </div>

      <StatusBadge mode={mode} />
    </div>
  );
};

export default Draw;