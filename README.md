# ✨ Air Draw – Gesture Based Drawing App

A modern **hand-gesture powered drawing application** built using **React + MediaPipe Hands**.
Draw in the air, erase with your palm, and move sketches using pinch — just like magic ✋✨

---

## 🚀 Features

### 🎨 Drawing

* Point your **index finger** to draw
* Smooth strokes with interpolation
* Adjustable **thickness & glow**

### 🖐 Erasing

* Show **open palm** to erase
* Soft circular eraser (like real brush)

### 🤏 Move (Apple Notes Style)

* **Pinch (thumb + index)** to grab drawings
* Move entire strokes smoothly
* Selected drawing glows **yellow while dragging**

### ✊ Idle Mode

* Close your hand → pause interaction
* Prevents accidental drawing

### 🎛 Control Panel

* Color palette 🎨
* Thickness slider
* Glow intensity slider
* Undo / Clear / Save

### 🎬 UI Experience

* Splash screen (SAN handwritten style)
* Instruction page with animations
* Glassmorphism + blur UI
* Smooth transitions & hover effects

---

## 🧠 Tech Stack

* ⚛️ React (Vite)
* 🎯 MediaPipe Hands (Google)
* 🎨 HTML5 Canvas
* 💅 CSS (No Tailwind)

---

## 📂 Project Structure

```
src/
 ├── components/
 │   ├── ControlPanel.jsx
 │   ├── StatusBadge.jsx
 │
 ├── pages/
 │   ├── Draw.jsx
 │   ├── Home.jsx
 │   ├── Splash.jsx
 │
 ├── styles/
 │   ├── draw.css
 │
 └── App.jsx
```

---

## ⚙️ Installation

```bash
# clone repo
git clone https://github.com/your-username/air-draw.git

# go to folder
cd air-draw

# install dependencies
npm install

# run project
npm run dev
```

Open 👉 `http://localhost:5173`

---

## 🎮 How to Use

| Gesture         | Action       |
| --------------- | ------------ |
| ☝️ Index finger | Draw         |
| 🖐 Open palm    | Erase        |
| 🤏 Pinch        | Move drawing |
| ✊ Closed hand   | Idle         |

---

## 📌 Future Improvements

* ✏️ Shape recognition (circle, square)
* 🎨 Multi-layer support
* 🤖 AI-based gesture prediction
* 📱 Mobile optimization

---


## ⭐ Show some love

If you like this project, give it a ⭐ on GitHub!
