import { useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  id: string;
  onFile: (file: File) => void;
  accept: string;
  label: string;
  hint: string;
  className?: string;
  previewClassName?: string;
}

const UploadZone = ({ id, onFile, accept, label, hint, className, previewClassName }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  };

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFile(event.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all',
        isDragging ? 'border-score-amber bg-score-amber/5' : 'border-border hover:border-score-amber/60 hover:bg-secondary/30',
        className,
      )}
    >
      {preview ? (
        <img src={preview} alt="Upload preview" className={cn('mx-auto max-h-32 rounded-lg object-cover', previewClassName)} />
      ) : (
        <>
          <ImageUp className="mx-auto mb-3 h-8 w-8 text-score-amber" />
          <div className="font-semibold text-score-amber">{label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        </>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
};

export default UploadZone;