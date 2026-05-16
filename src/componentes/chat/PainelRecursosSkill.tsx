// src/componentes/chat/PainelRecursosSkill.tsx

'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/componentes/ui/sheet';
import { Button } from '@/componentes/ui/button';
import { ScrollArea } from '@/componentes/ui/scroll-area';
import { Loader2, ExternalLink, X } from 'lucide-react';

interface PainelRecursosSkillProps {
  habilidade: string;
  recursos: Array<{ titulo: string; url: string; descricao: string }>;
  carregando: boolean;
  onClose: () => void;
}

export function PainelRecursosSkill({
  habilidade,
  recursos,
  carregando,
  onClose,
}: PainelRecursosSkillProps) {
  return (
    <Sheet open={!!habilidade} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col" side="right">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">
              📚 Recursos para: {habilidade}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {carregando ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Buscando recursos...</p>
            </div>
          ) : recursos.length > 0 ? (
            <div className="space-y-4 p-2">
              {recursos.map((recurso, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm line-clamp-2">{recurso.titulo}</h4>
                    <a
                      href={recurso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  {recurso.descricao && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                      {recurso.descricao}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      asChild
                    >
                      <a href={recurso.url} target="_blank" rel="noopener noreferrer">
                        Abrir <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        navigator.clipboard.writeText(recurso.url);
                      }}
                    >
                      Copiar link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <p>Nenhum recurso encontrado.</p>
              <p className="text-xs">Tente buscar por termos mais genéricos.</p>
            </div>
          )}
        </ScrollArea>

        <div className="border-t pt-4 text-xs text-muted-foreground">
          <p>💡 Dica: Clique em qualquer skill do roadmap para ver recursos.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}