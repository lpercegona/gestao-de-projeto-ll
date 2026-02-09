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
  const contentContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = contentContainerRef.current;
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
  }, [content, expanded]);

  if (!content) return null;

  return (
    <div className={cn('space-y-1', className)}>
      <div ref={contentContainerRef} className={cn(!expanded && 'line-clamp-3')}>
        <WysiwygContent content={content} />
      </div>

      {isOverflowing && (
        <button
          type="button"
          onClick={(event) => {
            if (stopPropagationOnToggle) {
              event.stopPropagation();
            }
            setExpanded((current) => !current);
          }}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          {expanded ? '...menos' : '...mais'}
        </button>
      )}
    </div>
  );
};
