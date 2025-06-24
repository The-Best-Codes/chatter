"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import emojisData from "../data/emojis.json";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function EmojiPicker({ messageId, onEmojiSelect }) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const emojiButtonRefsMap = useRef(new Map());

  const setEmojiButtonRef = useCallback((itemSlug, el) => {
    if (el) {
      emojiButtonRefsMap.current.set(itemSlug, el);
    } else {
      emojiButtonRefsMap.current.delete(itemSlug);
    }
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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

  const handleKeyDown = useCallback((event) => {
    if (event.key === "Tab") {
      const currentFocusedElement = document.activeElement;

      const inputElement = inputRef.current;

      const sortedEmojiButtons = Array.from(emojiButtonRefsMap.current.values())
        .filter(Boolean)
        .sort(
          (a, b) => a.compareDocumentPosition(b) - b.compareDocumentPosition(a),
        );

      const focusableElements = [inputElement, ...sortedEmojiButtons].filter(
        Boolean,
      );

      const currentIdx = focusableElements.indexOf(currentFocusedElement);

      if (currentIdx === -1) {
        return;
      }

      event.preventDefault();

      let nextIdx;
      if (event.shiftKey) {
        nextIdx = (currentIdx + 1) % focusableElements.length;
      } else {
        nextIdx =
          (currentIdx - 1 + focusableElements.length) %
          focusableElements.length;
      }

      focusableElements[nextIdx]?.focus();
    }
  }, []);

  return (
    <div className="p-2" ref={containerRef} onKeyDown={handleKeyDown}>
      <Input
        type="text"
        placeholder="Search emojis..."
        className="mb-4"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        ref={inputRef}
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
                <Button
                  key={item.slug}
                  onClick={() => handleSelect(item)}
                  variant="ghost"
                  className="flex h-8 w-8 text-2xl"
                  aria-label={item.name}
                  title={item.name}
                  ref={(el) => setEmojiButtonRef(item.slug, el)}
                >
                  {item.emoji}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { EmojiPicker };
