# 🌸 Project Qiqi: 3D AI Companion
> A high-performance 3D interaction interface powered by Three.js and Google Gemini.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Three.js](https://img.shields.io/badge/Three.js-Black?logo=three.dot.js)](https://threejs.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Status](https://img.shields.io/badge/Status-Live-success)](#)

## 🚀 Live Demo
**[Launch Qiqi in Browser](https://flynn997.github.io/Qiqi/)**

---

## 🛠️ The Tech Stack
* **Frontend:** HTML5 / CSS3 / JavaScript (ES6 Modules)
* **3D Engine:** [Three.js](https://threejs.org/) using `VRMLoaderPlugin`
* **AI Engine:** [Google Gemini 2.0 Flash](https://ai.google.dev/) (Natural Language Processing)
* **Voice:** Web Speech API for real-time Text-to-Speech (TTS)

## ✨ Key Features
* **Real-time AI Chat:** Integrated with Gemini for responsive, intelligent dialogue.
* **Dynamic Expressions:** Qiqi reads the AI's "mood" from emotion tags (HAPPY, SAD, etc.) and updates facial morph targets.
* **Procedural Animation:** Includes "breathe" idle cycles and a "Check Nails" boredom animation.
* **Interactive Look-Target:** The model’s head and eyes track the user's cursor across the screen.
* **Dark/Light Mode:** Full UI theme support with persistence.

## 🧠 Development Challenges (The "Hard" Stuff)
* **Asset Pathing:** Resolved complex 404 issues on GitHub Pages by implementing relative pathing and `.nojekyll` bypass.
* **Lipsync Logic:** Built a custom bridge between the Web Speech API and the VRM `aa` expression for simulated yapping.
* **API Security:** Restricted API keys via Google Cloud Console to ensure the live demo remains secure and functional.

## 🗺️ Project Roadmap
This project is an ongoing exploration of 3D web interfaces. Here’s what’s coming next:

- [ ] **Phase 1: Animation Polish**
  - More animations
- [ ] **Phase 3: Interactivity**
  - Add Voice Recognition (STT) so you can actually talk to Qiqi.
  - Camera-based facial tracking.

## 📦 Installation & Setup
1. Clone the repo:
   ```bash
   git clone [https://github.com/flynn997/Qiqi.git](https://github.com/flynn997/Qiqi.git)