import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck } from 'lucide-react';

export const ProposalsTab: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <FileCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">Acesse a página completa de propostas para gerenciar propostas comerciais e templates.</p>
        <Button onClick={() => navigate('/proposals')}>
          Ir para Propostas
        </Button>
      </CardContent>
    </Card>
  );
};
