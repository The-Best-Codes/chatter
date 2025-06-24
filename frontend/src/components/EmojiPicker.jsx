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

// "use client";
// import { useCallback, useEffect, useRef, useState, useMemo } from "react";
// import emojisData from "../data/emojis.json";
// import { Button } from "./ui/button";
// import { Input } from "./ui/input";
// import { VariableSizeList } from "react-window"; // New import for virtualization

// function EmojiPicker({ messageId, onEmojiSelect }) {
//   const [searchTerm, setSearchTerm] = useState("");
//   const inputRef = useRef(null);
//   const containerRef = useRef(null);
//   const listRef = useRef(null); // Ref for VariableSizeList instance

//   const emojiButtonRefsMap = useRef(new Map());

//   // State to hold the measured width for the react-window list
//   const [listWidth, setListWidth] = useState(0);

//   const setEmojiButtonRef = useCallback((itemSlug, el) => {
//     if (el) {
//       emojiButtonRefsMap.current.set(itemSlug, el);
//     } else {
//       emojiButtonRefsMap.current.delete(itemSlug);
//     }
//   }, []);

//   useEffect(() => {
//     if (inputRef.current) {
//       inputRef.current.focus();
//     }
//     // Measure the width of the container once it's mounted
//     if (containerRef.current) {
//       setListWidth(containerRef.current.clientWidth);
//     }
//   }, []);

//   // Update list width if window resizes, or if the parent container changes size
//   useEffect(() => {
//     const handleResize = () => {
//       if (containerRef.current) {
//         setListWidth(containerRef.current.clientWidth);
//       }
//     };
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   const handleSelect = useCallback(
//     (emojiItem) => {
//       onEmojiSelect(messageId, emojiItem);
//     },
//     [messageId, onEmojiSelect],
//   );

//   const filteredEmojisData = useMemo(() => {
//     return emojisData
//       .map((categoryObject) => {
//         const filteredEmojis = categoryObject.emojis.filter(
//           (item) =>
//             item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             item.slug.toLowerCase().includes(searchTerm.toLowerCase()),
//         );
//         return {
//           ...categoryObject,
//           emojis: filteredEmojis,
//         };
//       })
//       .filter((categoryObject) => categoryObject.emojis.length > 0);
//   }, [searchTerm]);

//   // Transform filteredEmojisData into a flat list of virtualized items (headers or emoji rows)
//   const virtualizedItems = useMemo(() => {
//     const items = [];
//     filteredEmojisData.forEach((categoryObject) => {
//       // Add category header item
//       items.push({
//         type: "header",
//         content: categoryObject.name,
//         slug: categoryObject.slug,
//       });

//       // Group emojis into rows of 8
//       for (let i = 0; i < categoryObject.emojis.length; i += 8) {
//         const emojiRow = categoryObject.emojis.slice(i, i + 8);
//         items.push({ type: "emojiRow", content: emojiRow });
//       }
//     });
//     return items;
//   }, [filteredEmojisData]);

//   // Define the height for each item based on its type
//   const getItemSize = useCallback(
//     (index) => {
//       const item = virtualizedItems[index];
//       if (item.type === "header") {
//         // Estimated height for a category header (h5 + mb-2 + some padding/line height).
//         // You might need to fine-tune this value by inspecting the rendered element in the browser.
//         return 35;
//       } else {
//         // Estimated height for an emoji row: h-8 (32px) button height + gap-1 (4px)
//         return 36;
//       }
//     },
//     [virtualizedItems],
//   );

//   // The Row component that VariableSizeList will render for each visible item
//   const Row = useCallback(
//     ({ index, style }) => {
//       const item = virtualizedItems[index];

//       if (item.type === "header") {
//         return (
//           // Apply style for correct positioning by react-window
//           <div style={style}>
//             <h5 className="mb-2 ml-1 text-xs font-medium text-muted-foreground">
//               {item.content}
//             </h5>
//           </div>
//         );
//       } else {
//         // item.type === 'emojiRow'
//         return (
//           // Apply style for correct positioning by react-window
//           <div style={style} className="grid grid-cols-8 gap-1">
//             {item.content.map((emojiItem) => (
//               <Button
//                 key={emojiItem.slug}
//                 onClick={() => handleSelect(emojiItem)}
//                 variant="ghost"
//                 className="flex h-8 w-8 text-2xl"
//                 aria-label={emojiItem.name}
//                 title={emojiItem.name}
//                 ref={(el) => setEmojiButtonRef(emojiItem.slug, el)}
//               >
//                 {emojiItem.emoji}
//               </Button>
//             ))}
//           </div>
//         );
//       }
//     },
//     [virtualizedItems, handleSelect, setEmojiButtonRef], // Dependencies for Row component
//   );

//   const handleKeyDown = useCallback(
//     (event) => {
//       if (event.key === "Tab") {
//         const currentFocusedElement = document.activeElement;
//         const inputElement = inputRef.current;

//         // Only consider currently rendered emoji buttons.
//         // Due to virtualization, `emojiButtonRefsMap` only contains refs for visible emojis.
//         const sortedEmojiButtons = Array.from(emojiButtonRefsMap.current.values())
//           .filter(Boolean)
//           .sort(
//             (a, b) =>
//               a.compareDocumentPosition(b) - b.compareDocumentPosition(a),
//           );

//         const focusableElements = [inputElement, ...sortedEmojiButtons].filter(
//           Boolean,
//         );

//         const currentIdx = focusableElements.indexOf(currentFocusedElement);

//         // If focus is outside our controlled elements, let default tab behavior continue
//         if (currentIdx === -1) {
//           return;
//         }

//         event.preventDefault(); // Prevent default tab behavior

//         let nextIdx;
//         if (event.shiftKey) {
//           nextIdx =
//             (currentIdx - 1 + focusableElements.length) %
//             focusableElements.length;
//         } else {
//           nextIdx = (currentIdx + 1) % focusableElements.length;
//         }

//         // Focus the next element within the currently visible set.
//         // Tabbing will cycle through visible elements only.
//         focusableElements[nextIdx]?.focus();
//       }
//     },
//     [], // Dependencies are stable, emojiButtonRefsMap.current is stable
//   );

//   return (
//     <div className="p-2" ref={containerRef} onKeyDown={handleKeyDown}>
//       <Input
//         type="text"
//         placeholder="Search emojis..."
//         className="mb-4"
//         value={searchTerm}
//         onChange={(e) => setSearchTerm(e.target.value)}
//         ref={inputRef}
//       />
//       {/* Container for the virtualized list. Hide its own scrollbar as react-window handles it. */}
//       <div className="h-64 pr-2" style={{ overflowY: "hidden" }}>
//         {virtualizedItems.length === 0 && (
//           <p className="text-center text-sm text-muted-foreground">
//             No emojis found for "{searchTerm}"
//           </p>
//         )}
//         {/* Only render VariableSizeList if we have items and have measured the width */}
//         {virtualizedItems.length > 0 && listWidth > 0 && (
//           <VariableSizeList
//             ref={listRef}
//             height={256} // Fixed height from h-64 Tailwind class (64 * 4 = 256px)
//             width={listWidth} // Measured width of the container
//             itemCount={virtualizedItems.length} // Total number of virtual items (headers + emoji rows)
//             itemSize={getItemSize} // Function to determine each item's height
//           >
//             {Row}
//           </VariableSizeList>
//         )}
//       </div>
//     </div>
//   );
// }

// export { EmojiPicker };
