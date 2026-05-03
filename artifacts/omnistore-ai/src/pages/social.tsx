import { useState } from "react";
import { useListPosts, useCreatePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Instagram, MapPin, ThumbsUp, Eye, Share2, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Social() {
  const { data: posts, isLoading } = useListPosts();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auto-Poster</h1>
          <p className="text-muted-foreground mt-1">Publish to Google Business & Instagram instantly.</p>
        </div>
        <CreatePostDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-80 rounded-2xl" />)
        ) : (
          posts?.map((post, i) => (
            <Card key={post.id} className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-40 bg-muted/30 relative flex items-center justify-center overflow-hidden group">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                )}
                <div className="absolute top-3 right-3 flex gap-1">
                  {post.platforms.includes('instagram') && (
                    <div className="bg-pink-600/90 backdrop-blur text-white p-1.5 rounded-md shadow-sm"><Instagram className="h-3 w-3" /></div>
                  )}
                  {post.platforms.includes('google_business') && (
                    <div className="bg-blue-600/90 backdrop-blur text-white p-1.5 rounded-md shadow-sm"><MapPin className="h-3 w-3" /></div>
                  )}
                </div>
                <Badge className="absolute bottom-3 left-3 uppercase text-[10px] font-bold tracking-wider" variant={post.status === 'published' ? 'default' : 'secondary'}>
                  {post.status}
                </Badge>
              </div>
              <CardContent className="pt-4 pb-2">
                <p className="text-sm text-foreground line-clamp-3 leading-relaxed">{post.caption}</p>
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-3 text-xs text-muted-foreground flex justify-between bg-muted/10">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.likes}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.reach}</span>
                </div>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CreatePostDialog() {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(['google_business']);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createPost = useCreatePost();

  const togglePlatform = (p: string) => {
    if (platforms.includes(p)) {
      if (platforms.length > 1) setPlatforms(platforms.filter(x => x !== p));
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption || platforms.length === 0) return;
    
    createPost.mutate(
      { data: { caption, imageUrl: imageUrl || null, platforms: platforms as any[] } },
      {
        onSuccess: () => {
          toast({ title: "Post Scheduled", description: "Content is being published across networks." });
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
          setOpen(false);
          setCaption(""); setImageUrl("");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-bold"><Sparkles className="h-4 w-4" /> Create Post</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Social Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Networks</label>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => togglePlatform('google_business')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${platforms.includes('google_business') ? 'border-blue-500 bg-blue-500/10 text-blue-500 font-bold' : 'border-border text-muted-foreground'}`}
              >
                <MapPin className="h-5 w-5" /> G-Business
              </button>
              <button 
                type="button"
                onClick={() => togglePlatform('instagram')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${platforms.includes('instagram') ? 'border-pink-500 bg-pink-500/10 text-pink-500 font-bold' : 'border-border text-muted-foreground'}`}
              >
                <Instagram className="h-5 w-5" /> Instagram
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image URL (Optional)</label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              <span>Caption</span>
              <span className="text-primary text-xs flex items-center gap-1 cursor-pointer"><Sparkles className="h-3 w-3"/> Auto-write</span>
            </label>
            <Textarea required value={caption} onChange={(e) => setCaption(e.target.value)} className="h-32 resize-none" placeholder="We are open! Drop by today..." />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createPost.isPending} className="font-bold gap-2">
              {createPost.isPending ? "Publishing..." : <><Share2 className="h-4 w-4"/> Publish Now</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}