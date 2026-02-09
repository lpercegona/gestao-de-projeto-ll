import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalReferenceNav } from "@/components/technical/TechnicalReferenceNav";

type ConstantRow = {
  constant: string;
  description: string;
  source: string;
};

const pageSources = import.meta.glob("./*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const describeConstant = (name: string, value: string) => {
  if (name.toLowerCase().includes("regex") || value.includes("/")) return "Padrão de validação/extração.";
  if (name.startsWith("handle") || value.includes("=>")) return "Função de ação/handler da página.";
  if (name.toLowerCase().includes("options") || value.trim().startsWith("[")) return "Lista de opções usada na interface.";
  if (name.toLowerCase().includes("status")) return "Controle de estado e regras visuais de status.";
  if (name.toLowerCase().includes("fetch")) return "Função de carregamento de dados.";
  if (value.trim().startsWith("{")) return "Objeto de configuração usado pela página.";
  return "Constante utilizada na lógica da página.";
};

const constants: ConstantRow[] = Object.entries(pageSources)
  .filter(([filePath]) => !filePath.endsWith("PageConstants.tsx"))
  .flatMap(([filePath, content]) => {
    const rows: ConstantRow[] = [];
    const regex = /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;\n]+)/g;
    const matches = [...content.matchAll(regex)];

    matches.forEach((match) => {
      const constant = match[1];
      const value = match[2];
      rows.push({
        constant,
        description: describeConstant(constant, value),
        source: filePath.replace("./", "src/pages/"),
      });
    });

    return rows;
  })
  .filter((row, index, arr) => arr.findIndex((item) => item.constant === row.constant && item.source === row.source) === index)
  .sort((a, b) => a.constant.localeCompare(b.constant));

export const PageConstants = () => {
  return (
    <div className="p-6 space-y-6">
      <TechnicalReferenceNav />
      <Card>
        <CardHeader>
          <CardTitle>Constantes das páginas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3 font-medium">Constante</th>
                  <th className="text-left p-3 font-medium">Descrição</th>
                  <th className="text-left p-3 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {constants.map((item) => (
                  <tr key={`${item.source}-${item.constant}`} className="border-t align-top">
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{item.constant}</td>
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 font-mono text-xs">{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
