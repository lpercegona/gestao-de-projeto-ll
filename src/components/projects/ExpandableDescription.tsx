import React from 'react';
import { WysiwygContent } from '@/components/ui/wysiwyg-editor';
import { cn } from '@/lib/utils';

interface ExpandableDescriptionProps {
  content: string;
  className?: string;
  stopPropagationOnToggle?: boolean;
}

export const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({
  content,
  className,
  stopPropagationOnToggle = false,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const collapsedMeasureRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = collapsedMeasureRef.current;
    if (!element) return;

    const checkOverflow = () => {
      setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(element);
    window.addEventListener('resize', checkOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [content]);

  const preventParentToggle = (event: React.SyntheticEvent) => {
    if (!stopPropagationOnToggle) return;

    event.preventDefault();
    event.stopPropagation();
  };

  const toggleExpanded = (event: React.MouseEvent<HTMLButtonElement>) => {
    preventParentToggle(event);
    setExpanded((current) => !current);
  };

  if (!content) return null;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative">
        <div className={cn(!expanded && 'line-clamp-3')}>
          <WysiwygContent content={content} />
        </div>

        {isOverflowing && !expanded && (
          <span className="absolute bottom-0 right-0 bg-background pl-1 text-xs text-muted-foreground">
            ...{' '}
            <button
              type="button"
              onPointerDown={preventParentToggle}
              onMouseDown={preventParentToggle}
              onClick={toggleExpanded}
              className="underline underline-offset-2"
            >
              mais
            </button>
          </span>
        )}

        <div
          ref={collapsedMeasureRef}
          aria-hidden
          className="absolute top-0 left-0 right-0 invisible pointer-events-none line-clamp-3"
        >
          <WysiwygContent content={content} />
        </div>
      </div>

      {isOverflowing && expanded && (
        <button
          type="button"
          onPointerDown={preventParentToggle}
          onMouseDown={preventParentToggle}
          onClick={toggleExpanded}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          Recolher
        </button>
      )}
    </div>
  );
};
