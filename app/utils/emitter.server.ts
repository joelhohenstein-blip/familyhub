import { EventEmitter } from "node:events";

// Singleton event emitter for cross-request communication
export const emitter = new EventEmitter();

// Type-safe event emission helpers
export const streamingEvents = {
  /**
   * Emit a data update event for a specific resource
   * This triggers revalidation for useLiveLoader()
   */
  dataUpdate: (resourceType: string, resourceId?: string) => {
    const event = resourceId ? `${resourceType}:${resourceId}` : resourceType;
    emitter.emit("data-update", event);
    emitter.emit(`data-update:${event}`);
    
    // Emit revalidation event for useLiveLoader()
    emitter.emit(`revalidate-${resourceType}`, { 
      timestamp: Date.now(), 
      resourceType,
      resourceId 
    });
  },

  /**
   * Emit a progress update for an operation
   */
  progressUpdate: (operationId: string, progress: number, message?: string) => {
    emitter.emit("progress-update", { operationId, progress, message });
    emitter.emit(`progress-update:${operationId}`, { progress, message });
  },

  /**
   * Emit a chat message event
   */
  chatMessage: (chatId: string, messageId: string) => {
    emitter.emit("chat", { chatId, messageId });
    emitter.emit(`chat:${chatId}`, messageId);
  },

  /**
   * Generic event emission
   */
  emit: (eventName: string, data?: any) => {
    emitter.emit(eventName, data);
  },
}; 