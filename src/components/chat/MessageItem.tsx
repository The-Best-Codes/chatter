import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Message } from '@/lib/api/room-messages';
import type { Attachment } from '@/lib/api/attachments';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Check, X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { toast } from 'sonner';

interface MessageItemProps {
  message: Message;
  onEdit: (messageId: string, newContent: string) => Promise<boolean>;
  onDelete: (messageId: string) => Promise<boolean>;
}

export function MessageItem({ message, onEdit, onDelete }: MessageItemProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  
  const isOwnMessage = user?.id === message.senderId;
  const canEdit = isOwnMessage && !message.hasAttachment;
  const canDelete = isOwnMessage || user?.isAdmin;
  
  // Fetch attachments if message has them
  useEffect(() => {
    if (message.hasAttachment) {
      fetchAttachments();
    }
  }, [message.id, message.hasAttachment]);
  
  const fetchAttachments = async () => {
    setIsLoadingAttachments(true);
    try {
      const response = await fetch(`/api/attachments/message/${message.id}`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setIsLoadingAttachments(false);
    }
  };
  
  const handleEdit = async () => {
    if (editedContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    
    const success = await onEdit(message.id, editedContent);
    if (success) {
      setIsEditing(false);
    }
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(message.id);
    if (!success) {
      setIsDeleting(false);
    }
  };
  
  const cancelEdit = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };
  
  // Format timestamp
  const formattedTime = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });
  
  if (isDeleting) {
    return null; // Message is being deleted
  }
  
  return (
    <div className="py-2 px-4 hover:bg-muted/30 group">
      <div className="flex">
        <Avatar className="h-8 w-8 mr-3 mt-0.5">
          <AvatarFallback>
            {message.senderUsername?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="font-medium text-sm">{message.senderUsername}</span>
            <span className="ml-2 text-xs text-muted-foreground">{formattedTime}</span>
            
            {/* Edit/Delete buttons */}
            {(canEdit || canDelete) && !isEditing && (
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex">
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-1">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[80px] text-sm"
                autoFocus
              />
              <div className="flex justify-end mt-2 space-x-2">
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleEdit}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
          
          {/* Attachments */}
          {message.hasAttachment && (
            <div className="mt-2">
              {isLoadingAttachments ? (
                <div className="text-sm text-muted-foreground">Loading attachments...</div>
              ) : attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map(attachment => {
                    // Skip attachments with size "0"
                    if (attachment.size === 0) return null;
                    
                    const isImage = attachment.mimeType?.startsWith('image/');
                    
                    return (
                      <div key={attachment.id} className="border rounded-md p-2 flex items-center">
                        {isImage ? (
                          <ImageIcon className="h-5 w-5 mr-2 text-blue-500" />
                        ) : (
                          <FileText className="h-5 w-5 mr-2 text-blue-500" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{attachment.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/attachments/${attachment.id}/download`);
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = URL.createObjectURL(blob);
                                
                                if (isImage) {
                                  // For images, open in a new tab
                                  window.open(url, '_blank');
                                } else {
                                  // For other files, download
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = attachment.filename;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }
                              } else {
                                toast.error('Failed to download attachment');
                              }
                            } catch (error) {
                              console.error('Error downloading attachment:', error);
                              toast.error('Error downloading attachment');
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No attachments found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}