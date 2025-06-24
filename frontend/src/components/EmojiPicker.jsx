"use client";
import { useCallback, useState } from "react";
import emojisData from "../data/emojis.json";
import { Input } from "./ui/input";

function EmojiPicker({ messageId, onEmojiSelect }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelect = useCallback(
    (emojiItem) => {
      onEmojiSelect(messageId, emojiItem);
    },
    [messageId, onEmojiSelect],
  );

  const filteredEmojisData = emojisData
    .map((categoryObject) => {
      const filteredEmojis = categoryObject.emojis.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.slug.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      return {
        ...categoryObject,
        emojis: filteredEmojis,
      };
    })
    .filter((categoryObject) => categoryObject.emojis.length > 0);

  return (
    <div className="p-2">
      <Input
        type="text"
        placeholder="Search emojis..."
        className="mb-4"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="h-64 overflow-y-auto pr-2">
        {filteredEmojisData.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No emojis found for "{searchTerm}"
          </p>
        )}
        {filteredEmojisData.map((categoryObject) => (
          <div key={categoryObject.slug} className="mb-4">
            <h5 className="mb-2 ml-1 text-xs font-medium text-muted-foreground">
              {categoryObject.name}
            </h5>
            <div className="grid grid-cols-8 gap-1">
              {categoryObject.emojis.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => handleSelect(item)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-2xl hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={item.name}
                  title={item.name}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { EmojiPicker };
