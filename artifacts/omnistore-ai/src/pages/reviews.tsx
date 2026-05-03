import { useState } from "react";
import {
  useListReviews,
  useReplyToReview,
  getListReviewsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageCircle, CheckCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarRating({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-${size} w-${size} ${i <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

function generateAIReply(review: any): string {
  const name = review.reviewerName?.split(" ")[0] || "Ji";
  if (review.rating >= 4) {
    return `Bahut shukriya, ${name} ji! 🙏 Aapka feedback sun ke dil khush ho gaya. Hamara pura team aapki tarah ke customers ke liye hi kaam karta hai. Aapko jald hi phir milenge — hamesha special care milegi aapko! ✨`;
  } else if (review.rating === 3) {
    return `Thank you for your honest feedback, ${name} ji. We're sorry your experience wasn't perfect. We're working on improving our wait times and service quality. Do visit us again — we promise a better experience! 🙏`;
  } else {
    return `${name} ji, we sincerely apologize for the experience. This is not the standard we hold ourselves to. Please contact us directly so we can make this right for you. Your satisfaction matters deeply to us. 🙏`;
  }
}

export default function Reviews() {
  const [replyForms, setReplyForms] = useState<Record<number, string>>({});
  const [openReplies, setOpenReplies] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reviews, isLoading } = useListReviews();
  const replyToReview = useReplyToReview();

  const avgRating = reviews && reviews.length > 0
    ? (reviews as any[]).reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: (reviews ?? []).filter((r: any) => r.rating === star).length,
    pct: reviews?.length ? Math.round(((reviews as any[]).filter((r: any) => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const unreplied = (reviews ?? []).filter((r: any) => !r.isReplied);
  const replied = (reviews ?? []).filter((r: any) => r.isReplied);
  const sorted = [...unreplied, ...replied];

  const toggleReply = (id: number) => {
    setOpenReplies((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReply = (id: number) => {
    const text = replyForms[id] || "";
    if (!text.trim()) return;
    replyToReview.mutate(
      { id, data: { reply: text } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
          setOpenReplies((prev) => { const n = new Set(prev); n.delete(id); return n; });
          toast({ title: "Reply posted!" });
        },
        onError: () => toast({ title: "Error posting reply", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Star className="h-8 w-8 text-primary fill-primary" /> Review Monitor
        </h1>
        <p className="text-muted-foreground mt-1">Track and respond to customer reviews.</p>
      </div>

      {/* Rating Summary */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="text-center shrink-0">
              {isLoading ? <Skeleton className="h-20 w-20 mx-auto rounded-xl" /> : (
                <>
                  <p className="text-6xl font-bold text-primary">{avgRating.toFixed(1)}</p>
                  <StarRating rating={Math.round(avgRating)} size={5} />
                  <p className="text-sm text-muted-foreground mt-1">{reviews?.length ?? 0} reviews</p>
                </>
              )}
            </div>
            <div className="flex-1 space-y-1.5 w-full">
              {ratingBreakdown.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-6 shrink-0">{star}★</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-muted-foreground w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{unreplied.length}</p>
                <p className="text-xs text-muted-foreground">Need Reply</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{replied.length}</p>
                <p className="text-xs text-muted-foreground">Replied</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review List */}
      <div className="space-y-3">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)
        ) : sorted.length === 0 ? (
          <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground"><Star className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No reviews yet.</p></CardContent></Card>
        ) : (
          sorted.map((r: any) => (
            <Card key={r.id} className={`border-border bg-card transition-colors ${!r.isReplied ? "border-amber-500/20" : ""}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-foreground text-sm shrink-0">
                      {r.reviewerName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{r.reviewerName}</p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={r.rating} />
                        <span className="text-xs text-muted-foreground">{new Date(r.publishedAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">{r.platform}</Badge>
                    {r.isReplied && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1"><CheckCircle className="h-3 w-3" /> Replied</Badge>}
                  </div>
                </div>

                <p className="text-sm text-foreground leading-relaxed">{r.body}</p>

                {r.isReplied && r.reply && (
                  <div className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary ml-4">
                    <p className="text-xs text-muted-foreground mb-1">Your reply:</p>
                    <p className="text-sm text-foreground">{r.reply}</p>
                  </div>
                )}

                {!r.isReplied && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                      setReplyForms((p) => ({ ...p, [r.id]: generateAIReply(r) }));
                      setOpenReplies((prev) => new Set(prev).add(r.id));
                    }}>
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Reply
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toggleReply(r.id)}>
                      <MessageCircle className="h-3.5 w-3.5" /> Write Reply
                    </Button>
                  </div>
                )}

                {openReplies.has(r.id) && !r.isReplied && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyForms[r.id] || ""}
                      onChange={(e) => setReplyForms((p) => ({ ...p, [r.id]: e.target.value }))}
                      className="text-sm min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleReply(r.id)} disabled={replyToReview.isPending}>Post Reply</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleReply(r.id)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
