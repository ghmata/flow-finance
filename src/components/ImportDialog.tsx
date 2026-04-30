import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { importXlsxToSupabase, ImportReport } from '@/lib/xlsx-import';
import { importJsonToSupabase } from '@/lib/json-import';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export function ImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clearExisting, setClearExisting] = useState(false);
  const [reports, setReports] = useState<ImportReport[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setReports(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setIsImporting(true);
      setProgress(20);
      
      if (clearExisting) {
        console.warn("A opção 'Limpar dados' foi selecionada, mas a exclusão destrutiva requer admin.");
      }

      setProgress(50);
      let result: ImportReport[];
      
      if (file.name.endsWith('.json')) {
        result = await importJsonToSupabase(file);
      } else {
        result = await importXlsxToSupabase(file);
      }
      
      setReports(result);
      setProgress(100);
      toast.success('Importação concluída!');
    } catch (error) {
      console.error('Erro na importação:', error);
      const err = error as Error;
      toast.error(err.message || 'Erro ao importar arquivo. Verifique se é um backup válido.');
      setProgress(0);
    } finally {
      setIsImporting(false);
    }
  };

  const totalImported = reports?.reduce((acc, curr) => acc + curr.imported, 0) || 0;
  const totalErrors = reports?.reduce((acc, curr) => acc + curr.errors, 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <UploadCloud className="w-4 h-4" />
          Importar Dados
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-teal-600" />
            Importar Dados
          </DialogTitle>
          <DialogDescription>
            Restaure os dados a partir de um backup em formato JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!reports ? (
            <>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 border-muted-foreground/25 hover:bg-muted/80 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-muted-foreground">.JSON (MAX. 20MB)</p>
                  </div>
                  <input type="file" className="hidden" accept=".json" onChange={handleFileChange} />
                </label>
              </div>

              {file && (
                <div className="text-sm p-3 bg-teal-50 text-teal-900 rounded-md border border-teal-200 flex justify-between items-center">
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="clear-data" 
                  checked={clearExisting}
                  onCheckedChange={(checked) => setClearExisting(checked as boolean)}
                />
                <Label htmlFor="clear-data" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Limpar dados existentes antes de importar
                </Label>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Processando arquivo...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={handleImport} 
                disabled={!file || isImporting} 
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Iniciar Importação'
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-green-50 text-green-900 rounded-lg border border-green-200">
                <CheckCircle2 className="w-8 h-8 mr-3 text-green-600" />
                <div>
                  <h4 className="font-semibold">Importação Concluída</h4>
                  <p className="text-sm text-green-800">{totalImported} registros importados com sucesso.</p>
                </div>
              </div>

              {totalErrors > 0 && (
                <div className="flex items-center p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-sm">
                  <AlertCircle className="w-5 h-5 mr-2 text-amber-600 flex-shrink-0" />
                  <span>Houve {totalErrors} erros. Registros corrompidos ou com formato incorreto foram ignorados.</span>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-2 text-sm border rounded-md p-2">
                {reports.map((report, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b last:border-0">
                    <span className="font-medium capitalize">{report.tabela}</span>
                    <span className="text-muted-foreground">
                      <span className="text-green-600 font-semibold">{report.imported}</span> / <span className="text-red-500">{report.errors}</span> erros
                    </span>
                  </div>
                ))}
              </div>

              <Button onClick={() => setIsOpen(false)} className="w-full bg-teal-600 hover:bg-teal-700">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
