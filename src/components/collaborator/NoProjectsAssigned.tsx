import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FolderX } from 'lucide-react';

export const NoProjectsAssigned: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <FolderX className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Nenhum projeto vinculado
          </h2>
          <p className="text-muted-foreground">
            Solicite o acesso ao administrador da equipe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
