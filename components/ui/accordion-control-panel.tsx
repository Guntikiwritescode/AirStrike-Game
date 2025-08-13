'use client';

import { useState } from 'react';
import { SensorType, HeatmapType } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SensorPicker } from './sensor-picker';
import { LayerToggle } from './layer-toggle';
import { StatCard } from './stat-card';
import { Button } from './button';
import { Badge } from './badge';
import { HeatmapLegend } from './heatmap-legend';
import { useTheme } from '@/lib/contexts/theme-context';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Target, 
  Search, 
  Palette,
  Activity,
  Layers,
  Settings
} from 'lucide-react';

interface AccordionControlPanelProps {
  selectedSensor: SensorType;
  onSensorChange: (sensor: SensorType) => void;
  activeLayer: HeatmapType;
  onLayerChange: (layer: HeatmapType) => void;
  selectedCell: { x: number; y: number } | null;
  gameStarted: boolean;
  remainingBudget: number;
  currentTurn: number;
  onRecon: () => void;
  onStrike: () => void;
  onStartGame: () => void;
  onEndGame: () => void;
  onResetGame: () => void;
  reconCost: number;
  strikeCost: number;
  className?: string;
}

export function AccordionControlPanel({
  selectedSensor,
  onSensorChange,
  activeLayer,
  onLayerChange,
  selectedCell,
  gameStarted,
  remainingBudget,
  currentTurn,
  onRecon,
  onStrike,
  onStartGame,
  onEndGame,
  onResetGame,
  reconCost,
  strikeCost,
  className
}: AccordionControlPanelProps) {
  const { isColorblindSafe, toggleColorblindSafe } = useTheme();
  const [defaultOpen] = useState(['mission', 'sensors', 'actions']);

  return (
    <div className={className}>
      <Accordion 
        type="multiple" 
        defaultValue={defaultOpen}
        className="space-y-2"
      >
        {/* Mission Section */}
        <AccordionItem value="mission" className="card">
          <AccordionTrigger className="panel-header mb-0 hover:no-underline">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              Mission Control
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            {/* Mission stats */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                title="Turn"
                value={currentTurn}
                variant="accent"
                className="text-center"
              />
              <StatCard
                title="Budget"
                value={remainingBudget}
                unit="$"
                variant={remainingBudget < 100 ? "warn" : "default"}
                className="text-center"
              />
            </div>

            {/* Mission controls */}
            <div className="space-y-2">
              {!gameStarted ? (
                <Button 
                  onClick={onStartGame}
                  className="w-full btn"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Mission
                </Button>
              ) : (
                <Button 
                  onClick={onEndGame}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  End Mission
                </Button>
              )}
              
              <Button 
                onClick={onResetGame}
                variant="outline"
                className="w-full btn"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Sensors Section */}
        <AccordionItem value="sensors" className="card">
          <AccordionTrigger className="panel-header mb-0 hover:no-underline">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-accent" />
              Sensors
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <SensorPicker
              selectedSensor={selectedSensor}
              onSensorChange={onSensorChange}
              showStats={true}
              disabled={!gameStarted}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Actions Section */}
        <AccordionItem value="actions" className="card">
          <AccordionTrigger className="panel-header mb-0 hover:no-underline">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              Actions
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            {/* Target info */}
            {selectedCell ? (
              <div className="text-center p-2 bg-panel2 rounded-lg">
                <div className="text-xs text-muted uppercase tracking-wider mb-1">
                  Target Selected
                </div>
                <div className="stat text-lg">
                  ({selectedCell.x.toString().padStart(2, '0')}, {selectedCell.y.toString().padStart(2, '0')})
                </div>
              </div>
            ) : (
              <div className="text-center p-2 bg-panel2 rounded-lg text-muted text-sm">
                No target selected
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <Button
                onClick={onRecon}
                disabled={!gameStarted || !selectedCell || remainingBudget < reconCost}
                className="w-full btn"
                size="sm"
              >
                <Search className="w-4 h-4 mr-2" />
                <span className="font-mono">RECON</span>
                <Badge variant="outline" className="ml-auto">
                  ${reconCost}
                </Badge>
              </Button>
              
              <Button
                onClick={onStrike}
                disabled={!gameStarted || !selectedCell || remainingBudget < strikeCost}
                variant="destructive"
                className="w-full"
                size="sm"
              >
                <Target className="w-4 h-4 mr-2" />
                <span className="font-mono">STRIKE</span>
                <Badge variant="outline" className="ml-auto">
                  ${strikeCost}
                </Badge>
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Layers Section */}
        <AccordionItem value="layers" className="card">
          <AccordionTrigger className="panel-header mb-0 hover:no-underline">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              Map Layers
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            <LayerToggle
              activeLayer={activeLayer}
              onLayerChange={onLayerChange}
              disabled={!gameStarted}
              className="flex-wrap"
            />
            
            {/* Heatmap legend */}
            <HeatmapLegend
              title={activeLayer.toUpperCase()}
              min={0}
              max={1}
              unit={activeLayer === 'posterior' ? '' : '%'}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Settings Section */}
        <AccordionItem value="settings" className="card">
          <AccordionTrigger className="panel-header mb-0 hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent" />
              Settings
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-3">
            {/* Colorblind toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted" />
                <div>
                  <div className="text-sm font-medium">Colorblind Safe</div>
                  <div className="text-xs text-muted">
                    Use turquoise/orange palette
                  </div>
                </div>
              </div>
              <Button
                onClick={toggleColorblindSafe}
                variant={isColorblindSafe ? "default" : "outline"}
                size="sm"
                className="btn"
              >
                {isColorblindSafe ? 'ON' : 'OFF'}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}