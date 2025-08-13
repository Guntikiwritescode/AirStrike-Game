'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/state/useGameStore';
import { SensorType } from '@/lib/types';
import { PolicyType, PolicyRecommendation } from '@/lib/risk-analysis';
import { Target, TrendingUp, Activity, Brain, AlertTriangle, Clock } from 'lucide-react';

interface PolicyPanelProps {
  selectedSensor: SensorType;
  onCellHighlight: (x: number, y: number, type: 'primary' | 'alternative') => void;
  onClearHighlight: () => void;
}

export default function PolicyPanel({ selectedSensor, onCellHighlight, onClearHighlight }: PolicyPanelProps) {
  const { 
    gameStarted, 
    currentTurn, 
    remainingBudget, 
    getPolicyRecommendations,
    config,
  } = useGameStore();
  
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyType | null>(null);
  const [recommendations, setRecommendations] = useState<Record<PolicyType, PolicyRecommendation> | null>(null);
  const [riskAversion, setRiskAversion] = useState(0.5);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Update recommendations when game state changes
  useEffect(() => {
    if (gameStarted) {
      try {
        const newRecommendations = getPolicyRecommendations(selectedSensor, riskAversion);
        setRecommendations(newRecommendations);
      } catch (error) {
        console.warn('Error getting policy recommendations:', error);
        setRecommendations(null);
      }
    }
  }, [gameStarted, currentTurn, remainingBudget, selectedSensor, riskAversion, getPolicyRecommendations]);

  // Clear highlights when policy changes
  useEffect(() => {
    onClearHighlight();
  }, [selectedPolicy, onClearHighlight]);

  const handlePolicySelect = (policyType: PolicyType) => {
    if (selectedPolicy === policyType) {
      setSelectedPolicy(null);
      onClearHighlight();
    } else {
      setSelectedPolicy(policyType);
      
      // Highlight recommended cell
      const recommendation = recommendations?.[policyType];
      if (recommendation && recommendation.x !== undefined && recommendation.y !== undefined) {
        onCellHighlight(recommendation.x, recommendation.y, 'primary');
        
        // Highlight alternatives if shown
        if (showAlternatives && recommendation.alternatives) {
          recommendation.alternatives.forEach((alt, index) => {
            setTimeout(() => {
              onCellHighlight(alt.x, alt.y, 'alternative');
            }, index * 100);
          });
        }
      }
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'strike': return <Target className="w-4 h-4" />;
      case 'recon': return <Activity className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!gameStarted) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          AI Policy Advisor
        </h3>
        <div className="text-slate-400 text-sm">
          Start the game to see AI recommendations
        </div>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          AI Policy Advisor
        </h3>
        <div className="text-slate-400 text-sm">
          Computing recommendations...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          AI Policy Advisor
        </h3>
        <div className="text-xs text-slate-400">
          Turn {currentTurn} • ${remainingBudget} budget
        </div>
      </div>

      {/* Risk Aversion Setting */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Risk Aversion (λ)</label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={riskAversion}
            onChange={(e) => setRiskAversion(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-slate-400 w-8">{riskAversion.toFixed(1)}</span>
        </div>
        <div className="text-xs text-slate-500">
          0 = Risk-neutral, 1 = Highly risk-averse
        </div>
      </div>

      {/* Policy Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Policy Recommendations</label>
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            {showAlternatives ? 'Hide' : 'Show'} alternatives
          </button>
        </div>

        {(['greedyEV', 'riskAverse', 'reconVOI'] as PolicyType[]).map((policyType) => {
          const recommendation = recommendations[policyType];
          const isSelected = selectedPolicy === policyType;
          const canAfford = recommendation.action === 'wait' || 
            (recommendation.action === 'strike' && remainingBudget >= config.strikeCost) ||
            (recommendation.action === 'recon' && remainingBudget >= 10);

          return (
            <button
              key={policyType}
              onClick={() => handlePolicySelect(policyType)}
              disabled={!canAfford}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-green-500 bg-green-500/10'
                  : canAfford
                    ? 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
                    : 'border-slate-700 bg-slate-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  {getActionIcon(recommendation.action)}
                  <span className="font-medium">
                    {policyType === 'greedyEV' ? 'Greedy EV' : 
                     policyType === 'riskAverse' ? 'Risk-Averse' : 'Recon by VOI'}
                  </span>
                </div>
                <div className={`text-xs ${getConfidenceColor(recommendation.confidence)}`}>
                  {getConfidenceText(recommendation.confidence)}
                </div>
              </div>
              
              <div className="text-sm text-slate-300 mb-1">
                {recommendation.action === 'wait' ? (
                  'No action recommended'
                ) : (
                  `${recommendation.action.toUpperCase()} at (${recommendation.x}, ${recommendation.y})`
                )}
              </div>
              
              <div className="text-xs text-slate-400 mb-1">
                {recommendation.reasoning}
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Value: {recommendation.value > 0 ? '+' : ''}{recommendation.value.toFixed(0)}
                </span>
                {recommendation.alternatives && recommendation.alternatives.length > 0 && showAlternatives && (
                  <span className="text-slate-500">
                    +{recommendation.alternatives.length} alternatives
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Policy Details */}
      {selectedPolicy && recommendations[selectedPolicy] && (
        <div className="bg-slate-700 rounded-lg p-3 space-y-2">
          <h4 className="font-medium flex items-center">
            {selectedPolicy === 'greedyEV' && <TrendingUp className="w-4 h-4 mr-2" />}
            {selectedPolicy === 'riskAverse' && <AlertTriangle className="w-4 h-4 mr-2" />}
            {selectedPolicy === 'reconVOI' && <Activity className="w-4 h-4 mr-2" />}
            Selected: {selectedPolicy === 'greedyEV' ? 'Greedy EV' : 
                      selectedPolicy === 'riskAverse' ? 'Risk-Averse' : 'Recon by VOI'}
          </h4>
          
          <div className="text-sm text-slate-300">
            <div>Action: {recommendations[selectedPolicy].action.toUpperCase()}</div>
            {recommendations[selectedPolicy].x !== undefined && (
              <div>Location: ({recommendations[selectedPolicy].x}, {recommendations[selectedPolicy].y})</div>
            )}
            {recommendations[selectedPolicy].sensor && (
              <div>Sensor: {recommendations[selectedPolicy].sensor}</div>
            )}
            <div>Confidence: {getConfidenceText(recommendations[selectedPolicy].confidence)}</div>
            <div>Expected Value: {recommendations[selectedPolicy].value.toFixed(0)} points</div>
          </div>
          
          {showAlternatives && recommendations[selectedPolicy].alternatives && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-400">Alternatives:</div>
              {recommendations[selectedPolicy].alternatives!.slice(0, 3).map((alt, index) => (
                <div key={index} className="text-xs text-slate-500 flex justify-between">
                  <span>({alt.x}, {alt.y})</span>
                  <span>+{alt.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-xs text-slate-500 p-2 bg-slate-800 rounded">
            💡 Click on the highlighted cell to execute this recommendation
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-700 rounded p-2">
          <div className="text-slate-400">Best EV</div>
          <div className="font-medium">
            {recommendations.greedyEV.value > 0 ? '+' : ''}{recommendations.greedyEV.value.toFixed(0)}
          </div>
        </div>
        <div className="bg-slate-700 rounded p-2">
          <div className="text-slate-400">Risk Adj.</div>
          <div className="font-medium">
            {recommendations.riskAverse.value > 0 ? '+' : ''}{recommendations.riskAverse.value.toFixed(0)}
          </div>
        </div>
        <div className="bg-slate-700 rounded p-2">
          <div className="text-slate-400">Best VOI</div>
          <div className="font-medium">
            {recommendations.reconVOI.value > 0 ? '+' : ''}{recommendations.reconVOI.value.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
        AI suggestions update automatically each turn. Click a policy to highlight recommended cells.
      </div>
    </div>
  );
}