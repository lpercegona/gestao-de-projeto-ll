import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnicalReferenceNav } from "@/components/technical/TechnicalReferenceNav";

type StyleRow = {
  component: string;
  classes: string;
  source: string;
};

const styleSources = import.meta.glob("../components/ui/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const extractClasses = (content: string) => {
  const values: string[] = [];
  const regexes = [
    /className\s*=\s*"([^"]+)"/g,
    /cn\(\s*"([^"]+)"/g,
    /cva\(\s*"([^"]+)"/g,
  ];

  regexes.forEach((regex) => {
    const matches = [...content.matchAll(regex)];
    matches.forEach((match) => values.push(match[1]));
  });

  const tokens = new Set(
    values
      .flatMap((item) => item.split(/\s+/))
      .map((item) => item.trim())
      .filter(Boolean),
  );

  return Array.from(tokens).sort().join(" ");
};

const styleRows: StyleRow[] = Object.entries(styleSources)
  .map(([filePath, content]) => {
    const source = filePath.replace("../", "src/");
    const component = source.split("/").pop()?.replace(".tsx", "") ?? source;

    return {
      component,
      classes: extractClasses(content) || "Sem classes detectadas automaticamente.",
      source,
    };
  })
  .sort((a, b) => a.component.localeCompare(b.component));

export const StyleClasses = () => {
  return (
    <div className="p-6 space-y-6">
      <TechnicalReferenceNav />
      <Card>
        <CardHeader>
          <CardTitle>Classes de estilo dos componentes da plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-3 font-medium">Componente</th>
                  <th className="text-left p-3 font-medium">Classes</th>
                  <th className="text-left p-3 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {styleRows.map((item) => (
                  <tr key={item.component} className="border-t align-top">
                    <td className="p-3 font-medium whitespace-nowrap">{item.component}</td>
                    <td className="p-3 font-mono text-xs break-words min-w-[700px]">{item.classes}</td>
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{item.source}</td>
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
