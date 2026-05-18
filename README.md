# 🎮 Battle City - HTML5 Game Clone

A fully responsive, multiplayer Battle City game clone built with vanilla HTML5, CSS3, and JavaScript. Play on any device including desktop, mobile, and tablets!

## 🌟 Features

✅ **Fully Responsive Design**
- Works seamlessly on desktop, tablet, and mobile devices
- Optimized for all screen sizes
- Touch-friendly controls

✅ **Cross-Platform Support**
- Windows, macOS, Linux
- Android and iOS devices
- All modern web browsers

✅ **Dual Control Systems**
- **Desktop**: Arrow keys/WASD + Space to shoot
- **Mobile**: Device tilt (accelerometer) + tap to shoot

✅ **Complete Game Mechanics**
- Progressive difficulty with increasing levels
- Enemy AI with intelligent movement
- Collision detection and physics
- Obstacle destruction system
- Score and lives tracking
- Level progression

✅ **Graphics & Performance**
- Canvas-based 2D graphics
- 60 FPS smooth gameplay
- Optimized rendering
- Grid-based movement system

## 🎯 Gameplay

### Objective
Destroy all enemy tanks (red) to advance to the next level. Each level has more enemies with increased speed.

### Controls

**Desktop:**
- ⬆️ Arrow Keys or **W** = Move Up
- ⬇️ Arrow Keys or **S** = Move Down
- ⬅️ Arrow Keys or **A** = Move Left
- ➡️ Arrow Keys or **D** = Move Right
- **Space** = Shoot

**Mobile:**
- 📱 **Tilt Device** = Move tank
- 👆 **Tap Screen** = Shoot

### Game Elements
- 🟢 **Green Square** = Your Tank
- 🔴 **Red Square** = Enemy Tank
- ⬜ **Gray Square** = Obstacles/Walls
- 💛 **Yellow Dot** = Bullets

## 🚀 Quick Start

### Option 1: Direct File Opening
1. Download or clone the repository
2. Open `index.html` in your web browser
3. Click "Start Game" and enjoy!

### Option 2: Local Server (Recommended)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if http-server is installed)
http-server

# Using live-server (NPM)
npx live-server
```

Then open `http://localhost:8000` in your browser.

## 📋 Game Modes

### Levels
- **Level 1**: 3 Enemy Tanks
- **Level 2**: 4 Enemy Tanks (faster)
- **Level 3+**: 5+ Enemy Tanks (even faster)

### Scoring
- **Enemy Destroyed**: 100 points
- **Level Completed**: 1,000 bonus points

### Lives
- Start with 3 lives
- Lose a life when hit by enemy fire
- Game over when all lives are lost

## 🎨 Technical Details

### Architecture
- **index.html**: Game container and UI
- **styles.css**: Responsive styling with media queries
- **game.js**: Complete game engine with:
  - Player movement and shooting
  - Enemy AI and behavior
  - Collision detection
  - Game state management
  - Input handling (keyboard + accelerometer)

### Browser APIs Used
- Canvas 2D Context
- DeviceOrientationEvent (for accelerometer)
- RequestAnimationFrame (for smooth animation)
- Touch Events

### Performance Optimization
- Efficient collision detection using AABB (Axis-Aligned Bounding Box)
- Object pooling for bullets
- Reduced draw calls
- Optimized game loop at 60 FPS

## 📱 Mobile Optimization

### Accelerometer Calibration
- Device tilt controls tank movement
- Tap anywhere on canvas to shoot
- Responsive touch detection
- No unnecessary scrolling

### Viewport Settings
- Fixed viewport for consistent gameplay
- User zoom disabled for better control
- Touch-action optimized

## 🔧 Customization

You can easily customize the game by modifying these values in `game.js`:

```javascript
const TILE_SIZE = 30;              // Grid tile size
player.speed = 3;                  // Player movement speed
const CANVAS_WIDTH = 600;          // Game width
const CANVAS_HEIGHT = 600;         // Game height
```

## 🐛 Known Limitations

- Single player only (multiplayer can be added)
- No sound effects (can be implemented with Web Audio API)
- No power-ups (can be added as feature)
- Enemy tanks use basic AI (can be enhanced)

## 🚀 Future Enhancements

- [ ] Multiplayer support
- [ ] Power-ups (shield, rapid fire, etc.)
- [ ] Sound effects and music
- [ ] Different enemy types
- [ ] Boss battles
- [ ] Leaderboard system
- [ ] Local storage for high scores
- [ ] More levels with different maps

## 📄 License

This project is open-source and available for educational and personal use.

## 🎓 Educational Value

Perfect for learning:
- HTML5 Canvas API
- JavaScript game development
- Collision detection algorithms
- Game state management
- Responsive web design
- Mobile device APIs
- Game loop implementation

## 💡 Tips for Better Gameplay

1. **Use obstacles** to shield yourself from enemy fire
2. **Plan your movements** - predict enemy paths
3. **Corner shooting** - shoot from corners of obstacles
4. **Destroy walls** - create new paths and escape routes
5. **Quick reflexes** - the more levels you beat, the harder it gets!

---

**Enjoy the game! 🎮 Have fun and try to beat all levels!**