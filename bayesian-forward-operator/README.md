# Bayesian Forward Operator

A sophisticated web-based strategy game that combines probability theory, decision-making under uncertainty, and tactical planning. Players act as forward operators using noisy sensors to gather intelligence about hidden hostiles and protected infrastructure, then make optimal decisions to maximize their score while minimizing collateral damage.

⚠️ **Disclaimer**: This is a fictional decision-making simulation for educational purposes. No real-world tactics or guidance.

## 🎮 Game Overview

### Objective
Use probability theory and decision-making skills to:
- Identify hidden hostile targets using noisy sensor data
- Avoid hitting protected infrastructure
- Maximize your score within budget and turn constraints
- Improve your calibration and decision-making accuracy

### Core Mechanics
- **Grid-based map**: 14x14 default grid with hidden truth
- **Noisy sensors**: Drone imagery, SIGINT, and ground spotters with different accuracy rates
- **Bayesian inference**: Update beliefs about hostile locations using sensor readings
- **Risk management**: Balance expected value with collateral damage constraints
- **Resource management**: Budget allocation between reconnaissance and strikes

## 🧠 Mathematical Foundation

### Sensor Models
- **Drone Imagery**: TPR 85%, FPR 15%, Cost $10
- **SIGINT**: TPR 60%, FPR 5%, Cost $15  
- **Ground Spotter**: TPR 75%, FPR 10%, Cost $20

### Bayesian Updates
The game uses the odds form of Bayes' rule for numerical stability:
```
posterior_odds = prior_odds × likelihood_ratio
```

Where likelihood_ratio depends on sensor reading (positive/negative) and sensor characteristics (TPR/FPR).

### Scoring System
- **+$100** per hostile neutralized
- **-$200** per infrastructure hit
- **-$50** per strike cost
- **-$10-20** per reconnaissance cost

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd bayesian-forward-operator

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game.

### One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/bayesian-forward-operator)

### Building for Production
```bash
npm run build
npm start
```

## 🎯 How to Play

### Game Modes
- **Daily Challenge**: Same deterministic scenario for all players each day
- **Free Play**: Random scenarios with configurable parameters

### Basic Controls
1. **Left-click** on grid cells to perform reconnaissance with selected sensor
2. **Right-click** on grid cells to launch precision strikes
3. Use the **Control Panel** to:
   - Start/end games
   - Change game settings
   - Switch between Daily Challenge and Free Play
   - Monitor budget, score, and turn progress

### Strategy Tips
- **Information gathering**: Use cheaper sensors first, then validate with more accurate ones
- **Spatial reasoning**: Hostiles tend to cluster in certain areas
- **Risk assessment**: Consider collateral damage probability before striking
- **Budget management**: Balance reconnaissance costs with strike opportunities
- **Calibration**: Pay attention to your probability estimates vs. actual outcomes

## 📊 Analytics & Learning

### Performance Metrics
- **Brier Score**: Measures calibration quality (lower is better)
- **Log Loss**: Penalizes confident wrong predictions heavily
- **Efficiency**: Score per dollar spent
- **Calibration Curve**: How well your probability estimates match reality

### Data Export
- Download complete game logs in JSON or CSV format
- Analyze decision patterns and learning curves
- Compare performance across different scenarios

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **State Management**: Zustand with Immer for immutable updates
- **Graphics**: HTML5 Canvas for grid rendering
- **Randomness**: seedrandom for deterministic gameplay
- **Data Persistence**: localStorage for game state

### Project Structure
```
├── app/
│   ├── game/           # Main game page and components
│   │   ├── page.tsx    # Game layout
│   │   ├── GameCanvas.tsx    # Grid rendering and interaction
│   │   ├── ControlPanel.tsx  # Game controls and settings
│   │   └── AnalyticsPanel.tsx # Performance metrics and logs
│   └── layout.tsx      # Root layout
├── lib/
│   ├── types.ts        # TypeScript type definitions
│   ├── rng.ts          # Seeded random number generation
│   └── utils.ts        # Utility functions
├── state/
│   └── useGameStore.ts # Zustand game state management
└── components/         # Reusable UI components
```

### Key Features
- **Deterministic gameplay**: Same seed = same scenario
- **Real-time updates**: Responsive UI with immediate feedback
- **Configurable parameters**: Adjustable grid size, budget, turn limits
- **Auto-save**: Automatic localStorage persistence

## 🧪 Game Design Philosophy

This game implements several important concepts from decision science and probability theory:

### Epistemic vs. Aleatory Uncertainty
- **Epistemic**: Uncertainty about the true state (hostile locations) that can be reduced through information gathering
- **Aleatory**: Inherent randomness in sensor readings that cannot be eliminated

### Value of Information (VOI)
- Players must decide when additional reconnaissance is worth the cost
- Demonstrates diminishing returns of repeated measurements
- Encourages strategic information gathering

### Risk-Averse Decision Making
- Collateral damage constraints force consideration of worst-case scenarios
- Balances expected value with risk management
- Teaches the cost of uncertainty in high-stakes decisions

### Calibration and Metacognition
- Real-time feedback on probability estimation accuracy
- Encourages reflection on decision-making processes
- Builds intuition for handling uncertainty

## 🔮 Future Enhancements (Planned)

### Stage 2 Features
- **Advanced inference**: Spatial correlation models and particle filters
- **Dynamic environments**: Moving hostiles and temporal dynamics
- **Policy helpers**: AI suggestions and value-of-information heatmaps
- **Web Workers**: Offload heavy computations for better performance

### Stage 3 Features
- **Multiplayer**: Competitive and cooperative modes
- **Campaign mode**: Progressive difficulty with unlockable scenarios
- **Advanced analytics**: Machine learning for player modeling
- **3D visualization**: Enhanced graphics with Three.js

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

## 📧 Contact

For questions, suggestions, or collaboration opportunities, please open an issue on GitHub.

---

*Built with ❤️ for decision science education and probabilistic reasoning*
