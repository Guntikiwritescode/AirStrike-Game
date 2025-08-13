'use client';

import { SensorType } from '@/lib/types';
import { Button } from './button';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { Satellite, Drone, Users } from 'lucide-react';

interface SensorPickerProps {
  selectedSensor: SensorType;
  onSensorChange: (sensor: SensorType) => void;
  showStats?: boolean;
  disabled?: boolean;
  className?: string;
}

const sensorConfig = {
  drone: {
    label: 'DRONE',
    description: 'High accuracy, moderate cost',
    icon: Drone,
    tpr: '0.92',
    fpr: '0.06',
    cost: 15
  },
  sigint: {
    label: 'SIGINT', 
    description: 'Signals intelligence, electronic surveillance',
    icon: Satellite,
    tpr: '0.84',
    fpr: '0.12',
    cost: 8
  },
  ground: {
    label: 'GROUND',
    description: 'Ground spotters, variable accuracy',
    icon: Users,
    tpr: '0.76',
    fpr: '0.18',
    cost: 20
  }
} as const;

export function SensorPicker({
  selectedSensor,
  onSensorChange,
  showStats = false,
  disabled = false,
  className
}: SensorPickerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(sensorConfig) as SensorType[]).map((sensor) => {
          const config = sensorConfig[sensor];
          const Icon = config.icon;
          const isSelected = selectedSensor === sensor;

          return (
            <Button
              key={sensor}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onSensorChange(sensor)}
              disabled={disabled}
              className={cn(
                'w-full justify-start h-auto p-3 btn',
                isSelected && 'shadow-glow border-accent'
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-mono text-xs uppercase tracking-wider font-medium">
                    {config.label}
                  </div>
                  {showStats && (
                    <div className="text-xs text-muted/80 mt-1">
                      {config.description}
                    </div>
                  )}
                </div>
                {showStats && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        TPR {config.tpr}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        FPR {config.fpr}
                      </Badge>
                    </div>
                    <div className="stat text-xs">
                      ${config.cost}
                    </div>
                  </div>
                )}
              </div>
            </Button>
          );
        })}
      </div>

      {showStats && (
        <div className="text-xs text-muted/70 space-y-1">
          <div>TPR: True Positive Rate (sensitivity)</div>
          <div>FPR: False Positive Rate (1 - specificity)</div>
        </div>
      )}
    </div>
  );
}