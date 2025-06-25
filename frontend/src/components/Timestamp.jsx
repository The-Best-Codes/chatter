import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

// eslint-disable-next-line no-unused-vars
function TimestampFallback({ error, resetErrorBoundary }) {
  console.error("Timestamp Error:", error);
  return (
    <span role="alert" className="text-xs text-red-500">
      Error loading time.
    </span>
  );
}

function TimeDisplay({ createdAt, updatedAt }) {
  const [formattedTime, setFormattedTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const dateToFormat = new Date(updatedAt || createdAt);

        if (isNaN(dateToFormat.getTime())) {
          throw new Error("Invalid date string provided");
        }

        setFormattedTime(
          formatDistanceToNow(dateToFormat, { addSuffix: true }),
        );
      } catch (error) {
        console.error("Error formatting message timestamp:", error);
        setFormattedTime("Unknown time");
      }
    };

    updateTime();

    const intervalId = setInterval(updateTime, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [createdAt, updatedAt]);

  const isEdited = !!updatedAt;

  return (
    <span className="text-xs text-muted-foreground">
      {isEdited && "Edited"} {formattedTime}
    </span>
  );
}

export function Timestamp({ createdAt, updatedAt }) {
  return (
    <ErrorBoundary FallbackComponent={TimestampFallback}>
      <TimeDisplay createdAt={createdAt} updatedAt={updatedAt} />
    </ErrorBoundary>
  );
}
