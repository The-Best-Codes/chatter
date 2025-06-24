import { formatDistanceToNow } from "date-fns";
import { Edit, MoreVertical, Pin, Reply, Smile, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { EmojiPicker } from "../EmojiPicker";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Textarea } from "../ui/textarea";

export function MessageList({
  messages,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onToggleReaction,
}) {
  const { user } = useAuth();
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [openDropdowns, setOpenDropdowns] = useState({});

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

  const handleEmojiSelect = (messageId, emojiData) => {
    onToggleReaction(messageId, emojiData.emoji);
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
    <div>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`group hover:bg-muted p-4 ${openDropdowns[message.id] ? "bg-muted" : ""}`}
        >
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
                  {/* TODO: Make a seperate time component with error boundaries and live updates */}
                  {message?.updated_at && "Edited"}{" "}
                  {formatTime(message?.updated_at || message?.created_at)}
                </span>
                {message.is_pinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
              </div>

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

              {editingMessageId === message.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
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

              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {message.reactions.map((reaction) => {
                    const userReacted = reaction.users?.some(
                      (u) => u.userId === user?.id,
                    );
                    return (
                      <Button
                        key={reaction.emoji}
                        variant={userReacted ? "secondary" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          onToggleReaction(message.id, reaction.emoji)
                        }
                      >
                        {reaction.emoji} {reaction.count}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className={`${
                openDropdowns[message.id]
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <div className="relative flex items-center gap-0">
                <DropdownMenu
                  onOpenChange={(isOpen) => {
                    setOpenDropdowns((prev) => ({
                      ...prev,
                      [message.id]: isOpen,
                    }));
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 border-r-0 outline-0 rounded-r-none"
                    >
                      <Smile className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 border-x-0 outline-0 rounded-none"
                >
                  <Reply className="h-3 w-3" />
                </Button>

                <DropdownMenu
                  onOpenChange={(isOpen) => {
                    setOpenDropdowns((prev) => ({
                      ...prev,
                      [message.id]: isOpen,
                    }));
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 border-l-0 outline-0 rounded-l-none"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEditMessage(message) && (
                      <DropdownMenuItem
                        onClick={() => handleStartEdit(message)}
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={() => onPinMessage(message.id)}>
                      <Pin className="h-3 w-3" />
                      {message.is_pinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>

                    {canDeleteMessage(message) && (
                      <DropdownMenuItem
                        onClick={() => onDeleteMessage(message.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
