import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  FolderTree, 
  Tags, 
  Package,
  Wifi,
  WifiOff,
  Clock
} from "lucide-react";

export interface SyncProgressData {
  syncId: string | null;
  status: "idle" | "running" | "completed" | "error";
  currentStep: string;
  stepProgress: number;
  stepTotal: number;
  message: string;
  categoriesSynced: number;
  attributesSynced: number;
  attributeValuesHarvested: number;
  productsCreated: number;
  productsUpdated: number;
  errors: string[];
  isConnected: boolean;
  startedAt?: string;
}

interface SyncProgressCardProps {
  progress: SyncProgressData;
  onClose?: () => void;
}

// Componente separado para o indicador de 3 fases
function PhaseIndicator({ currentStep, status }: { currentStep: string; status: string }) {
  const phases = [
    { key: "categories", label: "Categorias", icon: FolderTree },
    { key: "attributes", label: "Atributos", icon: Tags },
    { key: "products", label: "Produtos", icon: Package },
  ];

  const getPhaseStatus = (phaseKey: string) => {
    if (status === "completed") return "completed";
    if (status === "error") {
      // Se erro, marcar fases anteriores como completas até a atual
      const currentIndex = phases.findIndex(p => p.key === currentStep);
      const phaseIndex = phases.findIndex(p => p.key === phaseKey);
      if (phaseIndex < currentIndex) return "completed";
      if (phaseIndex === currentIndex) return "error";
      return "pending";
    }
    
    const currentIndex = phases.findIndex(p => p.key === currentStep);
    const phaseIndex = phases.findIndex(p => p.key === phaseKey);
    
    if (phaseIndex < currentIndex) return "completed";
    if (phaseIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      {phases.map((phase, index) => {
        const phaseStatus = getPhaseStatus(phase.key);
        const Icon = phase.icon;
        
        return (
          <React.Fragment key={phase.key}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${phaseStatus === "completed" ? "bg-green-500 text-white" : ""}
                  ${phaseStatus === "active" ? "bg-primary text-primary-foreground animate-pulse" : ""}
                  ${phaseStatus === "error" ? "bg-destructive text-destructive-foreground" : ""}
                  ${phaseStatus === "pending" ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {phaseStatus === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : phaseStatus === "active" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : phaseStatus === "error" ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className={`text-xs font-medium ${phaseStatus === "active" ? "text-primary" : "text-muted-foreground"}`}>
                {phase.label}
              </span>
            </div>
            {index < phases.length - 1 && (
              <div className={`h-0.5 flex-1 max-w-8 transition-colors duration-300 ${
                getPhaseStatus(phases[index + 1].key) !== "pending" ? "bg-green-500" : "bg-muted"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Componente separado para o timer
function ElapsedTimer({ startedAt }: { startedAt?: string }) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!startedAt) return;

    const startTime = new Date(startedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      const minutes = Math.floor(diff / 60).toString().padStart(2, "0");
      const seconds = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${minutes}:${seconds}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span>{elapsed} decorrido</span>
    </div>
  );
}

export function SyncProgressCard({ progress, onClose }: SyncProgressCardProps) {
  if (progress.status === "idle" || !progress.syncId) {
    return null;
  }

  const percentage = progress.stepTotal > 0 
    ? Math.round((progress.stepProgress / progress.stepTotal) * 100) 
    : 0;

  // Calcular progresso global (0-100%) baseado nas 3 fases
  const calculateOverallProgress = () => {
    if (progress.status === "completed") return 100;
    if (progress.status === "error") return percentage;
    
    const stepWeights = {
      categories: { start: 0, end: 20 },
      attributes: { start: 20, end: 35 },
      products: { start: 35, end: 100 },
      finalizing: { start: 95, end: 100 },
    };

    const currentWeight = stepWeights[progress.currentStep as keyof typeof stepWeights] || { start: 0, end: 100 };
    const stepRange = currentWeight.end - currentWeight.start;
    const stepPercent = progress.stepTotal > 0 ? (progress.stepProgress / progress.stepTotal) : 0;
    
    return Math.round(currentWeight.start + (stepRange * stepPercent));
  };

  const overallProgress = calculateOverallProgress();

  const getStepLabel = (step: string) => {
    switch (step) {
      case "categories":
        return "Categorias";
      case "attributes":
        return "Atributos";
      case "products":
        return "Produtos";
      case "finalizing":
        return "Finalizando";
      default:
        return "Iniciando...";
    }
  };

  const getStatusBadge = () => {
    switch (progress.status) {
      case "running":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Sincronizando
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {progress.status === "running" ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : progress.status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Sincronização em Andamento
          </CardTitle>
          <div className="flex items-center gap-2">
            {progress.isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <WifiOff className="h-3 w-3 mr-1" />
                Desconectado
              </Badge>
            )}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase Indicator - 3 etapas visuais */}
        {progress.status === "running" && (
          <PhaseIndicator currentStep={progress.currentStep} status={progress.status} />
        )}

        {/* Overall Progress Bar */}
        {progress.status === "running" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {getStepLabel(progress.currentStep)}
                {progress.stepTotal > 0 && ` (${progress.stepProgress}/${progress.stepTotal})`}
              </span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <div className="flex justify-between items-center">
              <ElapsedTimer startedAt={progress.startedAt} />
              {progress.stepTotal > 0 && (
                <span className="text-xs text-muted-foreground">
                  {progress.stepProgress} de {progress.stepTotal} itens
                </span>
              )}
            </div>
          </div>
        )}

        {/* Running animation for steps without progress */}
        {progress.status === "running" && progress.stepTotal === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{progress.message || "Processando..."}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-background rounded-lg p-3 text-center">
            <FolderTree className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{progress.categoriesSynced}</p>
            <p className="text-xs text-muted-foreground">Categorias</p>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <Tags className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">
              {progress.attributesSynced}
              {progress.attributeValuesHarvested > 0 && (
                <span className="text-xs text-green-600 ml-1">
                  +{progress.attributeValuesHarvested}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Atributos</p>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <Package className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-green-600">+{progress.productsCreated}</p>
            <p className="text-xs text-muted-foreground">Novos</p>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <Package className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-blue-600">{progress.productsUpdated}</p>
            <p className="text-xs text-muted-foreground">Atualizados</p>
          </div>
        </div>

        {/* Current Message */}
        {progress.message && (
          <div className="text-sm text-muted-foreground bg-background rounded-lg p-3 font-mono truncate">
            {progress.message}
          </div>
        )}

        {/* Errors */}
        {progress.errors && progress.errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive mb-2">
              Erros ({progress.errors.length}):
            </p>
            <ul className="text-xs text-destructive/80 space-y-1 max-h-24 overflow-y-auto">
              {progress.errors.slice(0, 5).map((err, idx) => (
                <li key={idx}>• {err}</li>
              ))}
              {progress.errors.length > 5 && (
                <li>... e mais {progress.errors.length - 5} erros</li>
              )}
            </ul>
          </div>
        )}

        {/* Close button for completed/error states */}
        {(progress.status === "completed" || progress.status === "error") && onClose && (
          <button
            onClick={onClose}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Fechar
          </button>
        )}
      </CardContent>
    </Card>
  );
}
