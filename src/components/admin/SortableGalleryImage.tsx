import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortableGalleryImageProps {
  id: string;
  imageUrl: string;
  altText: string;
  index: number;
  onRemove: () => void;
}

export function SortableGalleryImage({ 
  id, 
  imageUrl, 
  altText, 
  index, 
  onRemove 
}: SortableGalleryImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square ${isDragging ? 'opacity-50 scale-105' : ''}`}
    >
      <img
        src={imageUrl}
        alt={altText || `Imagem ${index + 1}`}
        className="w-full h-full object-cover rounded-lg border shadow-sm"
      />
      
      {/* Overlay with actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="h-8 w-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </div>
        
        {/* Remove Button */}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Index Badge */}
      <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded font-medium">
        {index + 1}
      </div>
      
      {/* Drag indicator when not hovering */}
      <div className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded opacity-50 group-hover:opacity-0 transition-opacity">
        <GripVertical className="h-3 w-3" />
      </div>
    </div>
  );
}
