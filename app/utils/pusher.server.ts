import Pusher from 'pusher';

/**
 * Server-side Pusher instance for real-time event broadcasting
 * Requires environment variables:
 * - PUSHER_APP_ID
 * - PUSHER_KEY
 * - PUSHER_SECRET
 * - PUSHER_CLUSTER
 */

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher {
  if (pusherInstance) {
    return pusherInstance;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    console.warn(
      'Pusher credentials not configured. Real-time updates will be disabled. ' +
      'Set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, and PUSHER_CLUSTER environment variables.'
    );
    // Return a dummy instance that won't throw errors
    return new Pusher({
      appId: 'dummy',
      key: 'dummy',
      secret: 'dummy',
      cluster: 'mt1',
    });
  }

  pusherInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherInstance;
}

export const pusher = getPusher();

/**
 * Type-safe Pusher event broadcasting
 */
export const pusherEvents = {
  /**
   * Broadcast a new post to a family channel
   */
  postCreated: async (familyId: string, post: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'post-created', {
      type: 'post-created',
      post,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast a new reply to a family channel
   */
  replyCreated: async (familyId: string, reply: any, parentPostId: string) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'reply-created', {
      type: 'reply-created',
      reply,
      parentPostId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast a post deletion to a family channel
   */
  postDeleted: async (familyId: string, postId: string) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'post-deleted', {
      type: 'post-deleted',
      postId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast media added to a post
   */
  mediaAdded: async (familyId: string, postId: string, media: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'media-added', {
      type: 'media-added',
      postId,
      media,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast a new 1-on-1 conversation created
   */
  conversationCreated: async (familyId: string, conversation: any, otherUserId: string) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'conversation-created', {
      type: 'conversation-created',
      conversation,
      otherUserId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast a new message in a 1-on-1 conversation
   */
  conversationMessage: async (conversationId: string, message: any) => {
    const channelName = `private-conversation-${conversationId}`;
    await pusher.trigger(channelName, 'message-sent', {
      type: 'message-sent',
      message,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast a message read receipt
   */
  messageRead: async (conversationId: string, messageId: string, readBy: string) => {
    const channelName = `private-conversation-${conversationId}`;
    await pusher.trigger(channelName, 'message-read', {
      type: 'message-read',
      messageId,
      readBy,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast presence status update (online/offline)
   */
  presenceUpdate: async (familyId: string, presenceData: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'presence-update', {
      type: 'presence-update',
      ...presenceData,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast typing indicator status
   */
  typingUpdate: async (conversationId: string, typingData: any) => {
    const channelName = `private-conversation-${conversationId}`;
    await pusher.trigger(channelName, 'typing-update', {
      type: 'typing-update',
      ...typingData,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task list created event
   */
  taskListCreated: async (familyId: string, list: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-list-created', {
      type: 'task-list-created',
      list,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task list updated event
   */
  taskListUpdated: async (familyId: string, list: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-list-updated', {
      type: 'task-list-updated',
      list,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task list deleted event
   */
  taskListDeleted: async (familyId: string, listId: string) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-list-deleted', {
      type: 'task-list-deleted',
      listId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task item added event
   */
  taskItemAdded: async (familyId: string, listId: string, item: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-item-added', {
      type: 'task-item-added',
      listId,
      item,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task item updated event
   */
  taskItemUpdated: async (familyId: string, listId: string, item: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-item-updated', {
      type: 'task-item-updated',
      listId,
      item,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task item deleted event
   */
  taskItemDeleted: async (familyId: string, listId: string, itemId: string) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-item-deleted', {
      type: 'task-item-deleted',
      listId,
      itemId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task item assigned event
   */
  taskItemAssigned: async (familyId: string, listId: string, item: any, assignedToMemberId: string) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-item-assigned', {
      type: 'task-item-assigned',
      listId,
      item,
      assignedToMemberId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast task list shared event
   */
  taskListShared: async (familyId: string, listId: string, shares: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'task-list-shared', {
      type: 'task-list-shared',
      listId,
      shares,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast timeline highlight created event
   */
  timelineHighlightCreated: async (familyId: string, highlight: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'timeline-highlight-created', {
      type: 'timeline-highlight-created',
      highlight,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast timeline highlight updated event
   */
  timelineHighlightUpdated: async (familyId: string, highlight: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'timeline-highlight-updated', {
      type: 'timeline-highlight-updated',
      highlight,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Broadcast timeline highlight deleted event
   */
  timelineHighlightDeleted: async (familyId: string, highlightId: string) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, 'timeline-highlight-deleted', {
      type: 'timeline-highlight-deleted',
      highlightId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Generic event trigger for custom events
   */
  trigger: async (familyId: string, eventName: string, data: any) => {
    const channelName = `private-family-${familyId}`;
    await pusher.trigger(channelName, eventName, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
};
