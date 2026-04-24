import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackupDialog } from "./BackupDialog";

export function BackupBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem('backup_completed');
    if (!hasCompleted) {
      setIsVisible(true);
    }
  }, []);

  // Update visibility if dialog marks it as completed
  useEffect(() => {
    if (!dialogOpen) {
      const hasCompleted = localStorage.getItem('backup_completed');
      if (hasCompleted) {
        setIsVisible(false);
      }
    }
  }, [dialogOpen]);

  if (!isVisible) return null;

  return (
    <>
      <div className="bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800 p-3 md:p-4 w-full flex flex-col sm:flex-row items-center justify-between gap-3 z-50">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <p className="text-sm md:text-base font-medium text-amber-900 dark:text-amber-400 text-center sm:text-left">
            ⚠️ Faça backup dos seus dados antes de continuar a atualização do sistema.
          </p>
        </div>
        <Button 
          variant="default" 
          size="sm" 
          className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
          onClick={() => setDialogOpen(true)}
        >
          Fazer Backup Agora
        </Button>
      </div>

      <BackupDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
