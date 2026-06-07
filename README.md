# Gothic 1 Remake - Lock Picker Solver 🗝️

An interactive, browser-based solver tool designed to crack the challenging lock-picking minigame in the **Gothic 1 Remake**. 

The in-game minigame introduces a complex system of interconnected metal disks with hard borders, where turning one disk dynamically rotates others. This tool uses a **Breadth-First Search (BFS) algorithm** to find the absolute shortest and most efficient sequence of moves to unlock any chest or door.

## ✨ Features
* **Dynamic Disk Configuration:** Choose any number of lock disks to match the difficulty of the lock in-game.
* **Interactive UI:** Click the 7 circles (representing positions 1-7) to easily set the starting positions.
* **Visual Dependency Matrix:** Use a clean "Master/Slave" toggle mode to define which disks rotate together (+1, -1, or 0) without dealing with complex code arrays.
* **Instant BFS Pathfinding:** Calculates the perfect step-by-step solution path in milliseconds.
* **Bilingual Support:** Easily toggle between English and German (Defaults to English).
* **Zero Dependencies:** Pure HTML, CSS, and vanilla JavaScript.

## 🚀 How to Use
1. Clone or download this repository.
2. Open the `gothic1_remake_lock_pick.html` file in any modern web browser.
3. Enter the **number of disks** and click **"Generate Lock"**.
4. Set the starting positions of the disks by clicking on the gold-accented numbers (the goal is position `4`).
5. Click **"Set Dependency"** on a disk to configure how it affects other disks when rotated. Click **"Done"** when finished.
6. Click **"Calculate Solution"** to get your step-by-step instructions.

## ⚙️ How the Algorithm Works
The core logic relies on a state graph solver. Each combination of disk positions is treated as a unique node. Since the lock has hard boundaries (positions cannot drop below 1 or exceed 7), the BFS algorithm searches through valid state transitions until it hits the target state where all elements equal `4`. This guarantees the shortest route, saving you lockpicks and time in Khorinis!

---
*Disclaimer: This is an unofficial community-made tool helper for the Gothic 1 Remake.*
