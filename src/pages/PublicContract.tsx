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
  CheckCircle,
  User,
  Building,
  Download,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatHours } from '@/lib/formatHours';
import { SignatureCanvas } from '@/components/contracts/SignatureCanvas';

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
  contractor_company: string | null;
  contractor_document: string | null;
  contractor_address: string | null;
  contractor_cnpj: string | null;
  contractor_cpf_responsavel: string | null;
  services_summary: ServiceItem[];
  total_hours: number;
  total_value: number;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  status: string;
  created_at: string;
  signer_name: string | null;
  admin_signature_url: string | null;
  client_signature_url: string | null;
  witness_signature_url: string | null;
  witness_name: string | null;
  admin_signed_at: string | null;
  client_signed_at: string | null;
  witness_signed_at: string | null;
  admin_company: string | null;
  admin_cnpj: string | null;
  admin_cpf: string | null;
  admin_address: string | null;
}

type SignMode = 'client' | 'witness' | null;

export const PublicContract: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signMode, setSignMode] = useState<SignMode>(null);
  const [signing, setSigning] = useState(false);
  
  // Client signature form
  const [signerName, setSignerName] = useState('');
  const [signerDocument, setSignerDocument] = useState('');
  const [signerAddress, setSignerAddress] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  
  // Witness form
  const [witnessName, setWitnessName] = useState('');
  const [witnessCpf, setWitnessCpf] = useState('');

  useEffect(() => {
    if (token) fetchContract();
  }, [token]);

  const fetchContract = async () => {
    setLoading(true);
    setError(null);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(token || '')) {
        setError('Token de acesso inválido');
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('get_contract_by_token', { p_token: token });

      if (rpcError) {
        setError('Erro ao carregar contrato');
        return;
      }
      if (!data || data.length === 0) {
        setError('Contrato não encontrado');
        return;
      }

      const d = data[0];
      setContract({
        ...d,
        services_summary: (d.services_summary as unknown as ServiceItem[]) || [],
      } as ContractData);
      setSignerName(d.contractor_name);
    } catch {
      setError('Erro ao carregar contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signMode || !signatureDataUrl) {
      toast.error('Desenhe sua assinatura');
      return;
    }

    if (signMode === 'client') {
      if (!signerName.trim()) { toast.error('Digite seu nome completo'); return; }
      if (!acceptedTerms) { toast.error('Aceite os termos do contrato'); return; }
    }
    if (signMode === 'witness') {
      if (!witnessName.trim()) { toast.error('Digite o nome da testemunha'); return; }
    }

    setSigning(true);
    try {
      // Get IP
      let clientIp = 'unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        clientIp = ipData.ip;
      } catch { /* ignore */ }

      // Upload signature to storage
      const prefix = signMode === 'witness' ? 'witness' : 'client';
      const fileName = `${prefix}_${contract?.id}_${Date.now()}.png`;
      const base64Data = signatureDataUrl.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('contract-signatures')
        .upload(fileName, binaryData, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('contract-signatures')
        .getPublicUrl(fileName);

      const { data: result, error: signError } = await supabase.rpc('sign_contract', {
        p_token: token,
        p_signer_name: signMode === 'client' ? signerName : witnessName,
        p_document: signMode === 'client' ? signerDocument || null : witnessCpf || null,
        p_address: signMode === 'client' ? signerAddress || null : null,
        p_signer_ip: clientIp,
        p_signature_type: signMode,
        p_signature_url: urlData.publicUrl,
      });

      if (signError) throw signError;

      if (result) {
        toast.success(signMode === 'client' ? 'Contrato assinado com sucesso!' : 'Testemunha registrada!');
        setSignMode(null);
        setSignatureDataUrl(null);
        setAcceptedTerms(false);
        fetchContract();
      } else {
        toast.error('Não foi possível registrar a assinatura');
      }
    } catch (err) {
      console.error('Error signing:', err);
      toast.error('Erro ao assinar contrato');
    } finally {
      setSigning(false);
    }
  };

  const processContent = (content: string) => {
    if (!contract) return content;
    return content
      .replace(/\{\{contractor_name\}\}/g, contract.contractor_name)
      .replace(/\{\{contractor_email\}\}/g, '')
      .replace(/\{\{contractor_company\}\}/g, contract.contractor_company || '')
      .replace(/\{\{contractor_cnpj\}\}/g, contract.contractor_cnpj || '')
      .replace(/\{\{contractor_cpf\}\}/g, contract.contractor_cpf_responsavel || contract.contractor_document || '')
      .replace(/\{\{contractor_address\}\}/g, contract.contractor_address || '')
      .replace(/\{\{admin_company\}\}/g, contract.admin_company || '')
      .replace(/\{\{admin_cnpj\}\}/g, contract.admin_cnpj || '')
      .replace(/\{\{admin_cpf\}\}/g, contract.admin_cpf || '')
      .replace(/\{\{admin_name\}\}/g, contract.signer_name || '')
      .replace(/\{\{admin_address\}\}/g, contract.admin_address || '')
      .replace(/\{\{total_hours\}\}/g, String(contract.total_hours))
      .replace(/\{\{total_value\}\}/g, contract.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
      .replace(/\{\{start_date\}\}/g, contract.start_date ? format(parseISO(contract.start_date), 'dd/MM/yyyy') : '')
      .replace(/\{\{end_date\}\}/g, contract.end_date ? format(parseISO(contract.end_date), 'dd/MM/yyyy') : '');
  };

  const canClientSign = contract && (contract.status === 'sent' || contract.status === 'viewed') && !contract.client_signed_at;
  const canWitnessSign = contract && !contract.witness_signed_at;
  const isFullySigned = contract?.status === 'signed';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline">Rascunho</Badge>;
      case 'sent': return <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">Aguardando Assinatura</Badge>;
      case 'viewed': return <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300">Visualizado</Badge>;
      case 'signed': return <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">Assinado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
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

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Contract Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{contract.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Parties Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Admin / Contratado */}
              <div className="border rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Contratado</p>
                {contract.admin_company && <p className="text-sm font-medium">{contract.admin_company}</p>}
                {contract.admin_cnpj && <p className="text-xs text-muted-foreground">CNPJ: {contract.admin_cnpj}</p>}
                {contract.admin_cpf && <p className="text-xs text-muted-foreground">CPF: {contract.admin_cpf}</p>}
                {contract.admin_address && <p className="text-xs text-muted-foreground">{contract.admin_address}</p>}
              </div>
              {/* Client / Contratante */}
              <div className="border rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Contratante</p>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{contract.contractor_name}</span>
                </div>
                {contract.contractor_company && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building className="w-3 h-3" />
                    <span>{contract.contractor_company}</span>
                  </div>
                )}
                {contract.contractor_cnpj && <p className="text-xs text-muted-foreground">CNPJ: {contract.contractor_cnpj}</p>}
                {contract.contractor_address && <p className="text-xs text-muted-foreground">{contract.contractor_address}</p>}
              </div>
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
                <p className="font-medium">{formatHours(contract.total_hours)}</p>
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

        {/* Services */}
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
                      {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatHours(item.hours)} × {item.pricePerHour.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

        {/* Signatures Section */}
        {(contract.admin_signed_at || contract.client_signed_at || contract.witness_signed_at) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Assinaturas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Admin signature */}
                <div className="text-center space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Contratado</p>
                  {contract.admin_signature_url ? (
                    <img src={contract.admin_signature_url} alt="Assinatura do admin" className="mx-auto max-h-20 border rounded" />
                  ) : (
                    <div className="h-20 border rounded flex items-center justify-center text-muted-foreground text-xs">Pendente</div>
                  )}
                  {contract.admin_signed_at && (
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(contract.admin_signed_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  )}
                </div>

                {/* Client signature */}
                <div className="text-center space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Contratante</p>
                  {contract.client_signature_url ? (
                    <img src={contract.client_signature_url} alt="Assinatura do cliente" className="mx-auto max-h-20 border rounded" />
                  ) : (
                    <div className="h-20 border rounded flex items-center justify-center text-muted-foreground text-xs">Pendente</div>
                  )}
                  {contract.client_signed_at && (
                    <>
                      <p className="text-xs font-medium">{contract.signer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(contract.client_signed_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </>
                  )}
                </div>

                {/* Witness signature */}
                <div className="text-center space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Testemunha</p>
                  {contract.witness_signature_url ? (
                    <img src={contract.witness_signature_url} alt="Assinatura da testemunha" className="mx-auto max-h-20 border rounded" />
                  ) : (
                    <div className="h-20 border rounded flex items-center justify-center text-muted-foreground text-xs">Opcional</div>
                  )}
                  {contract.witness_signed_at && (
                    <>
                      <p className="text-xs font-medium">{contract.witness_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(contract.witness_signed_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signed Status */}
        {isFullySigned && (
          <Card className="mb-6 border-green-500/50 bg-green-500/10">
            <CardContent className="py-6">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Contrato Assinado</p>
                  <p className="text-sm">Este contrato foi assinado digitalmente por ambas as partes.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center print:hidden">
          {isFullySigned && (
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          )}
          {canClientSign && (
            <Button onClick={() => setSignMode('client')}>
              <FileSignature className="w-4 h-4 mr-2" />
              Assinar Contrato
            </Button>
          )}
          {canWitnessSign && !isFullySigned && (
            <Button variant="outline" onClick={() => setSignMode('witness')}>
              <FileSignature className="w-4 h-4 mr-2" />
              Assinar como Testemunha
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground print:hidden">
        <p>Contrato digital gerado em {format(parseISO(contract.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </footer>

      {/* Sign Dialog */}
      <Dialog open={signMode !== null} onOpenChange={(open) => !open && setSignMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {signMode === 'client' ? 'Assinar Contrato' : 'Assinar como Testemunha'}
            </DialogTitle>
            <DialogDescription>
              {signMode === 'client'
                ? 'Preencha seus dados e desenhe sua assinatura.'
                : 'Preencha os dados da testemunha e desenhe a assinatura.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {signMode === 'client' && (
              <>
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Seu nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input value={signerDocument} onChange={(e) => setSignerDocument(e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={signerAddress} onChange={(e) => setSignerAddress(e.target.value)} placeholder="Endereço completo" />
                </div>
              </>
            )}

            {signMode === 'witness' && (
              <>
                <div className="space-y-2">
                  <Label>Nome da Testemunha *</Label>
                  <Input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>CPF da Testemunha</Label>
                  <Input value={witnessCpf} onChange={(e) => setWitnessCpf(e.target.value)} placeholder="000.000.000-00" />
                </div>
              </>
            )}

            {/* Signature Canvas */}
            <SignatureCanvas
              onConfirm={(dataUrl) => setSignatureDataUrl(dataUrl)}
              onClear={() => setSignatureDataUrl(null)}
            />

            {signMode === 'client' && (
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
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSignMode(null)}>Cancelar</Button>
            <Button
              onClick={handleSign}
              disabled={signing || !signatureDataUrl || (signMode === 'client' && !acceptedTerms)}
            >
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
