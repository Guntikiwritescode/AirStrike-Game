# Bayesian Forward Operator

A probability-based strategy game where you use noisy sensors to update beliefs about hidden hostiles and infrastructure, then make optimal decisions under uncertainty.

## 🎮 Game Overview

In this simulation game, you play as a decision-maker who must:
- **Gather Intelligence**: Use various sensors (drones, satellites, human intel) to scan grid cells
- **Update Beliefs**: Apply Bayesian reasoning to update probability estimates of hidden threats
- **Make Decisions**: Choose optimal actions (reconnaissance or strikes) under uncertainty
- **Manage Resources**: Work within budget constraints while maximizing expected outcomes

## 🎯 Key Features

### 🧠 Bayesian Reasoning
- **Prior Beliefs**: Start with initial probability estimates
- **Sensor Fusion**: Combine noisy sensor readings using Bayes' theorem
- **Uncertainty Quantification**: Visualize confidence levels in your beliefs

### 📊 Advanced Analytics
- **Real-time Heatmaps**: Visualize threat probabilities and uncertainty
- **Decision Support**: Expected value calculations and value of information analysis
- **Performance Tracking**: Monitor your decision-making accuracy over time

### 🎛️ Realistic Sensor Modeling
- **Drone Surveillance**: High accuracy, moderate cost
- **Satellite Imagery**: Good accuracy, low cost, weather dependent
- **Human Intelligence**: Variable accuracy, context dependent
- **Sensor Degradation**: Performance varies with environmental conditions

### 🎲 Game Modes
- **Tutorial Mode**: Learn Bayesian concepts step-by-step
- **Campaign Mode**: Progressive difficulty with increasing complexity
- **Sandbox Mode**: Customize scenarios and test strategies

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/bayesian-forward-operator.git
cd bayesian-forward-operator
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## 🎮 How to Play

### Basic Gameplay Loop

1. **Survey the Grid**: Examine the game board showing probability heatmaps
2. **Select Sensor**: Choose appropriate sensor type for reconnaissance
3. **Perform Reconnaissance**: Click cells to gather intelligence
4. **Update Beliefs**: Watch probabilities update based on sensor readings
5. **Make Decisions**: Strike high-probability targets or gather more intel
6. **Analyze Results**: Review performance and learn from outcomes

### Controls

- **Left Click**: Select cell for action
- **R**: Perform reconnaissance on selected cell
- **S**: Strike selected cell
- **Space**: Toggle between sensor types
- **H**: Show/hide help overlay
- **ESC**: Clear selection

### Scoring

Your performance is evaluated based on:
- **Accuracy**: Correctly identifying threat locations
- **Efficiency**: Minimizing unnecessary actions
- **Resource Management**: Staying within budget constraints
- **Risk Assessment**: Balancing information gathering vs. action

## 🔧 Technical Details

### Architecture

- **Frontend**: Next.js 15.x with React 19
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand for game state
- **Computations**: Web Workers for heavy calculations
- **Testing**: Vitest with React Testing Library

### Key Algorithms

- **Bayesian Updates**: Recursive belief updating with sensor fusion
- **Value of Information**: Calculate expected utility of additional reconnaissance
- **Expected Value**: Optimal decision-making under uncertainty
- **Sensor Modeling**: Realistic noise and performance characteristics

### Performance Optimizations

- **Web Workers**: Offload intensive calculations
- **Memoization**: Cache expensive computations
- **Efficient Rendering**: Optimized canvas-based visualization
- **Lazy Loading**: Load game components on demand

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 📈 Educational Value

This game teaches key concepts in:
- **Bayesian Statistics**: Prior/posterior distributions, likelihood functions
- **Decision Theory**: Expected utility, value of information
- **Sensor Fusion**: Combining multiple information sources
- **Risk Assessment**: Quantifying and managing uncertainty
- **Resource Optimization**: Constrained decision-making

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎓 Educational Resources

- [Bayesian Statistics Primer](docs/bayesian-primer.md)
- [Sensor Fusion Basics](docs/sensor-fusion.md)
- [Decision Theory Guide](docs/decision-theory.md)
- [Game Strategy Tips](docs/strategy-guide.md)

## 📊 Analytics & Metrics

The game tracks various metrics to help you improve:
- Decision accuracy over time
- Resource utilization efficiency  
- Bayesian reasoning effectiveness
- Strategic pattern analysis

## 🌐 Deployment

### One-Click Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/bayesian-forward-operator)

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your preferred platform (Vercel, Netlify, etc.)

## 🔮 Roadmap

- [ ] Multiplayer competitive mode
- [ ] AI opponent with different difficulty levels
- [ ] More sensor types and environmental conditions
- [ ] Campaign mode with storyline
- [ ] Advanced analytics dashboard
- [ ] Mobile app version

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the [FAQ](docs/faq.md)
- Review the [troubleshooting guide](docs/troubleshooting.md)

---

Built with ❤️ using Next.js, React, and modern web technologies.
