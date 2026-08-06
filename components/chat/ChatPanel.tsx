"use client";

import { useEffect, useRef, useState } from "react";
import React from "react";
import { Body1Strong, Card } from "@fluentui/react-components";
import type { ChatMessageModel } from "@/lib/agent/eventTypes";
import { ChatMessage } from "./ChatMessage";
import { ChatComposer } from "./ChatComposer";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  messages: ChatMessageModel[];
  isBusy: boolean;
  inputDisabled: boolean;
  onSendMessage: (text: string) => Promise<void>;
  consentRequired?: boolean;
  onAcceptConsent?: () => void;
  /** Contenido rico opcional que se renderiza inline al final de los mensajes */
  inlineContent?: React.ReactNode;
}

const starterPrompts = [
  "Quiero ir de Valencia a Ibiza el 15 de agosto, somos 2 con un coche",
  "¿Qué puedes hacer?",
  "Tengo una reserva y quiero consultarla",
] as const;

function MareaWaveIcon() {
  return (
    <img src="/ola-icon.png" alt="" role="presentation" aria-hidden="true" />
  );
}

export function ChatPanel({ messages, isBusy, inputDisabled, onSendMessage, consentRequired = false, onAcceptConsent, inlineContent }: ChatPanelProps) {
  const messagesContainerRef = useRef<HTMLElement>(null);
  const inlineContentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const hasInlineContent = inlineContent !== undefined && inlineContent !== null;

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const raf = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "auto",
      });
    });

    return () => cancelAnimationFrame(raf);
  };

  useEffect(() => {
    return scrollToBottom();
  }, [messages, isBusy]);

  useEffect(() => {
    if (!hasInlineContent) return;

    const container = messagesContainerRef.current;
    const inline = inlineContentRef.current;
    if (!container || !inline) {
      return scrollToBottom();
    }

    const raf = requestAnimationFrame(() => {
      const desiredBottomGap = 10;
      const targetTop = inline.offsetTop + inline.clientHeight - container.clientHeight + desiredBottomGap;
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "auto",
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [hasInlineContent, messages.length]);

  useEffect(() => {
    if (consentRequired) {
      setConsentChecked(false);
    }
  }, [consentRequired]);

  const canUseStarterPrompts = !isBusy && !inputDisabled;

  const onSelectStarterPrompt = async (prompt: string) => {
    if (!canUseStarterPrompts) {
      return;
    }

    await onSendMessage(prompt);
  };

  if (consentRequired) {
    return (
      <Card className={styles.wrapper} style={{ padding: 0, gap: 0 }}>
        <section className={styles.consentGate} aria-label="Consentimiento para iniciar conversación">
          <div className={styles.consentIconWrap}>
            <MareaWaveIcon />
          </div>
          <Body1Strong className={styles.consentTitle}>Hola, soy Marea</Body1Strong>
          <p className={styles.consentText}>
            Tu asistente de reservas de Trasmed. Puedo ayudarte a buscar tu ferry,
            añadir vehículo, mascota, servicios a bordo, hotel y coche en destino,
            y dejar tu presupuesto listo para pagar de forma segura.
          </p>
          <label className={styles.consentCheckRow}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
              className={styles.consentCheckbox}
            />
            <span>
              He leído y acepto la {" "}
              <a
                href="https://web.trasmed.com/statics/documents/es/proteccion-de-datos-trasmed-politica-de-privacidad.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.consentLink}
              >
                Política de Privacidad
              </a>{" "}
              para iniciar la conversación.
            </span>
          </label>
          <button
            type="button"
            className={styles.consentStartButton}
            disabled={!consentChecked}
            onClick={() => onAcceptConsent?.()}
          >
            Empezar
          </button>
        </section>
      </Card>
    );
  }

  return (
    <Card className={styles.wrapper} style={{ padding: 0, gap: 0 }}>
      <section
        ref={messagesContainerRef}
        className={`${styles.messages} ${hasInlineContent ? styles.messagesWithInline : ""}`}
        aria-label="Historial de conversación"
      >
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              <MareaWaveIcon />
            </span>
            <Body1Strong className={styles.emptyText}>
              ¡Hola! Soy Marea.
            </Body1Strong>
            <span className={styles.emptySub}>
              Cuéntame a dónde quieres viajar.
            </span>
            <div className={styles.starterPrompts} aria-label="Sugerencias para empezar">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className={styles.starterPromptButton}
                  onClick={() => onSelectStarterPrompt(prompt)}
                  disabled={!canUseStarterPrompts}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isBusy && (
          <div className={styles.typingIndicator} aria-label="Marea está escribiendo">
            <div className={styles.typingBubble}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <span className={styles.typingLabel}>Marea está escribiendo…</span>
          </div>
        )}
        {inlineContent && (
          <div ref={inlineContentRef} className={styles.inlineContent}>
            {inlineContent}
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>
      <ChatComposer onSend={onSendMessage} disabled={isBusy || inputDisabled} />
    </Card>
  );
}
