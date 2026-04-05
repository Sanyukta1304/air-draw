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

  const prevPointRef = useRef(null);
  const smoothedPointRef = useRef(null);
  const smoothedDragPointRef = useRef(null);

  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);

  const isMovingRef = useRef(false);
  const pinchPointRef = useRef(null);
  const selectedStrokeIndexRef = useRef(null);

  const getGlowBlur = (glow) => Math.max((glow / 100) * 18, 0);

  const smoothPoint = (newX, newY, ref, factor = 0.22) => {
    if (!ref.current) {
      ref.current = { x: newX, y: newY };
      return ref.current;
    }

    const prev = ref.current;
    const smoothX = prev.x + (newX - prev.x) * factor;
    const smoothY = prev.y + (newY - prev.y) * factor;

    ref.current = { x: smoothX, y: smoothY };
    return ref.current;
  };

  const getDistance = (p1, p2) => {
    if (!p1 || !p2) return 0;
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  };

  const findClosestStrokeIndex = (x, y) => {
    if (strokesRef.current.length === 0) return null;

    let closestStrokeIndex = null;
    let closestDistance = Infinity;

    strokesRef.current.forEach((stroke, strokeIndex) => {
      if (!stroke?.points?.length) return;

      stroke.points.forEach((pt) => {
        const d = Math.hypot(pt.x - x, pt.y - y);
        if (d < closestDistance) {
          closestDistance = d;
          closestStrokeIndex = strokeIndex;
        }
      });
    });

    return closestDistance <= 45 ? closestStrokeIndex : null;
  };

  const moveSelectedStroke = (dx, dy) => {
    const index = selectedStrokeIndexRef.current;
    if (index === null || index < 0 || index >= strokesRef.current.length) return;

    const stroke = strokesRef.current[index];
    strokesRef.current[index] = {
      ...stroke,
      points: stroke.points.map((pt) => ({
        x: pt.x + dx,
        y: pt.y + dy,
      })),
    };
  };

  const redrawStrokes = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    strokesRef.current.forEach((stroke, index) => {
      if (!stroke.points || stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      const isSelected =
        index === selectedStrokeIndexRef.current && isMovingRef.current;

      if (stroke.color === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "rgba(0,0,0,1)";
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
              color: "rgba(255,255,255,0.22)",
              lineWidth: 2,
            });

            drawLandmarks(landmarkCtx, landmarks, {
              color: "rgba(255,255,255,0.88)",
              lineWidth: 1,
              radius: 3,
            });

            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];

            const indexX = indexTip.x * width;
            const indexY = indexTip.y * height;
            const thumbX = thumbTip.x * width;
            const thumbY = thumbTip.y * height;

            const indexUp = landmarks[8].y < landmarks[6].y;
            const middleUp = landmarks[12].y < landmarks[10].y;
            const ringUp = landmarks[16].y < landmarks[14].y;
            const pinkyUp = landmarks[20].y < landmarks[18].y;

            const isDrawGesture =
              indexUp && !middleUp && !ringUp && !pinkyUp;

            const isOpenPalm =
              indexUp && middleUp && ringUp && pinkyUp;

            const isIdleGesture =
              !indexUp && !middleUp && !ringUp && !pinkyUp;

            const pinchDistance = Math.hypot(thumbX - indexX, thumbY - indexY);
            const isPinching = pinchDistance < 42 && !isDrawGesture && !isOpenPalm;

            const palmCenterX =
              ((landmarks[0].x +
                landmarks[5].x +
                landmarks[9].x +
                landmarks[13].x +
                landmarks[17].x) /
                5) *
              width;

            const palmCenterY =
              ((landmarks[0].y +
                landmarks[5].y +
                landmarks[9].y +
                landmarks[13].y +
                landmarks[17].y) /
                5) *
              height;

            const eraseRadius = Math.max(brushSize + 18, 24);
            const activeSize = isOpenPalm
              ? eraseRadius * 2
              : brushSize;

            const glowBlur = getGlowBlur(glowValue);

            // Visual markers
            if (isOpenPalm) {
              landmarkCtx.save();
              landmarkCtx.beginPath();
              landmarkCtx.arc(
                palmCenterX,
                palmCenterY,
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
              const pinchRawX = (thumbX + indexX) / 2;
              const pinchRawY = (thumbY + indexY) / 2;

              landmarkCtx.save();
              landmarkCtx.beginPath();
              landmarkCtx.arc(pinchRawX, pinchRawY, 12, 0, Math.PI * 2);
              landmarkCtx.fillStyle = "rgba(255,214,0,0.16)";
              landmarkCtx.fill();

              landmarkCtx.beginPath();
              landmarkCtx.arc(pinchRawX, pinchRawY, 12, 0, Math.PI * 2);
              landmarkCtx.lineWidth = 2;
              landmarkCtx.strokeStyle = "#ffd600";
              landmarkCtx.shadowColor = "#ffd600";
              landmarkCtx.shadowBlur = 10;
              landmarkCtx.stroke();
              landmarkCtx.restore();
            } else {
              landmarkCtx.beginPath();
              landmarkCtx.arc(indexX, indexY, 10, 0, Math.PI * 2);
              landmarkCtx.fillStyle = "red";
              landmarkCtx.shadowColor = "red";
              landmarkCtx.shadowBlur = 10;
              landmarkCtx.fill();
              landmarkCtx.shadowBlur = 0;
            }

            // 1. MOVE has highest priority
            if (isPinching) {
              if (currentStrokeRef.current) {
                if (currentStrokeRef.current.points.length > 1) {
                  strokesRef.current.push(currentStrokeRef.current);
                }
                currentStrokeRef.current = null;
              }

              const pinchRawX = (thumbX + indexX) / 2;
              const pinchRawY = (thumbY + indexY) / 2;

              const smoothPinch = smoothPoint(
                pinchRawX,
                pinchRawY,
                smoothedDragPointRef,
                0.28
              );

              const pinchX = smoothPinch.x;
              const pinchY = smoothPinch.y;

              setMode("MOVING");

              if (!isMovingRef.current) {
                const pickedIndex = findClosestStrokeIndex(pinchX, pinchY);
                selectedStrokeIndexRef.current = pickedIndex;

                if (pickedIndex !== null) {
                  isMovingRef.current = true;
                  pinchPointRef.current = { x: pinchX, y: pinchY };
                  redrawStrokes();
                }
              } else if (
                pinchPointRef.current &&
                selectedStrokeIndexRef.current !== null
              ) {
                const dx = pinchX - pinchPointRef.current.x;
                const dy = pinchY - pinchPointRef.current.y;

                if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) {
                  moveSelectedStroke(dx, dy);
                  redrawStrokes();
                }

                pinchPointRef.current = { x: pinchX, y: pinchY };
              }

              prevPointRef.current = null;
              smoothedPointRef.current = null;
              return;
            }

            // End move when pinch released
            if (isMovingRef.current) {
              isMovingRef.current = false;
              pinchPointRef.current = null;
              smoothedDragPointRef.current = null;
              redrawStrokes();
              selectedStrokeIndexRef.current = null;
            }

            // 2. ERASE
            if (isOpenPalm) {
              setMode("ERASING");

              const smoothed = smoothPoint(
                palmCenterX,
                palmCenterY,
                smoothedPointRef,
                0.22
              );

              const activeX = smoothed.x;
              const activeY = smoothed.y;

              if (!currentStrokeRef.current) {
                currentStrokeRef.current = {
                  color: "erase",
                  size: activeSize,
                  glowBlur: 0,
                  points: [{ x: activeX, y: activeY }],
                };
              } else {
                const lastPoint =
                  currentStrokeRef.current.points[
                    currentStrokeRef.current.points.length - 1
                  ];

                const moveDistance = getDistance(lastPoint, {
                  x: activeX,
                  y: activeY,
                });

                if (moveDistance > 2.2) {
                  currentStrokeRef.current.points.push({
                    x: activeX,
                    y: activeY,
                  });
                }
              }

              if (prevPointRef.current) {
                const lineDistance = getDistance(prevPointRef.current, {
                  x: activeX,
                  y: activeY,
                });

                if (lineDistance > 1.8) {
                  drawCtx.beginPath();
                  drawCtx.moveTo(prevPointRef.current.x, prevPointRef.current.y);
                  drawCtx.lineTo(activeX, activeY);
                  drawCtx.globalCompositeOperation = "destination-out";
                  drawCtx.strokeStyle = "rgba(0,0,0,1)";
                  drawCtx.shadowBlur = 0;
                  drawCtx.shadowColor = "transparent";
                  drawCtx.lineWidth = activeSize;
                  drawCtx.lineCap = "round";
                  drawCtx.lineJoin = "round";
                  drawCtx.stroke();
                  drawCtx.globalCompositeOperation = "source-over";
                }
              }

              prevPointRef.current = { x: activeX, y: activeY };
              return;
            }

            // 3. DRAW
            if (isDrawGesture) {
              setMode("DRAWING");

              const smoothed = smoothPoint(
                indexX,
                indexY,
                smoothedPointRef,
                0.22
              );

              const activeX = smoothed.x;
              const activeY = smoothed.y;

              if (!currentStrokeRef.current) {
                currentStrokeRef.current = {
                  color: selectedColor,
                  size: brushSize,
                  glowBlur,
                  points: [{ x: activeX, y: activeY }],
                };
              } else {
                const lastPoint =
                  currentStrokeRef.current.points[
                    currentStrokeRef.current.points.length - 1
                  ];

                const moveDistance = getDistance(lastPoint, {
                  x: activeX,
                  y: activeY,
                });

                if (moveDistance > 2.2) {
                  currentStrokeRef.current.points.push({
                    x: activeX,
                    y: activeY,
                  });
                }
              }

              if (prevPointRef.current) {
                const lineDistance = getDistance(prevPointRef.current, {
                  x: activeX,
                  y: activeY,
                });

                if (lineDistance > 1.8) {
                  drawCtx.beginPath();
                  drawCtx.moveTo(prevPointRef.current.x, prevPointRef.current.y);
                  drawCtx.lineTo(activeX, activeY);
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

              prevPointRef.current = { x: activeX, y: activeY };
              return;
            }

            // 4. IDLE
            if (isIdleGesture) {
              setMode("IDLE");

              if (currentStrokeRef.current) {
                if (currentStrokeRef.current.points.length > 1) {
                  strokesRef.current.push(currentStrokeRef.current);
                }
                currentStrokeRef.current = null;
              }

              prevPointRef.current = null;
              smoothedPointRef.current = null;
              return;
            }

            // 5. READY
            setMode("READY");

            if (currentStrokeRef.current) {
              if (currentStrokeRef.current.points.length > 1) {
                strokesRef.current.push(currentStrokeRef.current);
              }
              currentStrokeRef.current = null;
            }

            prevPointRef.current = null;
            smoothedPointRef.current = null;
          } else {
            setMode("READY");

            if (currentStrokeRef.current) {
              if (currentStrokeRef.current.points.length > 1) {
                strokesRef.current.push(currentStrokeRef.current);
              }
              currentStrokeRef.current = null;
            }

            isMovingRef.current = false;
            pinchPointRef.current = null;
            smoothedDragPointRef.current = null;
            selectedStrokeIndexRef.current = null;
            prevPointRef.current = null;
            smoothedPointRef.current = null;
            redrawStrokes();
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
  }, [selectedColor, brushSize, glowValue]);

  const handleClearCanvas = () => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const drawCtx = drawCanvas.getContext("2d");
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    strokesRef.current = [];
    currentStrokeRef.current = null;
    prevPointRef.current = null;
    smoothedPointRef.current = null;
    isMovingRef.current = false;
    pinchPointRef.current = null;
    smoothedDragPointRef.current = null;
    selectedStrokeIndexRef.current = null;
    setMode("READY");
  };

  const handleUndo = () => {
    if (currentStrokeRef.current) {
      currentStrokeRef.current = null;
    }

    strokesRef.current.pop();
    prevPointRef.current = null;
    smoothedPointRef.current = null;
    isMovingRef.current = false;
    pinchPointRef.current = null;
    smoothedDragPointRef.current = null;
    selectedStrokeIndexRef.current = null;
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
          glowValue={glowValue}
          onGlowChange={setGlowValue}
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