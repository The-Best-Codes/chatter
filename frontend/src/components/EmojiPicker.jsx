"use client";
import { useCallback } from "react";
import emojisData from "../data/emojis.json";

function EmojiPicker({ onEmojiSelect }) {
  const handleSelect = useCallback(
    (emojiItem) => {
      onEmojiSelect(emojiItem);
    },
    [onEmojiSelect],
  );

  return (
    <div className="p-2">
      <h4 className="mb-2 text-sm font-semibold">Pick an emoji</h4>
      <div className="h-[250px] overflow-y-auto pr-2">
        {emojisData.map((categoryObject) => (
          <div key={categoryObject.slug} className="mb-4">
            <h5 className="mb-2 text-xs font-medium text-muted-foreground">
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
