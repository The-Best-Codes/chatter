import { formatDistanceToNow } from "date-fns";
import { Edit, MoreVertical, Pin, Reply, Smile, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export function MessageList({
  messages,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
}) {
  const { user } = useAuth();
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditContent(message.encrypted_content); // Later, this will be decrypted
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editContent.trim()) {
      onEditMessage(editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Unknown time";
    }
  };

  const canEditMessage = (message) => {
    return message.sender_id === user?.id;
  };

  const canDeleteMessage = (message) => {
    return message.sender_id === user?.id;
  };

  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="group">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.avatar_url} />
              <AvatarFallback>
                {message.display_name?.charAt(0) ||
                  message.username?.charAt(0) ||
                  "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">
                  {message.display_name || message.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {message?.updated_at && "Edited"}{" "}
                  {formatTime(message?.updated_at || message?.created_at)}
                </span>
                {message.is_pinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                {message.is_edited && (
                  <span className="text-xs text-muted-foreground">
                    (edited)
                  </span>
                )}
              </div>

              {/* Reply indicator */}
              {message.reply_to_message && (
                <div className="mb-2 p-2 bg-muted rounded border-l-2 border-primary">
                  <div className="text-xs text-muted-foreground">
                    Replying to{" "}
                    {message.reply_to_message.display_name ||
                      message.reply_to_message.username}
                  </div>
                  <div className="text-sm truncate">
                    {message.reply_to_message.encrypted_content}
                  </div>
                </div>
              )}

              {/* Message content */}
              {editingMessageId === message.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border rounded resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.encrypted_content}
                </div>
              )}

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {message.reactions.map((reaction) => (
                    <Button
                      key={reaction.emoji}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      {reaction.emoji} {reaction.count}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Message actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Smile className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Reply className="h-3 w-3" />
                </Button>

                {/* More actions dropdown */}
                <div className="relative">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>

                  {/* Dropdown menu would go here */}
                  <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 hidden group-hover:block">
                    <div className="py-1">
                      {canEditMessage(message) && (
                        <button
                          className="w-full px-3 py-1 text-left text-sm hover:bg-accent flex items-center gap-2"
                          onClick={() => handleStartEdit(message)}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                      )}

                      <button
                        className="w-full px-3 py-1 text-left text-sm hover:bg-accent flex items-center gap-2"
                        onClick={() => onPinMessage(message.id)}
                      >
                        <Pin className="h-3 w-3" />
                        {message.is_pinned ? "Unpin" : "Pin"}
                      </button>

                      {canDeleteMessage(message) && (
                        <button
                          className="w-full px-3 py-1 text-left text-sm hover:bg-accent text-destructive flex items-center gap-2"
                          onClick={() => onDeleteMessage(message.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
