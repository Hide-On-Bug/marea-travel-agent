import { Caption1 } from "@fluentui/react-components";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessageModel } from "@/lib/agent/eventTypes";
import styles from "./ChatMessage.module.css";

interface ChatMessageProps {
  message: ChatMessageModel;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const roleLabel =
    message.role === "user"
      ? "Tú"
      : message.role === "agent"
        ? "Marea"
        : "Sistema";

  return (
    <article className={`${styles.message} ${styles[message.role]}`} aria-live="polite">
      <Caption1 className={styles.role}>{roleLabel}</Caption1>
      <div className={styles.content}>
        <Markdown remarkPlugins={[remarkGfm]}>{message.text}</Markdown>
      </div>
    </article>
  );
}
