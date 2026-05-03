import { useState, useRef, useEffect } from "react";
import { 
  useListConversations, 
  useCreateConversation, 
  useListMessages,
  getListConversationsQueryKey,
  getListMessagesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, Send, Bot, User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const { data: conversations, isLoading: loadingConversations } = useListConversations();
  const createConversation = useCreateConversation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleNewChat = () => {
    createConversation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setActiveConversationId(conv.id);
        }
      }
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-in fade-in duration-500">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col border-border bg-card">
        <div className="p-4 border-b border-border/50">
          <Button onClick={handleNewChat} className="w-full gap-2 font-bold" disabled={createConversation.isPending}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConversations ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)
            ) : conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`w-full text-left px-3 py-3 rounded-md transition-colors text-sm ${activeConversationId === conv.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-border bg-card relative overflow-hidden">
        {activeConversationId ? (
          <ChatArea conversationId={activeConversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-6">
              <Bot className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Namaste! Main hoon aapka Omni-Manager</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Ask me anything about your business. I can analyze sales, generate reports, suggest campaigns, or help with operations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
              {[
                "What's my revenue forecast for this week?",
                "Draft a WhatsApp message for customers who haven't visited in 60 days.",
                "Which services have the highest profit margin?",
                "Summarize today's performance."
              ].map((q, i) => (
                <Card key={i} className="p-4 cursor-pointer hover:border-primary/50 transition-colors text-left bg-muted/50 border-border" onClick={() => {
                  createConversation.mutate(
                    { data: { title: "New Conversation" } },
                    {
                      onSuccess: (conv) => {
                        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
                        setActiveConversationId(conv.id);
                        // TODO: Ideally pre-fill the input, but we'll let the user type for now or handle via context
                      }
                    }
                  );
                }}>
                  <p className="text-sm font-medium text-foreground">{q}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ChatArea({ conversationId }: { conversationId: number }) {
  const { data: messages, isLoading } = useListMessages(conversationId);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg = input.trim();
    setInput("");
    
    // Optimistic UI update
    queryClient.setQueryData(getListMessagesQueryKey(conversationId), (old: any) => {
      const newMsg = { id: Date.now(), conversationId, role: "user", content: userMsg, createdAt: new Date().toISOString() };
      return [...(old || []), newMsg];
    });

    setIsStreaming(true);
    setStreamingText("");

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.content) setStreamingText(prev => prev + parsed.content);
              if (parsed.done) {
                setIsStreaming(false);
                queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error(error);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
        <div className="space-y-6 pb-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4 ml-auto rounded-xl rounded-tr-sm" />
              <Skeleton className="h-24 w-3/4 rounded-xl rounded-tl-sm" />
            </div>
          ) : (
            messages?.map((msg) => (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted/50 border border-border rounded-tl-sm text-foreground'}`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))
          )}

          {isStreaming && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-foreground flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-4 rounded-xl text-sm bg-muted/50 border border-border rounded-tl-sm text-foreground">
                <div className="whitespace-pre-wrap">{streamingText}</div>
                <div className="flex items-center gap-1 mt-2 h-4">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="relative flex items-end gap-2 bg-muted/30 border border-border rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Omni-Manager..."
            className="min-h-[44px] max-h-32 border-0 bg-transparent focus-visible:ring-0 resize-none shadow-none text-base py-3"
            disabled={isStreaming}
          />
          <Button 
            size="icon" 
            className="h-10 w-10 shrink-0 rounded-lg mb-1" 
            onClick={handleSend} 
            disabled={!input.trim() || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center mt-2">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" /> AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </>
  );
}