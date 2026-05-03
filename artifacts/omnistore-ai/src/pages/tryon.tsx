import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, Share2, Smartphone, Sparkles, TrendingUp, Eye, MessageCircle, ArrowRight, Play, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEMO_PHOTOS = [
  { label: "Hair Color", before: "https://picsum.photos/seed/hair1/300/400", after: "https://picsum.photos/seed/hair2/300/400" },
  { label: "Bridal Look", before: "https://picsum.photos/seed/bridal1/300/400", after: "https://picsum.photos/seed/bridal2/300/400" },
  { label: "Nail Art", before: "https://picsum.photos/seed/nail1/300/400", after: "https://picsum.photos/seed/nail2/300/400" },
];

export default function TryOn() {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [showAfter, setShowAfter] = useState(false);
  const { toast } = useToast();

  const handleSend = () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Try-On link sent!", description: `Sent to ${phone} via WhatsApp` });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-orange-900/20 to-purple-900/20 border border-primary/30 p-8">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #f97316 0%, transparent 60%)" }} />
        <div className="relative">
          <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI-Powered · Viral Feature</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-3">WhatsApp Try-On Mirror</h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Let customers <span className="text-primary font-semibold">virtually try on looks</span> before booking — straight from WhatsApp. They share it with friends. Friends book you. You win. 🔥
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            {[
              { icon: Camera, label: "AI applies the look" },
              { icon: Share2, label: "Customer shares to story" },
              { icon: TrendingUp, label: "You get viral bookings" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-background/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-border">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Viral Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Try-Ons Shared This Week", value: "2,847", icon: Share2, color: "text-primary" },
          { label: "New Profile Views Generated", value: "14,230", icon: Eye, color: "text-green-400" },
          { label: "Bookings from Try-On", value: "312", icon: MessageCircle, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center">
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Demo Before/After */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Live Demo</h2>
          <div className="flex gap-2">
            {DEMO_PHOTOS.map((d, i) => (
              <button
                key={d.label}
                onClick={() => { setActiveDemo(i); setShowAfter(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeDemo === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-border bg-muted h-80 flex items-center justify-center">
            <img
              src={showAfter ? DEMO_PHOTOS[activeDemo].after : DEMO_PHOTOS[activeDemo].before}
              alt="Try-on demo"
              className="w-full h-full object-cover transition-opacity duration-500"
            />
            <div className="absolute top-3 left-3">
              <Badge className={showAfter ? "bg-primary text-primary-foreground" : "bg-muted/80 text-foreground"}>{showAfter ? "✨ After (AI)" : "Before"}</Badge>
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                onClick={() => setShowAfter((p) => !p)}
                className="bg-background/90 backdrop-blur-sm border border-border text-foreground px-6 py-2.5 rounded-full font-medium text-sm hover:bg-primary/10 transition-colors flex items-center gap-2"
              >
                {showAfter ? "See Original" : "Apply AI Look"}
                <Play className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* How It Works + Send Link */}
        <div className="space-y-5">
          <h2 className="text-xl font-bold">How It Works</h2>
          <div className="space-y-3">
            {[
              { step: "1", title: "Customer sends a selfie", desc: "They WhatsApp their photo to your salon number", icon: Smartphone },
              { step: "2", title: "AI applies the look", desc: "Our AI instantly overlays the hairstyle, color or makeup", icon: Sparkles },
              { step: "3", title: "They share to Instagram Stories", desc: "One tap to share. Their followers see your salon's work", icon: Share2 },
              { step: "4", title: "You get bookings on autopilot", desc: "Followers DM asking for the same look — they book you", icon: TrendingUp },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 font-bold text-primary text-sm">{step}</div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground flex items-center gap-2">{title} <Icon className="h-4 w-4 text-primary" /></p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 space-y-3">
              <p className="font-semibold text-foreground">Send Try-On Link to Customer</p>
              <p className="text-sm text-muted-foreground">Enter their WhatsApp number to send the try-on link instantly.</p>
              {!sent ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} className="gap-2 shrink-0">
                    <MessageCircle className="h-4 w-4" /> Send
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <ArrowRight className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="font-medium text-green-400">Link sent to {phone}!</p>
                    <p className="text-xs text-muted-foreground">Customer will receive a WhatsApp message with the try-on link</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setSent(false); setPhone(""); }}>Send Another</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
