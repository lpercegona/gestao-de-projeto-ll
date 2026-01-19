import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileSignature,
  Loader2,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle,
  User,
  Building,
  FileText,
  Download,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ServiceItem {
  id: string;
  service: string;
  description: string;
  hours: number;
  pricePerHour: number;
}

interface ContractData {
  id: string;
  title: string;
  content: string;
  contractor_name: string;
  contractor_email: string;
  contractor_company: string | null;
  services_summary: ServiceItem[];
  total_hours: number;
  total_value: number;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  status: string;
  created_at: string;
}

export const PublicContract: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  
  // Signature form
  const [signerName, setSignerName] = useState('');
  const [signerDocument, setSignerDocument] = useState('');
  const [signerAddress, setSignerAddress] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  const fetchContract = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate token format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(token || '')) {
        setError('Token de acesso inválido');
        return;
      }

      const { data, error: rpcError } = await supabase
        .rpc('get_contract_by_token', { p_token: token });

      if (rpcError) {
        console.error('Error fetching contract:', rpcError);
        setError('Erro ao carregar contrato');
        return;
      }

      if (!data || data.length === 0) {
        setError('Contrato não encontrado');
        return;
      }

      const contractData = data[0];
      setContract({
        ...contractData,
        services_summary: (contractData.services_summary as unknown as ServiceItem[]) || [],
      });
      
      // Pre-fill signer name
      setSignerName(contractData.contractor_name);
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao carregar contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signerName.trim()) {
      toast.error('Digite seu nome completo');
      return;
    }
    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os termos do contrato');
      return;
    }

    setSigning(true);
    try {
      // Get client IP (basic approach)
      let clientIp = 'unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        clientIp = ipData.ip;
      } catch (e) {
        console.log('Could not fetch IP');
      }

      const { data, error } = await supabase
        .rpc('sign_contract', {
          p_token: token,
          p_signer_name: signerName,
          p_document: signerDocument || null,
          p_address: signerAddress || null,
          p_signer_ip: clientIp,
        });

      if (error) throw error;

      if (data) {
        toast.success('Contrato assinado com sucesso!');
        setSignDialogOpen(false);
        fetchContract();
      } else {
        toast.error('Não foi possível assinar o contrato');
      }
    } catch (err) {
      console.error('Error signing:', err);
      toast.error('Erro ao assinar contrato');
    } finally {
      setSigning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">Aguardando Assinatura</Badge>;
      case 'viewed':
        return <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300">Visualizado</Badge>;
      case 'signed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">Assinado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canSign = contract?.status === 'sent' || contract?.status === 'viewed';

  // Replace variables in content
  const processContent = (content: string) => {
    if (!contract) return content;
    
    return content
      .replace(/\{\{contractor_name\}\}/g, contract.contractor_name)
      .replace(/\{\{contractor_email\}\}/g, contract.contractor_email)
      .replace(/\{\{contractor_company\}\}/g, contract.contractor_company || '')
      .replace(/\{\{total_hours\}\}/g, String(contract.total_hours))
      .replace(/\{\{total_value\}\}/g, contract.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
      .replace(/\{\{start_date\}\}/g, contract.start_date ? format(parseISO(contract.start_date), 'dd/MM/yyyy') : '')
      .replace(/\{\{end_date\}\}/g, contract.end_date ? format(parseISO(contract.end_date), 'dd/MM/yyyy') : '');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <FileSignature className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Contrato não encontrado</h2>
            <p className="text-muted-foreground">{error || 'Este contrato não existe ou foi removido.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card print:hidden">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSignature className="w-6 h-6 text-primary" />
            <span className="font-semibold">Contrato Digital</span>
          </div>
          {getStatusBadge(contract.status)}
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Contract Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{contract.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contractor Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{contract.contractor_name}</span>
              </div>
              {contract.contractor_company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>{contract.contractor_company}</span>
                </div>
              )}
            </div>

            {/* Dates and Values */}
            <div className="grid gap-4 sm:grid-cols-4 pt-4 border-t">
              {contract.start_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="font-medium">{format(parseISO(contract.start_date), 'dd/MM/yyyy')}</p>
                </div>
              )}
              {contract.end_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Término</p>
                  <p className="font-medium">{format(parseISO(contract.end_date), 'dd/MM/yyyy')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Horas</p>
                <p className="font-medium">{contract.total_hours}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="font-medium text-primary">
                  {contract.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Summary */}
        {contract.services_summary.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contract.services_summary.map((item, index) => (
                  <div key={item.id || index} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{item.service}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.hours}h × {item.pricePerHour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <p className="font-medium">
                      {(item.hours * item.pricePerHour).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contract Content */}
        {contract.content && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Termos do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {processContent(contract.content)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Terms */}
        {contract.payment_terms && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Condições de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{contract.payment_terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Signature Status */}
        {contract.status === 'signed' && (
          <Card className="mb-6 border-green-500/50 bg-green-500/10">
            <CardContent className="py-6">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Contrato Assinado</p>
                  <p className="text-sm">Este contrato foi assinado digitalmente.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          {canSign && (
            <Button onClick={() => setSignDialogOpen(true)}>
              <FileSignature className="w-4 h-4 mr-2" />
              Assinar Contrato
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground print:hidden">
        <p>Contrato digital gerado em {format(parseISO(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </footer>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar Contrato</DialogTitle>
            <DialogDescription>
              Preencha seus dados para assinar digitalmente este contrato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label>CPF/CNPJ</Label>
              <Input
                value={signerDocument}
                onChange={(e) => setSignerDocument(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={signerAddress}
                onChange={(e) => setSignerAddress(e.target.value)}
                placeholder="Endereço completo"
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="accept-terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label htmlFor="accept-terms" className="text-sm text-muted-foreground cursor-pointer">
                Li e aceito todos os termos e condições deste contrato.
              </label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSign} disabled={signing || !acceptedTerms}>
              {signing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};
