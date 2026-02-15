import React from 'react';
import { WysiwygContent } from '@/components/ui/wysiwyg-editor';

export interface TemplateSection {
  id: string;
  type: 'title' | 'text' | 'image';
  content: string;
  order: number;
}

interface TemplateSectionRendererProps {
  sections: TemplateSection[];
  replaceDynamicFields?: (content: string) => string;
}

export const TemplateSectionRenderer: React.FC<TemplateSectionRendererProps> = ({
  sections,
  replaceDynamicFields,
}) => {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {sorted.map((section) => {
        const content = replaceDynamicFields
          ? replaceDynamicFields(section.content)
          : section.content;

        switch (section.type) {
          case 'title':
            return (
              <h2
                key={section.id}
                className="text-xl font-bold text-foreground"
              >
                {content}
              </h2>
            );
          case 'text':
            return (
              <WysiwygContent
                key={section.id}
                content={content}
              />
            );
          case 'image':
            return content ? (
              <img
                key={section.id}
                src={content}
                alt=""
                className="max-w-full rounded-md"
              />
            ) : null;
          default:
            return null;
        }
      })}
    </div>
  );
};
