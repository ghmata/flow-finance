import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportDatabaseAsJson, exportDataAsXlsx, getBackupPreview } from "@/lib/backup-export";
import { toast } from "sonner";
import { Package, FileSpreadsheet, Download, Loader2 } from "lucide-react";

interface BackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupDialog({ open, onOpenChange }: BackupDialogProps) {
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [loadingBoth, setLoadingBoth] = useState(false);
  const [recordCount, setRecordCount] = useState<number>(0);

  useEffect(() => {
    if (open) {
      getBackupPreview().then(counts => {
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        setRecordCount(total);
      }).catch(console.error);
    }
  }, [open]);

  const handleBackupJson = async () => {
    try {
      setLoadingJson(true);
      await exportDatabaseAsJson();
      toast.success("Backup do banco salvo com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar backup JSON.");
    } finally {
      setLoadingJson(false);
    }
  };

  const handleBackupXlsx = async () => {
    try {
      setLoadingXlsx(true);
      await exportDataAsXlsx();
      toast.success("Planilha Excel salva com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar planilha XLSX.");
    } finally {
      setLoadingXlsx(false);
    }
  };

  const handleBackupBoth = async () => {
    try {
      setLoadingBoth(true);
      await exportDatabaseAsJson();
      // Pequeno delay para garantir que os downloads não conflitem no navegador
      await new Promise(r => setTimeout(r, 1000));
      await exportDataAsXlsx();
      toast.success("Ambos os arquivos salvos com sucesso!");
      localStorage.setItem('backup_completed', 'true');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar arquivos de backup.");
    } finally {
      setLoadingBoth(false);
    }
  };

  const markAsCompleted = () => {
    localStorage.setItem('backup_completed', 'true');
    onOpenChange(false);
  }

  const isAnyLoading = loadingJson || loadingXlsx || loadingBoth;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Backup dos Seus Dados
          </DialogTitle>
          <DialogDescription>
            Exporte todos os seus dados antes de continuar. Recomendamos baixar ambos os formatos.
            <br /><br />
            <strong>Total de registros encontrados:</strong> {recordCount}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            onClick={handleBackupJson}
            disabled={isAnyLoading}
          >
            {loadingJson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Backup do Banco (JSON)
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            onClick={handleBackupXlsx}
            disabled={isAnyLoading}
          >
            {loadingXlsx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Planilha Excel (XLSX)
          </Button>

          <Button 
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" 
            onClick={handleBackupBoth}
            disabled={isAnyLoading}
          >
            {loadingBoth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar Ambos (Recomendado)
          </Button>
        </div>
        
        <div className="text-center mt-2">
          <Button variant="ghost" size="sm" onClick={markAsCompleted} disabled={isAnyLoading} className="text-xs text-muted-foreground">
            Já fiz o backup, fechar aviso
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
