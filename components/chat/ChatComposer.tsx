"use client";

import { useState } from "react";
import { Button, Textarea } from "@fluentui/react-components";
import { Send24Regular } from "@fluentui/react-icons";
import styles from "./ChatComposer.module.css";

interface ChatComposerProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled = false }: ChatComposerProps) {
  const [value, setValue] = useState("");

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    setValue("");
    await onSend(trimmed);
  };

  return (
    <div className={styles.composer}>
      <label htmlFor="chat-input" className={styles.label}>
        Escribe tu mensaje
      </label>
      <Textarea
        id="chat-input"
        placeholder="Ejemplo: Quiero viajar a Mallorca el próximo fin de semana"
        value={value}
        onChange={(_, data) => setValue(data.value)}
        onKeyDown={async (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            await handleSend();
          }
        }}
        disabled={disabled}
        resize="none"
        rows={2}
        aria-label="Escribe un mensaje para Marea"
        className={styles.input}
        style={{ gridColumn: "1 / 2", gridRow: "2" }}
      />
      <Button
        appearance="secondary"
        icon={<Send24Regular />}
        onClick={handleSend}
        disabled={disabled}
        aria-label="Enviar mensaje"
        className={styles.sendButton}
        style={{ gridColumn: "2 / 3", gridRow: "2", alignSelf: "end" }}
      />
    </div>
  );
}
