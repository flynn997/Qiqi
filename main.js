import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY;
const ELEVEN_API_KEY = import.meta.env.VITE_ELEVENLABS_KEY;
const VOICE_ID = import.meta.env.VITE_VOICE_ID || "21m00Tcm4lcv85compute";

let targetEmotion = "neutral";
let emotionWeight = 0; 
let currentAction = 'idle';
let actionTimer = 0;
let actionLookTarget = new THREE.Vector3(0, 1.3, 1);
let mouseControlWeight = 1.0; 
let mouseX = 0, mouseY = 0;
let targetArmRX = 0;
let targetElbowRY = 0;
let targetWristRZ = 0;
let targetFingerRotation = 0;
let mouthOpenTarget = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20.0);
camera.position.set(0.2, 1.3, 1.4);

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

let currentVrm = undefined;
const loader = new GLTFLoader();

loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
});

loader.load(
    './model.vrm',
    (gltf) => {
        const vrm = gltf.userData.vrm;
        currentVrm = vrm;

        currentVrm.expressionManager.transitionDuration = 0.1;

        scene.add(vrm.scene);

        vrm.scene.rotation.y = 0;
        console.log("Assis-chan is here!");
    },
    (progress) => console.log('Loading...', (100.0 * progress.loaded / progress.total), '%'),
    (error) => console.error(error)
);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (currentVrm) {
        const expressions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'aa'];
        expressions.forEach(name => {
            let current = currentVrm.expressionManager.getValue(name);
            let goal = (name === targetEmotion) ? emotionWeight : 0;

            if (name === 'aa') {
                goal = mouthOpenTarget; 
            } else if (name === targetEmotion) {
                goal = emotionWeight;
            }

            currentVrm.expressionManager.setValue(name, THREE.MathUtils.lerp(current, goal, 0.1));

        
        });

        const head = currentVrm.humanoid.getNormalizedBoneNode('head');
        const chest = currentVrm.humanoid.getNormalizedBoneNode('spine');
        const leftArm = currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
        const rightArm = currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
        const rightElbow = currentVrm.humanoid.getNormalizedBoneNode('rightLowerArm');
        const wrist = currentVrm.humanoid.getNormalizedBoneNode('rightHand');
        const thumb = currentVrm.humanoid.getNormalizedBoneNode('rightThumbProximal');
        const index = currentVrm.humanoid.getNormalizedBoneNode('rightIndexProximal');
        const middle = currentVrm.humanoid.getNormalizedBoneNode('rightMiddleProximal');
        const ring = currentVrm.humanoid.getNormalizedBoneNode('rightRingProximal');
        const little = currentVrm.humanoid.getNormalizedBoneNode('rightLittleProximal');

        if (wrist) {
            wrist.rotation.x = THREE.MathUtils.lerp(wrist.rotation.x, targetWristRZ, 0.1);
        }

        let targetHeadX = Math.sin(elapsed * 0.8) * 0.04;
        let targetHeadY = Math.sin(elapsed * 0.4) * 0.08;
        let targetArmRZ = 1.2;
        targetArmRX = 0;
        targetElbowRY = 0;
        targetWristRZ = 0;
        targetFingerRotation = 0;
        switch (currentAction) {
            case 'lookAround':
                targetHeadY = Math.sin(elapsed * -2) * 0.2;
                break;
            case 'checkNails':
                targetArmRZ = 1; 
                targetArmRX = -0.5;
                targetHeadX = 0.3;
                targetElbowRY = 2.6; 
                targetWristRZ = 0.1;
                targetFingerRotation = 1.2;
                break;
            case 'nod':
                targetHeadX = Math.sin(elapsed * 10) * 0.1;
                break;
        }

        if (rightElbow) {
            rightElbow.rotation.y = THREE.MathUtils.lerp(rightElbow.rotation.y, targetElbowRY, 0.1);
        }
        if (wrist) {
            wrist.rotation.z = THREE.MathUtils.lerp(wrist.rotation.z, targetWristRZ, 0.1);
        }

        const fingers = [thumb, index, middle, ring, little];
        fingers.forEach(bone => {
            if (bone) {
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, targetFingerRotation, 0.1);
            }
        });

        if (head) {
            const lookSpeed = 0.1;

            let mouseLookX = mouseY * 0.3;
            let mouseLookY = mouseX * 0.2;
            let finalHeadX = THREE.MathUtils.lerp(targetHeadX, mouseLookX, mouseControlWeight);
            let finalHeadY = THREE.MathUtils.lerp(targetHeadY, mouseLookY, mouseControlWeight);

            head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, finalHeadX, lookSpeed);
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, finalHeadY, lookSpeed);
        }
        if (chest) {
            chest.rotation.x = Math.sin(elapsed * 1.2) * 0.02;
            chest.rotation.z = Math.sin(elapsed * 0.5) * 0.03;
        }
        if (rightArm) {
            rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, targetArmRZ, 0.1);
            rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, targetArmRX, 0.1);
        }
        if (leftArm) {
            leftArm.rotation.z = -1.2;
        }

        const blinkScale = Math.max(0, Math.sin(elapsed * 1.5) * 20 - 18); 
        currentVrm.expressionManager.setValue('blink', blinkScale);

        currentVrm.update(deltaTime);
    }
    renderer.render(scene, camera);
}

animate();

function pickRandomAction() {
    const actions = ['idle', 'lookAround', 'checkNails', 'nod'];
    currentAction = actions[Math.floor(Math.random() * actions.length)];

    // If checking nails wont be looking at cam
    if (currentAction === 'checkNails' || currentAction === 'lookAround') {
        mouseControlWeight = 0; 
    } else {
        mouseControlWeight = 1.0;
    }

    setTimeout(() => {
        currentAction = 'idle';
        mouseControlWeight = 1.0;
    }, 10000);
}

setInterval(pickRandomAction, 5000);

const gen_AI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = gen_AI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: "Your name is Qiqi. You are a helpful AI anime girl. Every time you respond, you MUST start your message with an emotion tag like [HAPPY], [SAD], [ANGRY], or [SURPRISED]. Keep your answers short and cute.",
});

async function askQiqi(prompt) {
    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
}

const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');

sendBtn.addEventListener('click', async () => {
    const text = inputField.value;
    if (!text) return;

    const userDiv = document.createElement('div');
    userDiv.className = "message user";
    userDiv.innerText = text;
    chatHistory.appendChild(userDiv);
    inputField.value = "";

    try {
        const aiResponse = await askQiqi(text);
        handleQiqiResponse(aiResponse);
    } catch (error) {
        console.error("Gemini failed:", error);
    }
});

function handleQiqiResponse(fullText) {
    const emotionMatch = fullText.match(/\[(.*?)\]/);
    let emotion = "neutral";
    let cleanText = fullText;

    if (emotionMatch) {
        emotion = emotionMatch[1].toLowerCase();
        cleanText = fullText.replace(emotionMatch[0], "").trim();
    }

    if (currentVrm) {
        targetEmotion = emotion;
        emotionWeight = 1.0;

        setTimeout(() => {
            emotionWeight = 0;
            targetEmotion = 'neutral';
        }, 4000);

    }

    const botDiv = document.createElement('div');
    botDiv.className = "message bot";
    botDiv.innerText = cleanText;
    chatHistory.appendChild(botDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    async function speakWithElevenLabs(text) {
        try {
            console.log("🚀 Sending request to ElevenLabs...");
            
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVEN_API_KEY // Changed from CONFIG.ELEVENLABS_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_flash_v2_5", 
                    voice_settings: { 
                        stability: 0.5, 
                        similarity_boost: 0.75, 
                        style: 0.0,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ ElevenLabs Error ${response.status}:`, errorText);
                throw new Error("API responded with an error");
            }

            console.log("✅ Audio received! Processing...");
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio();
            audio.src = audioUrl;
            audio.volume = 1.0;

            // This ensures the audio is fully loaded before we try to play
            audio.oncanplaythrough = () => {
                console.log("🔊 Audio is ready to scream!");
                audio.play().catch(e => console.error("Playback failed:", e));
            };

            // Mouth flap logic starts when the audio actually starts playing
            audio.onplay = () => {
                const mouthInterval = setInterval(() => {
                    if (!audio.paused && !audio.ended) {
                        // Random flap between 0.2 and 0.8
                        mouthOpenTarget = 0.2 + (Math.random() * 0.6); 
                    } else {
                        mouthOpenTarget = 0;
                        clearInterval(mouthInterval);
                    }
                }, 100);
            };

        } catch (error) {
            console.error("ElevenLabs failed:", error);
            // Fallback so Qiqi isn't silent if the API hits a limit
            const fallback = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(fallback);
        }
    }

    speakWithElevenLabs(cleanText);
}

//themee-----------------------------------
//btns
const lbtn = document.getElementById('lbtn');
const dbtn = document.getElementById('dbtn');
//parts
const sidep = document.getElementById('side-panel');
//other
const showL = document.querySelector('.lbtn');
const body = document.body;

dbtn.addEventListener('click', function() {
  body.classList.toggle('darkmode');
  dbtn.classList.toggle('hidden');
  showL.style.display = "block";
});

lbtn.addEventListener('click', function() {
  body.classList.toggle('darkmode');
  dbtn.classList.toggle('hidden');
  showL.style.display = "none";
});