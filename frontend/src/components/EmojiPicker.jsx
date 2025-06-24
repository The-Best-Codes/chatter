"use client";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import emojisData from "../data/emojis.json";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function EmojiPicker({ messageId, onEmojiSelect }) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef(null);
  const parentRef = useRef(null);

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

  const virtualItems = [];

  filteredEmojisData.forEach((category) => {
    virtualItems.push({
      type: "category",
      category: category,
      id: `category-${category.slug}`,
    });

    const emojis = category.emojis;
    for (let i = 0; i < emojis.length; i += 8) {
      const rowEmojis = emojis.slice(i, i + 8);
      virtualItems.push({
        type: "emoji-row",
        emojis: rowEmojis,
        id: `row-${category.slug}-${i}`,
      });
    }
  });

  const stickyIndexes = virtualItems
    .map((item, index) => (item.type === "category" ? index : -1))
    .filter((index) => index !== -1);

  const activeStickyIndexRef = useRef(0);

  const isSticky = (index) => stickyIndexes.includes(index);
  const isActiveSticky = (index) => activeStickyIndexRef.current === index;

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      if (item.type === "category") {
        return 26; // Height for category header
      } else {
        return 32; // Height for emoji row with consistent gap
      }
    },
    overscan: 5,
    rangeExtractor: useCallback(
      (range) => {
        activeStickyIndexRef.current =
          [...stickyIndexes]
            .reverse()
            .find((index) => range.startIndex >= index) ?? 0;

        const next = new Set([
          activeStickyIndexRef.current,
          ...defaultRangeExtractor(range),
        ]);

        return [...next].sort((a, b) => a - b);
      },
      [stickyIndexes],
    ),
  });

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
    <div className="p-2 w-76" onKeyDown={handleKeyDown}>
      <Input
        type="text"
        placeholder="Search emojis..."
        className="mb-4"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        ref={inputRef}
      />
      <div ref={parentRef} className="h-64 overflow-y-auto pr-2">
        {virtualItems.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No emojis found for "{searchTerm}"
          </p>
        )}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = virtualItems[virtualItem.index];
            const isStickyItem = isSticky(virtualItem.index);
            const isActiveStickyItem = isActiveSticky(virtualItem.index);

            return (
              <div
                key={virtualItem.key}
                style={{
                  ...(isStickyItem
                    ? {
                        background: "white",
                        borderBottom: "1px solid hsl(var(--border))",
                        zIndex: 1,
                      }
                    : {}),
                  ...(isActiveStickyItem
                    ? {
                        position: "sticky",
                      }
                    : {
                        position: "absolute",
                        transform: `translateY(${virtualItem.start}px)`,
                      }),
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                }}
              >
                {item.type === "category" ? (
                  <h5 className="py-1 ml-1 text-xs font-medium text-muted-foreground">
                    {item.category.name}
                  </h5>
                ) : (
                  <div className="grid grid-cols-8 gap-1 px-1">
                    {item.emojis.map((emoji) => (
                      <Button
                        key={emoji.slug}
                        onClick={() => handleSelect(emoji)}
                        variant="ghost"
                        className="flex h-8 w-8 text-2xl p-0 justify-center items-center"
                        aria-label={emoji.name}
                        title={emoji.name}
                        ref={(el) => setEmojiButtonRef(emoji.slug, el)}
                      >
                        {emoji.emoji}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { EmojiPicker };
