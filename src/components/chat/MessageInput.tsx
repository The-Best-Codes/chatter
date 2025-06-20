import { useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send } from 'lucide-react';
import { useAuth } from '@/components/auth';

interface MessageInputProps {
  onSendMessage: (content: string, attachment?: File) => Promise<boolean>;
  placeholder?: string;
  maxLength?: number;
  canSendAttachments?: boolean;
}

export function MessageInput({
  onSendMessage,
  placeholder = 'Type a message...',
  maxLength = 2000,
  canSendAttachments = true
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  
  // Use user's permission for max message length if available
  const effectiveMaxLength = user?.permissions?.maxMessageLength || maxLength;
  // Use user's permission for attachments if available
  const effectiveCanSendAttachments = user?.permissions?.canSendAttachments && canSendAttachments;
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && !attachment) return;
    if (message.length > effectiveMaxLength) return;
    
    setIsSending(true);
    
    try {
      const success = await onSendMessage(message, attachment || undefined);
      
      if (success) {
        setMessage('');
        setAttachment(null);
      }
    } finally {
      setIsSending(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };
  
  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
          <div className="flex items-center text-sm">
            <Paperclip className="h-4 w-4 mr-2" />
            <span className="truncate max-w-[200px]">{attachment.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeAttachment}
            className="h-6 w-6 p-0"
          >
            &times;
          </Button>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[80px] resize-none"
            maxLength={effectiveMaxLength}
          />
          {message.length > 0 && (
            <div className="text-xs text-right mt-1 text-muted-foreground">
              {message.length}/{effectiveMaxLength}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {effectiveCanSendAttachments && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </>
          )}
          
          <Button type="submit" disabled={isSending || (!message.trim() && !attachment)}>
            <Send className="h-5 w-5 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}