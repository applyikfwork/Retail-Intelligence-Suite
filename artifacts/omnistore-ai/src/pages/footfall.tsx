import { useGetFootfallHeatmap, useGetFootfallInsights } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Zap, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Footfall() {
  const { data: heatmap, isLoading: loadingHeatmap } = useGetFootfallHeatmap();
  const { data: insights, isLoading: loadingInsights } = useGetFootfallInsights();

  // Helper to map 0-1 to a color scale: Blue -> Yellow -> Red
  const getHeatmapColor = (intensity: number) => {
    if (intensity < 0.33) return 'rgba(59, 130, 246, 0.6)'; // Blue (Cold)
    if (intensity < 0.66) return 'rgba(234, 179, 8, 0.6)'; // Yellow (Warm)
    return 'rgba(239, 68, 68, 0.7)'; // Red (Hot)
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Spatial Intelligence</h1>
        <p className="text-muted-foreground mt-1">Live camera-based store heatmap and conversion tracking.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Heatmap View */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="flex justify-between items-center text-lg">
                <span className="flex items-center gap-2"><Map className="h-5 w-5 text-primary" /> Live Store Floorplan</span>
                {heatmap?.lastUpdated && (
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Updated {new Date(heatmap.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loadingHeatmap ? (
                <Skeleton className="w-full aspect-[4/3] rounded-xl" />
              ) : (
                <div className="relative w-full aspect-[4/3] bg-muted/10 border-2 border-border/50 rounded-xl overflow-hidden shadow-inner">
                  {/* Grid background pattern */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                  
                  {/* Zones */}
                  {heatmap?.zones.map((zone) => (
                    <div 
                      key={zone.id}
                      className="absolute border border-white/20 rounded-md backdrop-blur-sm transition-all duration-1000 hover:ring-2 hover:ring-primary hover:z-10 group"
                      style={{
                        left: `${zone.x}%`,
                        top: `${zone.y}%`,
                        width: `${zone.width}%`,
                        height: `${zone.height}%`,
                        backgroundColor: getHeatmapColor(zone.intensity),
                      }}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white drop-shadow-md">
                        <span className="font-bold text-sm tracking-wide text-center leading-tight">{zone.label}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bg-black/80 text-white text-xs p-2 rounded -top-12 whitespace-nowrap z-20 pointer-events-none">
                          {zone.visitors} Visitors • {(zone.conversionRate * 100).toFixed(0)}% Conv.
                        </div>
                      </div>
                      {zone.alert && (
                        <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 animate-bounce">
                          <AlertTriangle className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-blue-500/60"></span> Cold Zone</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-yellow-500/60"></span> Warm Zone</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-500/70"></span> Hot Zone</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Panel */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> AI Insights
          </h2>
          
          <div className="space-y-4">
            {loadingInsights ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
            ) : (
              insights?.map((insight, i) => (
                <Card key={insight.id} className={`border-l-4 animate-in fade-in slide-in-from-right-4 ${
                  insight.type === 'opportunity' ? 'border-l-primary bg-primary/5' : 
                  insight.type === 'warning' ? 'border-l-destructive bg-destructive/5' : 
                  'border-l-green-500 bg-green-500/5'
                }`} style={{ animationDelay: `${i * 100}ms` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full mt-0.5 ${
                        insight.type === 'opportunity' ? 'bg-primary/20 text-primary' : 
                        insight.type === 'warning' ? 'bg-destructive/20 text-destructive' : 
                        'bg-green-500/20 text-green-500'
                      }`}>
                        {insight.type === 'opportunity' ? <TrendingUp className="h-4 w-4" /> : 
                         insight.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : 
                         <Info className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{insight.zone}</h4>
                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                        {insight.actionSuggested && (
                          <div className="mt-3 inline-block bg-background border border-border px-3 py-1.5 rounded-md text-xs font-bold">
                            Action: {insight.actionSuggested}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}