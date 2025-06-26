import { useState } from "react";
import { Message } from "./Message";

export function MessageList({
  messages,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onToggleReaction,
  onReplyToMessage,
  replyingTo,
}) {
  const [openDropdowns, setOpenDropdowns] = useState({});

  return (
    <div>
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onPinMessage={onPinMessage}
          onToggleReaction={onToggleReaction}
          onReplyToMessage={onReplyToMessage}
          replyingTo={replyingTo}
          simplified={false}
          openDropdowns={openDropdowns}
          setOpenDropdowns={setOpenDropdowns}
        />
      ))}
    </div>
  );
}
