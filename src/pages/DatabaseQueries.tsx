import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalReferenceNav } from "@/components/technical/TechnicalReferenceNav";

type QueryReference = {
  query: string;
  description: string;
  source: string;
};

const sourceFiles = import.meta.glob([
  "../pages/*.tsx",
  "../components/**/*.tsx",
  "../contexts/*.tsx",
], {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const buildDescription = (type: "from" | "rpc", value: string) => {
  if (type === "from") return `Consulta direta à tabela '${value}'.`;
  return `Chamada de função RPC '${value}'.`;
};

const queryReferences: QueryReference[] = Object.entries(sourceFiles)
  .filter(([filePath]) => !filePath.endsWith("DatabaseQueries.tsx"))
  .flatMap(([filePath, content]) => {
    const rows: QueryReference[] = [];
    const matches = [...content.matchAll(/\.(from|rpc)\(\s*['\"]([^'\"]+)['\"]/g)];

    matches.forEach((match) => {
      const type = match[1] as "from" | "rpc";
      const value = match[2];
      rows.push({
        query: `${type}('${value}')`,
        description: buildDescription(type, value),
        source: filePath.replace("../", "src/"),
      });
    });

    return rows;
  })
  .filter((row, index, arr) => arr.findIndex((item) => item.query === row.query) === index)
  .sort((a, b) => a.query.localeCompare(b.query));

export const DatabaseQueries = () => {
  return (
    <div className="p-6 space-y-6">
      <TechnicalReferenceNav />
      <Card>
        <CardHeader>
          <CardTitle>Strings de consulta ao banco de dados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3 font-medium">String de consulta</th>
                  <th className="text-left p-3 font-medium">Descrição da função</th>
                  <th className="text-left p-3 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {queryReferences.map((item) => (
                  <tr key={item.query} className="border-t align-top">
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{item.query}</td>
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
