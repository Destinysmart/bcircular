import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, RotateCcw } from 'lucide-react';

interface BBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface BBoxPickerProps {
  initialBBox?: Partial<BBox>;
  onSave: (bbox: BBox) => Promise<void>;
  saving?: boolean;
}

const BBoxPicker = ({ initialBBox, onSave, saving }: BBoxPickerProps) => {
  const [north, setNorth] = useState(initialBBox?.north?.toString() || '');
  const [south, setSouth] = useState(initialBBox?.south?.toString() || '');
  const [east, setEast] = useState(initialBBox?.east?.toString() || '');
  const [west, setWest] = useState(initialBBox?.west?.toString() || '');

  useEffect(() => {
    if (initialBBox) {
      if (initialBBox.north != null) setNorth(String(initialBBox.north));
      if (initialBBox.south != null) setSouth(String(initialBBox.south));
      if (initialBBox.east != null) setEast(String(initialBBox.east));
      if (initialBBox.west != null) setWest(String(initialBBox.west));
    }
  }, [initialBBox?.north, initialBBox?.south, initialBBox?.east, initialBBox?.west]);

  const isValid = north && south && east && west &&
    !isNaN(Number(north)) && !isNaN(Number(south)) &&
    !isNaN(Number(east)) && !isNaN(Number(west)) &&
    Number(north) > Number(south) && Number(east) > Number(west);

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      north: Number(north),
      south: Number(south),
      east: Number(east),
      west: Number(west),
    });
  };

  const handleReset = () => {
    setNorth('');
    setSouth('');
    setEast('');
    setWest('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <MapPin className="h-4 w-4" />
        <span>Define the geographic bounding box for your economic zone. Use <a href="https://boundingbox.klokantech.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">bboxfinder.com</a> to get coordinates.</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex justify-center">
          <div className="w-48">
            <Label className="text-xs">North (top latitude)</Label>
            <Input
              type="number"
              step="any"
              value={north}
              onChange={e => setNorth(e.target.value)}
              placeholder="e.g. 6.62"
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">West (left longitude)</Label>
          <Input
            type="number"
            step="any"
            value={west}
            onChange={e => setWest(e.target.value)}
            placeholder="e.g. 3.38"
            className="font-mono text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">East (right longitude)</Label>
          <Input
            type="number"
            step="any"
            value={east}
            onChange={e => setEast(e.target.value)}
            placeholder="e.g. 3.42"
            className="font-mono text-sm"
          />
        </div>
        <div className="col-span-2 flex justify-center">
          <div className="w-48">
            <Label className="text-xs">South (bottom latitude)</Label>
            <Input
              type="number"
              step="any"
              value={south}
              onChange={e => setSouth(e.target.value)}
              placeholder="e.g. 6.58"
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {north && south && east && west && !isValid && (
        <p className="text-xs text-destructive">North must be greater than South, and East must be greater than West.</p>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!isValid || saving} size="sm">
          {saving ? 'Saving...' : 'Save bounding box'}
        </Button>
        <Button onClick={handleReset} variant="ghost" size="sm" className="gap-1">
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </div>
    </div>
  );
};

export default BBoxPicker;
