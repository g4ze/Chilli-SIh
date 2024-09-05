import React, { useRef, useEffect, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

const PushupDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [pushupCount, setPushupCount] = useState(0);
  const [feedback, setFeedback] = useState('Fix Form');
  let form=0
  let direction = 0;
  useEffect(() => {
    const setupCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(handlePoseResults);

      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            await pose.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });
        camera.start();
      }
    };

    setupCamera();
  }, []);

  const handlePoseResults = (results) => {
    const landmarks = results.poseLandmarks;
    if (!landmarks) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    detectPushup(landmarks, canvasRef, setFeedback, setPushupCount, form, direction);
    
    drawSkeleton(ctx, landmarks);
  };

  const drawSkeleton = (ctx, landmarks) => {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    // Draw landmarks and connections (similar to the previous example)
    const connections = [
      [11, 13], [13, 15], [23, 25], [25, 27], // Left arm and leg
      [12, 14], [14, 16], [24, 26], [26, 28], // Right arm and leg
    ];

    connections.forEach(([i, j]) => {
      const start = landmarks[i];
      const end = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(start.x * canvasRef.current.width, start.y * canvasRef.current.height);
      ctx.lineTo(end.x * canvasRef.current.width, end.y * canvasRef.current.height);
      ctx.stroke();
    });
  };

  const calculateAngle = (A, B, C) => {
    const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  };
  const detectPushup = (landmarks) => {
    // Get canvas context inside detectPushup
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  
    const elbow = calculateAngle(landmarks[11], landmarks[13], landmarks[15]); // Left elbow
    const shoulder = calculateAngle(landmarks[13], landmarks[11], landmarks[23]); // Left shoulder
    const hip = calculateAngle(landmarks[11], landmarks[23], landmarks[25]); // Left hip
  
    // Push-up progress calculation
    const per = ((elbow - 90) / (160 - 90)) * 100;
    const bar = ((elbow - 90) / (160 - 90)) * (380 - 50) + 50;
  
    // Check form correctness
    if (elbow > 160 && shoulder > 40 && hip > 160) {
      form = 1;
    }
  
    // Count push-up reps based on motion range
    if (form === 1) {
      if (per <= 0) {
        if (elbow <= 90 && hip > 160) {
          setFeedback('Up');
          if (direction === 0) {
            setPushupCount((count) => count + 0.5);
            direction = 1;
          }
        } else {
          setFeedback('Fix Form');
        }
      }
      if (per >= 100) {
        if (elbow > 160 && shoulder > 40 && hip > 160) {
          setFeedback('Down');
          if (direction === 1) {
            setPushupCount((count) => count + 0.5);
            direction = 0;
          }
        } else {
          setFeedback('Fix Form');
        }
      }
      // Draw progress bar and push-up counter
    // drawProgress(ctx, bar, per);
    }
  
  };
  

  const drawProgress = (ctx, bar, per) => {
    ctx.fillStyle = 'green';
    ctx.fillRect(580, bar, 20, 380 - bar); // Draw progress bar
    ctx.font = '20px Arial';
    ctx.fillText(`${Math.round(per)}%`, 565, 430); // Display percentage
  };

  return (
    <div>
      <div>
        <button onClick={() => setPushupCount(0)}>Reset Push-up Count</button>
      </div>
      <div>Push-up Count: {Math.floor(pushupCount)}</div>
      <div>Feedback: {feedback}</div>
      <video
        ref={videoRef}
        width="640"
        height="480"
        autoPlay
        style={{
          position: 'absolute',
          top: 50,
          left: 0,
          transform: 'scaleX(-1)'
        }}
      />
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{
          position: 'absolute',
          top: 50,
          left: 0,
          transform: 'scaleX(-1)'
        }}
      />
    </div>
  );
};

export default PushupDetection;
