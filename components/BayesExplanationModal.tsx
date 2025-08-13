'use client';

import React, { useState } from 'react';
import { X, Brain, Calculator, Target, TrendingUp, ArrowRight, Info, Lightbulb } from 'lucide-react';
import { SensorReading } from '@/lib/sensors';
import { probabilityToOdds, oddsToProbability } from '@/lib/inference';

export interface BayesExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  priorProbability: number;
  sensorReading: SensorReading;
  posteriorProbability: number;
  cellX: number;
  cellY: number;
}

export default function BayesExplanationModal({
  isOpen,
  onClose,
  priorProbability,
  sensorReading,
  posteriorProbability,
  cellX,
  cellY
}: BayesExplanationModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  // Calculate intermediate values for step-by-step explanation
  const priorOdds = probabilityToOdds(priorProbability);
  const { effectiveTPR, effectiveFPR, result, confidence, contextSummary } = sensorReading;
  
  // Likelihood ratio calculation
  const likelihoodRatio = result 
    ? effectiveTPR / effectiveFPR 
    : (1 - effectiveTPR) / (1 - effectiveFPR);
  
  const posteriorOdds = priorOdds * likelihoodRatio;
  const calculatedPosterior = oddsToProbability(posteriorOdds);

  const steps = [
    {
      title: "Step 1: Prior Belief",
      icon: <Brain className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Before any sensor reading, we had a belief about whether cell ({cellX}, {cellY}) contains a hostile:
          </p>
          <div className="bg-slate-800 p-4 rounded-lg border">
            <div className="text-center">
              <div className="text-2xl font-mono text-blue-300">
                P(H = 1) = {(priorProbability * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-slate-400 mt-2">
                Prior probability of hostile presence
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            This prior comes from our initial assessment of the battlefield based on intelligence, 
            terrain analysis, and spatial patterns of hostile activity.
          </p>
        </div>
      )
    },
    {
      title: "Step 2: Convert to Odds",
      icon: <Calculator className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            For mathematical convenience, we convert probability to odds:
          </p>
          <div className="bg-slate-800 p-4 rounded-lg border">
            <div className="font-mono text-center space-y-2">
              <div className="text-blue-300">
                Odds = P(H=1) / P(H=0) = P(H=1) / (1 - P(H=1))
              </div>
              <div className="text-slate-400">↓</div>
              <div className="text-green-300">
                Odds = {priorProbability.toFixed(3)} / {(1 - priorProbability).toFixed(3)} = {priorOdds.toFixed(3)}
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded border-l-4 border-blue-500">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Why odds?</strong> Odds make multiplication easier than probability. 
                When we get new evidence, we multiply odds by the likelihood ratio.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 3: Sensor Evidence",
      icon: <Target className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Our {sensorReading.result ? 'positive' : 'negative'} sensor reading provides evidence:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg border">
              <div className="text-center space-y-2">
                <div className="text-sm text-slate-400">Sensor Result</div>
                <div className={`text-2xl font-bold ${result ? 'text-red-400' : 'text-green-400'}`}>
                  {result ? 'POSITIVE' : 'NEGATIVE'}
                </div>
                <div className="text-sm text-slate-400">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border">
              <div className="text-center space-y-2">
                <div className="text-sm text-slate-400">Context</div>
                <div className="text-slate-200 capitalize">
                  {contextSummary}
                </div>
                <div className="text-xs text-slate-400">
                  TPR: {(effectiveTPR * 100).toFixed(1)}% | FPR: {(effectiveFPR * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded border-l-4 border-yellow-500">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Sensor Performance:</strong> TPR (True Positive Rate) is how often the sensor 
                correctly detects hostiles. FPR (False Positive Rate) is how often it gives false alarms. 
                Context affects these rates.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 4: Likelihood Ratio",
      icon: <TrendingUp className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            We calculate how much this evidence supports our hypothesis:
          </p>
          <div className="bg-slate-800 p-4 rounded-lg border">
            <div className="font-mono text-center space-y-3">
              <div className="text-blue-300">
                {result ? (
                  <>Likelihood Ratio = P(Positive | H=1) / P(Positive | H=0)</>
                ) : (
                  <>Likelihood Ratio = P(Negative | H=1) / P(Negative | H=0)</>
                )}
              </div>
              <div className="text-slate-400">↓</div>
              <div className="text-green-300">
                {result ? (
                  <>LR = TPR / FPR = {effectiveTPR.toFixed(3)} / {effectiveFPR.toFixed(3)}</>
                ) : (
                  <>LR = (1-TPR) / (1-FPR) = {(1-effectiveTPR).toFixed(3)} / {(1-effectiveFPR).toFixed(3)}</>
                )}
              </div>
              <div className="text-slate-400">↓</div>
              <div className={`text-xl font-bold ${likelihoodRatio > 1 ? 'text-red-400' : 'text-green-400'}`}>
                LR = {likelihoodRatio.toFixed(3)}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className={`p-3 rounded border-l-4 ${likelihoodRatio > 1 ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
              <div className="font-medium text-slate-200">Interpretation:</div>
              <div className="text-slate-300">
                {likelihoodRatio > 1 ? (
                  <>Evidence <strong>supports</strong> hostile presence</>
                ) : likelihoodRatio < 1 ? (
                  <>Evidence <strong>opposes</strong> hostile presence</>
                ) : (
                  <>Evidence is <strong>neutral</strong></>
                )}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border-l-4 border-blue-500">
              <div className="font-medium text-slate-200">Strength:</div>
              <div className="text-slate-300">
                {likelihoodRatio > 10 ? 'Very Strong' :
                 likelihoodRatio > 3 ? 'Strong' :
                 likelihoodRatio > 1 ? 'Moderate' :
                 likelihoodRatio > 0.33 ? 'Weak' :
                 likelihoodRatio > 0.1 ? 'Strong (against)' :
                 'Very Strong (against)'}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 5: Bayesian Update",
      icon: <ArrowRight className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            We multiply our prior odds by the likelihood ratio to get posterior odds:
          </p>
          <div className="bg-slate-800 p-4 rounded-lg border">
            <div className="font-mono text-center space-y-3">
              <div className="text-blue-300">
                Posterior Odds = Prior Odds × Likelihood Ratio
              </div>
              <div className="text-slate-400">↓</div>
              <div className="text-green-300">
                Posterior Odds = {priorOdds.toFixed(3)} × {likelihoodRatio.toFixed(3)}
              </div>
              <div className="text-slate-400">↓</div>
              <div className="text-xl font-bold text-yellow-300">
                Posterior Odds = {posteriorOdds.toFixed(3)}
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded border-l-4 border-purple-500">
            <div className="flex items-start gap-2">
              <Brain className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Bayes' Rule in Action:</strong> This is the core of Bayesian reasoning - 
                combining our prior belief with new evidence to form an updated belief.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 6: Convert Back to Probability",
      icon: <Calculator className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Finally, we convert the posterior odds back to probability:
          </p>
          <div className="bg-slate-800 p-4 rounded-lg border">
            <div className="font-mono text-center space-y-3">
              <div className="text-blue-300">
                P(H=1 | Evidence) = Odds / (1 + Odds)
              </div>
              <div className="text-slate-400">↓</div>
              <div className="text-green-300">
                P(H=1 | Evidence) = {posteriorOdds.toFixed(3)} / (1 + {posteriorOdds.toFixed(3)})
              </div>
              <div className="text-slate-400">↓</div>
              <div className="text-2xl font-bold text-blue-300">
                P(H=1 | Evidence) = {(calculatedPosterior * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          {/* Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-700 p-4 rounded-lg border">
              <div className="text-center">
                <div className="text-sm text-slate-400">Before (Prior)</div>
                <div className="text-xl font-mono text-slate-300">
                  {(priorProbability * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500">
              <div className="text-center">
                <div className="text-sm text-blue-300">After (Posterior)</div>
                <div className="text-xl font-mono text-blue-200">
                  {(posteriorProbability * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          
          <div className={`text-center p-3 rounded border-l-4 ${
            posteriorProbability > priorProbability ? 'bg-red-900/20 border-red-500' :
            posteriorProbability < priorProbability ? 'bg-green-900/20 border-green-500' :
            'bg-slate-800/50 border-slate-500'
          }`}>
            <div className="font-medium text-slate-200">
              {posteriorProbability > priorProbability ? 
                `Belief increased by ${((posteriorProbability - priorProbability) * 100).toFixed(1)} percentage points` :
                posteriorProbability < priorProbability ?
                `Belief decreased by ${((priorProbability - posteriorProbability) * 100).toFixed(1)} percentage points` :
                'Belief remained unchanged'
              }
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 bg-slate-900">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Bayesian Update Explanation
              </h2>
              <p className="text-sm text-slate-400">
                Cell ({cellX}, {cellY}) - Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close explanation"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-700 h-1">
          <div 
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full text-white">
              {currentStepData.icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-100">
              {currentStepData.title}
            </h3>
          </div>
          
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-slate-600 bg-slate-900">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep ? 'bg-blue-500' : 
                  index < currentStep ? 'bg-blue-700' : 
                  'bg-slate-600'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
            >
              Got it!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}