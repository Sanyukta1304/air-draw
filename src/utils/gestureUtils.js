export const getFingerState = (landmarks) => {
  if (!landmarks || landmarks.length < 21) return null;

  // More reliable check: compare tip with MCP (base joint)
  const indexUp = landmarks[8].y < landmarks[5].y;
  const middleUp = landmarks[12].y < landmarks[9].y;
  const ringUp = landmarks[16].y < landmarks[13].y;
  const pinkyUp = landmarks[20].y < landmarks[17].y;

  return {
    indexUp,
    middleUp,
    ringUp,
    pinkyUp,
  };
};

export const detectGesture = (landmarks) => {
  const fingers = getFingerState(landmarks);
  if (!fingers) {
    return {
      mode: "TRACKING",
      fingers: {},
    };
  }

  const { indexUp, middleUp, ringUp, pinkyUp } = fingers;

  let mode = "TRACKING";

  if (indexUp && !middleUp && !ringUp && !pinkyUp) {
    mode = "DRAWING";
  } else if (indexUp && middleUp && ringUp && pinkyUp) {
    mode = "ERASING";
  } else if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
    mode = "IDLE";
  }

  return {
    mode,
    fingers,
  };
};