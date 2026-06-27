import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { Camera, CheckCircle2, HeartPulse } from "./icons.jsx";

const poseOptions = [
  "Mountain pose",
  "Warrior pose",
  "Tree pose",
  "Downward dog",
  "Forward fold",
  "Stretching",
];

const MEDIAPIPE_REFRESH_MS = 650;
const LOCAL_CV_FALLBACK_MS = 4000;

const landmarkPairs = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function scoreLandmarks(landmarks, pose) {
  if (!landmarks?.length) {
    return {
      postureScore: 0,
      feedback: [],
      corrections: ["Step fully into frame so your shoulders, hips, knees, and ankles are visible."],
      riskLevel: "unknown",
      nextCue: "Move back from the camera until your full body is visible.",
      provider: "mediapipe",
    };
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const visible = [leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].filter(
    (point) => point && (point.visibility ?? 1) > 0.45,
  );

  let score = 100;
  const feedback = [];
  const corrections = [];

  if (visible.length < 6) {
    score -= 35;
    corrections.push("Show more of your full body so AfiaCare can judge alignment.");
  }

  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  const hipTilt = Math.abs(leftHip.y - rightHip.y);
  const torsoLean = Math.abs(midpoint(leftShoulder, rightShoulder).x - midpoint(leftHip, rightHip).x);
  const stanceWidth = Math.abs(leftAnkle.x - rightAnkle.x);

  if (shoulderTilt > 0.07) {
    score -= 14;
    corrections.push("Level your shoulders and relax them away from your ears.");
  } else {
    feedback.push("Shoulders look mostly level.");
  }

  if (hipTilt > 0.08) {
    score -= 12;
    corrections.push("Even out your hips before holding the pose.");
  } else {
    feedback.push("Hips look steady.");
  }

  if (torsoLean > 0.13 && !["Warrior pose", "Forward fold", "Downward dog"].includes(pose)) {
    score -= 14;
    corrections.push("Bring your ribs back above your hips.");
  }

  if (pose === "Mountain pose" && stanceWidth > 0.32) {
    score -= 8;
    corrections.push("For mountain pose, bring your feet closer to hip width.");
  }

  if (pose === "Warrior pose" && stanceWidth < 0.28) {
    score -= 10;
    corrections.push("Widen your stance for warrior pose and keep your front knee soft.");
  }

  if (pose === "Tree pose") {
    const kneeDifference = Math.abs(leftKnee.x - rightKnee.x);
    if (kneeDifference < 0.08) {
      score -= 10;
      corrections.push("Turn the lifted knee outward gently, but avoid pushing into pain.");
    }
  }

  if (pose === "Downward dog") {
    const hipY = midpoint(leftHip, rightHip).y;
    const shoulderY = midpoint(leftShoulder, rightShoulder).y;
    if (hipY > shoulderY) {
      score -= 12;
      corrections.push("Lift your hips higher and press the floor away.");
    }
  }

  const postureScore = Math.max(20, Math.min(100, Math.round(score)));
  const nextCue =
    corrections[0] ||
    (postureScore > 85 ? "Hold steady for three slow breaths." : "Make one small adjustment and check again.");

  return {
    postureScore,
    feedback,
    corrections: corrections.length ? corrections.slice(0, 3) : ["Keep breathing slowly and maintain this alignment."],
    riskLevel: postureScore < 55 ? "medium" : "low",
    nextCue,
    provider: "mediapipe",
  };
}

export default function LivePostureCoach() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const analyzingRef = useRef(false);
  const lastLocalCvRef = useRef(0);
  const [pose, setPose] = useState("Mountain pose");
  const [active, setActive] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [engineStatus, setEngineStatus] = useState("MediaPipe ready to load");

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const loadMediaPipe = async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setEngineStatus("Loading MediaPipe Lite...");
    const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/models/pose_landmarker_lite.task",
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
      outputSegmentationMasks: false,
    });
    setEngineStatus("MediaPipe Lite active");
    return landmarkerRef.current;
  };

  const stopCamera = () => {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
    analyzingRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  const startCamera = async () => {
    setError("");
    try {
      await loadMediaPipe();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
      window.setTimeout(() => analyzeFrame(), 250);
      timerRef.current = window.setInterval(() => {
        analyzeFrame();
      }, MEDIAPIPE_REFRESH_MS);
    } catch (requestError) {
      setEngineStatus("MediaPipe unavailable");
      setError(requestError.message || "Camera permission is needed for live posture correction.");
    }
  };

  const drawLandmarks = (landmarks) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks?.length) return;

    context.strokeStyle = "rgba(245, 219, 122, 0.95)";
    context.lineWidth = 5;
    landmarkPairs.forEach(([from, to]) => {
      const a = landmarks[from];
      const b = landmarks[to];
      if (!a || !b || (a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) return;
      context.beginPath();
      context.moveTo(a.x * canvas.width, a.y * canvas.height);
      context.lineTo(b.x * canvas.width, b.y * canvas.height);
      context.stroke();
    });

    context.fillStyle = "rgba(255, 255, 255, 0.95)";
    landmarks.forEach((point) => {
      if ((point.visibility ?? 1) < 0.35) return;
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
      context.fill();
    });
  };

  const fallbackToLocalCv = async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) throw new Error("Camera frame is not ready.");
    const width = 320;
    const height = Math.round((video.videoHeight / video.videoWidth) * width);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.55);
    const response = await fetch("/api/posture-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl, pose }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Posture analysis failed.");
    return data;
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || analyzingRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    analyzingRef.current = true;
    setChecking(true);
    setError("");
    try {
      const landmarker = await loadMediaPipe();
      const result = landmarker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0] || [];
      drawLandmarks(landmarks);
      setAnalysis(scoreLandmarks(landmarks, pose));
    } catch (mediaPipeError) {
      try {
        const now = Date.now();
        if (now - lastLocalCvRef.current < LOCAL_CV_FALLBACK_MS) {
          throw mediaPipeError;
        }
        lastLocalCvRef.current = now;
        const localResult = await fallbackToLocalCv();
        setAnalysis(localResult);
        setEngineStatus("Local CV fallback active");
      } catch (requestError) {
        setError(requestError.message || mediaPipeError.message);
      }
    } finally {
      analyzingRef.current = false;
      setChecking(false);
    }
  };

  return (
    <section className="app-panel mt-6 p-5">
      <div className="flex flex-col gap-3 border-b-[3px] border-[var(--border-dark)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-uae-black">Live posture correction</h2>
          <p className="mt-1 text-sm leading-6 text-uae-muted">
            Runs MediaPipe Pose Landmarker Lite about twice per second, with local CV only as a backup.
          </p>
        </div>
        <span className="sketch-chip">
          {active ? "Camera live" : "Camera off"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="sketch-card relative overflow-hidden rounded-[22px] bg-uae-black">
            <video
              ref={videoRef}
              className="aspect-video w-full scale-x-[-1] object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]" />
          </div>
          <canvas ref={captureCanvasRef} className="hidden" />

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <select
              className="focus-ring sketch-select min-h-11 text-sm"
              value={pose}
              onChange={(event) => setPose(event.target.value)}
            >
              {poseOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <button
              className="focus-ring sketch-button sketch-button--dark min-h-11 gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              onClick={active ? analyzeFrame : startCamera}
              disabled={checking}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {active ? (checking ? "Checking..." : "Check now") : "Start camera"}
            </button>
            {active ? (
              <button
                className="focus-ring sketch-button sketch-button--secondary min-h-11 px-4 py-2 text-sm"
                onClick={stopCamera}
              >
                Stop
              </button>
            ) : null}
          </div>
        </div>

        <aside className="sketch-note p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-uae-green">Posture score</p>
              <h3 className="mt-1 text-3xl font-bold text-uae-black">
                {analysis ? `${analysis.postureScore}%` : "--"}
              </h3>
            </div>
            <span className="sketch-icon-wrap flex h-11 w-11 items-center justify-center bg-white text-uae-green">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <p className="mt-3 text-xs font-bold text-uae-muted">{engineStatus}</p>
          <p className="sketch-note mt-4 bg-white p-3 text-sm font-semibold text-uae-black">
            {analysis?.nextCue || "Start the camera, choose a pose, and AfiaCare will show alignment cues here."}
          </p>

          {analysis?.corrections?.length ? (
            <div className="mt-4">
              <p className="text-sm font-bold text-uae-muted">Corrections</p>
              <ul className="mt-2 grid gap-2">
                {analysis.corrections.map((item) => (
                  <li key={item} className="sketch-note flex gap-2 bg-white p-3 text-sm leading-6 text-uae-muted">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-uae-green" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="sketch-note mt-4 bg-white p-3 text-sm font-semibold text-uae-red">
              Posture engine unavailable: {error}
            </p>
          ) : null}
          <p className="mt-4 text-xs leading-5 text-uae-muted">
            Safety: this is posture guidance only. Stop if you feel pain, dizziness, chest pain, or numbness.
          </p>
        </aside>
      </div>
    </section>
  );
}
