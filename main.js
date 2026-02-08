import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { API_KEY } from './config.js';

let targetEmotion = "neutral";
let emotionWeight = 0; // 0 = not showing, 1 = fully showing
let currentAction = 'idle';
let actionTimer = 0;
let actionLookTarget = new THREE.Vector3(0, 1.3, 1); // Where she's looking
let mouseControlWeight = 1.0; // 1 = following mouse, 0 = action takes over
// Add a listener at the top
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

// 1. Setup the Scene
const scene = new THREE.Scene();

// 2. Setup the Camera (Field of view, Aspect ratio, Near, Far)
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20.0);
camera.position.set(0.2, 1.3, 1.4); // Position it to look at the character's face

// 3. Setup the Renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// 4. Add Lights
// Ambient light is soft and hits everything equally. 0.4 is nice and chill.
const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

// Directional light creates depth.
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

// 5. Load the VRM Model
let currentVrm = undefined;
const loader = new GLTFLoader();

// Install the VRM plugin into the loader
loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
});

loader.load(
    'model.vrm', // Make sure your file is named exactly this!
    (gltf) => {
        const vrm = gltf.userData.vrm;
        currentVrm = vrm;

        currentVrm.expressionManager.transitionDuration = 0.1;

        scene.add(vrm.scene);

        // Rotate the model so it faces the camera
        vrm.scene.rotation.y = 0;
        console.log("Assis-chan is here!");
    },
    (progress) => console.log('Loading...', (100.0 * progress.loaded / progress.total), '%'),
    (error) => console.error(error)
);

// 6. The Animation Loop (Runs 60 times a second)
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (currentVrm) {
        // 1. SMOOTH EXPRESSIONS (Keep this as is)
        const expressions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'aa'];
        expressions.forEach(name => {
            let current = currentVrm.expressionManager.getValue(name);
            let goal = (name === targetEmotion) ? emotionWeight : 0;

            if (name === 'aa') {
                // The mouth follows the target we set in the speech function
                goal = mouthOpenTarget; 
            } else if (name === targetEmotion) {
                goal = emotionWeight;
            }

            currentVrm.expressionManager.setValue(name, THREE.MathUtils.lerp(current, goal, 0.1));

        
        });

        // 2. DEFINE THE BONES
        const head = currentVrm.humanoid.getNormalizedBoneNode('head');
        const chest = currentVrm.humanoid.getNormalizedBoneNode('spine');
        const leftArm = currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
        const rightArm = currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
        const rightElbow = currentVrm.humanoid.getNormalizedBoneNode('rightLowerArm');
        // Add these where you define your bones
        const wrist = currentVrm.humanoid.getNormalizedBoneNode('rightHand');
        const thumb = currentVrm.humanoid.getNormalizedBoneNode('rightThumbProximal');
        const index = currentVrm.humanoid.getNormalizedBoneNode('rightIndexProximal');
        const middle = currentVrm.humanoid.getNormalizedBoneNode('rightMiddleProximal');
        const ring = currentVrm.humanoid.getNormalizedBoneNode('rightRingProximal');
        const little = currentVrm.humanoid.getNormalizedBoneNode('rightLittleProximal');

        if (wrist) {
            // Try .x or .y if .z doesn't rotate the palm toward her face
            wrist.rotation.x = THREE.MathUtils.lerp(wrist.rotation.x, targetWristRZ, 0.1);
        }

        // 3. BASE IDLE (Breathing/Sway)
        // We calculate these but might override them in the switch
        let targetHeadX = Math.sin(elapsed * 0.8) * 0.04;
        let targetHeadY = Math.sin(elapsed * 0.4) * 0.08;
        let targetArmRZ = 1.2; // Default right arm down
        targetArmRX = 0;
        targetElbowRY = 0;
        targetWristRZ = 0;
        targetFingerRotation = 0;
        // 4. ACTION OVERRIDES
        switch (currentAction) {
            case 'lookAround':
                targetHeadY = Math.sin(elapsed * -2) * 0.2;
                break;
            case 'checkNails':
                targetArmRZ = 1; 
                targetArmRX = -0.5;
                targetHeadX = 0.3;
                targetElbowRY = 2.6; 
                targetWristRZ = 0.1; // Turn the wrist more
                targetFingerRotation = 1.2; // Crank this up! (Approx 75 degrees)
                break;
            case 'nod':
                targetHeadX = Math.sin(elapsed * 10) * 0.1;
                break;
        }

        if (rightElbow) {
            rightElbow.rotation.y = THREE.MathUtils.lerp(rightElbow.rotation.y, targetElbowRY, 0.1);
        }

        // Wrist Rotation
        if (wrist) {
            wrist.rotation.z = THREE.MathUtils.lerp(wrist.rotation.z, targetWristRZ, 0.1);
        }

        // Finger Curls logic inside animate()
        // Finger Curls logic inside animate()
        const fingers = [thumb, index, middle, ring, little];
        fingers.forEach(bone => {
            if (bone) {
                // Switch from .x to .z 
                // Also try a bigger value like 1.2 in the 'checkNails' case
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, targetFingerRotation, 0.1);
            }
        });

        // Inside animate(), replace your head rotation logic with this:
        // Inside animate() ...
        if (head) {
            const lookSpeed = 0.1;

            // Calculate where the MOUSE wants her to look
            let mouseLookX = mouseY * 0.3;
            let mouseLookY = mouseX * 0.2;

            // Combine them! 
            // If mouseControlWeight is 0, it uses ONLY targetHeadX (from your switch case)
            // If mouseControlWeight is 1, it uses ONLY mouseLookX
            let finalHeadX = THREE.MathUtils.lerp(targetHeadX, mouseLookX, mouseControlWeight);
            let finalHeadY = THREE.MathUtils.lerp(targetHeadY, mouseLookY, mouseControlWeight);

            head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, finalHeadX, lookSpeed);
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, finalHeadY, lookSpeed);
        }
        if (chest) {
            chest.rotation.x = Math.sin(elapsed * 1.2) * 0.02; // Breathing
            chest.rotation.z = Math.sin(elapsed * 0.5) * 0.03; // Sway
        }
        if (rightArm) {
            rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, targetArmRZ, 0.1);
            rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, targetArmRX, 0.1);
        }
        if (leftArm) {
            leftArm.rotation.z = -1.2; // Keep left arm stable
        }

        const blinkScale = Math.max(0, Math.sin(elapsed * 1.5) * 20 - 18); 
        // This creates a quick spike occasionally
        currentVrm.expressionManager.setValue('blink', blinkScale);

        currentVrm.update(deltaTime);
    }
    renderer.render(scene, camera);
}

animate();

function pickRandomAction() {
    const actions = ['idle', 'lookAround', 'checkNails', 'nod'];
    currentAction = actions[Math.floor(Math.random() * actions.length)];

    // If she's checking her nails, she shouldn't be looking at you!
    if (currentAction === 'checkNails' || currentAction === 'lookAround') {
        mouseControlWeight = 0; 
    } else {
        mouseControlWeight = 1.0;
    }

    setTimeout(() => {
        currentAction = 'idle';
        mouseControlWeight = 1.0; // Give control back to mouse
    }, 10000);
}

setInterval(pickRandomAction, 5000);

const gen_AI = new GoogleGenerativeAI(API_KEY);
const model = gen_AI.getGenerativeModel({
    model: "gemini-2.5-flash",
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

    // 1. Show user message
    const userDiv = document.createElement('div');
    userDiv.className = "message user"; // Add some CSS for .user later!
    userDiv.innerText = text;
    chatHistory.appendChild(userDiv);
    inputField.value = "";

    // 2. Get AI Response
    try {
        const aiResponse = await askQiqi(text);
        handleQiqiResponse(aiResponse);
    } catch (error) {
        console.error("Gemini failed:", error);
    }
});

// This function will handle her emotions + text later
function handleQiqiResponse(fullText) {
    const emotionMatch = fullText.match(/\[(.*?)\]/);
    let emotion = "neutral";
    let cleanText = fullText;

    if (emotionMatch) {
        emotion = emotionMatch[1].toLowerCase();
        cleanText = fullText.replace(emotionMatch[0], "").trim();
    }

    if (currentVrm) {
        // Tell the smoothing engine to fade IN this emotion
        targetEmotion = emotion;
        emotionWeight = 1.0;

        // After 4 seconds, tell it to fade OUT
        setTimeout(() => {
            emotionWeight = 0;
            targetEmotion = 'neutral';
        }, 4000);

    }

    // UI and Speech code...
    const botDiv = document.createElement('div');
    botDiv.className = "message bot";
    botDiv.innerText = cleanText;
    chatHistory.appendChild(botDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = 'en-US';

    // 1. Create the interval immediately
    const mouthInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
            // Vary the opening for a "talking" effect
            // 0.2 to 0.8 keeps it from looking too robotic or closing fully mid-word
            mouthOpenTarget = 0.2 + (Math.random() * 0.6); 
        } else {
            mouthOpenTarget = 0;
            clearInterval(mouthInterval);
        }
    }, 100); // 100ms is a bit snappier for speech

    // 2. Play it
    window.speechSynthesis.speak(speech);

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