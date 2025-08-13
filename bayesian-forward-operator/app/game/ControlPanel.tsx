'use client';

import { useState } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { Play, Pause, RotateCcw, Calendar, Shuffle, Settings } from 'lucide-react';

export default function ControlPanel() {
  const {
    gameStarted,
    gameEnded,
    currentTurn,
    remainingBudget,
    score,
    config,
    analytics,
    startGame,
    endGame,
    resetGame,
    initializeGame,
    nextTurn,
    updateConfig,
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [tempConfig, setTempConfig] = useState(config);

  const handleStartGame = () => {
    if (!gameStarted) {
      startGame();
    } else {
      endGame();
    }
  };

  const handleNewGame = () => {
    resetGame();
    initializeGame(tempConfig);
  };

  const handleDailySeed = () => {
    const store = useGameStore.getState();
    store.useDailySeed();
    store.initializeGame();
  };

  const handleRandomSeed = () => {
    const store = useGameStore.getState();
    store.useRandomSeed();
    store.initializeGame();
  };

  const handleConfigChange = (key: keyof typeof config, value: number | string) => {
    const newConfig = { ...tempConfig, [key]: value };
    setTempConfig(newConfig);
    updateConfig(newConfig);
  };

  const progress = config.maxTurns > 0 ? (currentTurn / config.maxTurns) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Game Status</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Turn:</span>
            <span>{currentTurn} / {config.maxTurns}</span>
          </div>
          
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Budget:</span>
            <span className={remainingBudget < 100 ? 'text-red-400' : 'text-green-400'}>
              ${remainingBudget}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Score:</span>
            <span className={score >= 0 ? 'text-green-400' : 'text-red-400'}>
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* Game Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Controls</h3>
        
        <div className="space-y-2">
          <button
            onClick={handleStartGame}
            disabled={gameEnded}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded font-medium ${
              gameStarted && !gameEnded
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-600 disabled:text-slate-400'
            }`}
          >
            {gameStarted && !gameEnded ? (
              <>
                <Pause size={16} />
                <span>End Game</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Start Game</span>
              </>
            )}
          </button>

          <button
            onClick={handleNewGame}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded font-medium bg-slate-600 hover:bg-slate-700 text-white"
          >
            <RotateCcw size={16} />
            <span>New Game</span>
          </button>

          {gameStarted && !gameEnded && (
            <button
              onClick={nextTurn}
              className="w-full px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next Turn
            </button>
          )}
        </div>
      </div>

      {/* Seed Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Game Mode</h3>
        
        <div className="space-y-2">
          <button
            onClick={handleDailySeed}
            disabled={gameStarted && !gameEnded}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded font-medium bg-yellow-600 hover:bg-yellow-700 text-white disabled:bg-slate-600 disabled:text-slate-400"
          >
            <Calendar size={16} />
            <span>Daily Challenge</span>
          </button>

          <button
            onClick={handleRandomSeed}
            disabled={gameStarted && !gameEnded}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded font-medium bg-purple-600 hover:bg-purple-700 text-white disabled:bg-slate-600 disabled:text-slate-400"
          >
            <Shuffle size={16} />
            <span>Free Play</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 p-2 bg-slate-700 rounded">
          <div>Seed: {config.seed.slice(0, 20)}...</div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Performance</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Hostiles Neutralized:</span>
            <span className="text-green-400">{analytics.hostilesNeutralized}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Infrastructure Hits:</span>
            <span className="text-red-400">{analytics.infraHits}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Total Cost:</span>
            <span>${analytics.totalCost}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Brier Score:</span>
            <span>{analytics.brierScore.toFixed(3)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Truth Correlation:</span>
            <span>{analytics.truthCorrelation.toFixed(3)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Spatial Accuracy:</span>
            <span>{(analytics.spatialAccuracy * 100).toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Calibration Error:</span>
            <span>{(analytics.calibrationError * 100).toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Predictions Made:</span>
            <span>{analytics.totalPredictions}</span>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded font-medium bg-slate-600 hover:bg-slate-700 text-white"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>

        {showSettings && (
          <div className="space-y-3 p-3 bg-slate-700 rounded">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Grid Size</label>
              <input
                type="range"
                min="8"
                max="20"
                value={tempConfig.gridSize}
                onChange={(e) => handleConfigChange('gridSize', parseInt(e.target.value))}
                className="w-full"
                disabled={gameStarted && !gameEnded}
              />
              <div className="text-xs text-center">{tempConfig.gridSize}x{tempConfig.gridSize}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Initial Budget</label>
              <input
                type="range"
                min="500"
                max="2000"
                step="100"
                value={tempConfig.initialBudget}
                onChange={(e) => handleConfigChange('initialBudget', parseInt(e.target.value))}
                className="w-full"
                disabled={gameStarted && !gameEnded}
              />
              <div className="text-xs text-center">${tempConfig.initialBudget}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Max Turns</label>
              <input
                type="range"
                min="5"
                max="20"
                value={tempConfig.maxTurns}
                onChange={(e) => handleConfigChange('maxTurns', parseInt(e.target.value))}
                className="w-full"
                disabled={gameStarted && !gameEnded}
              />
              <div className="text-xs text-center">{tempConfig.maxTurns} turns</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Collateral Threshold</label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={tempConfig.collateralThreshold}
                onChange={(e) => handleConfigChange('collateralThreshold', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-center">{(tempConfig.collateralThreshold * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Game End State */}
      {gameEnded && (
        <div className="p-4 bg-slate-700 rounded border border-slate-600">
          <h3 className="text-lg font-semibold mb-2">Game Complete!</h3>
          <div className="text-sm space-y-1">
            <div>Final Score: <span className={score >= 0 ? 'text-green-400' : 'text-red-400'}>{score}</span></div>
            <div>Efficiency: {analytics.totalCost > 0 ? ((score / analytics.totalCost) * 100).toFixed(1) : 'N/A'}%</div>
          </div>
        </div>
      )}
    </div>
  );
}