import type { Post, PostMedia } from '~/db/schema';

/**
 * Type definitions for Pusher real-time events
 * These events are broadcast to family channels when posts, replies, and media are created/deleted
 */

/**
 * Base event structure for all Pusher events
 */
export interface PusherEvent {
  type: string;
  timestamp: string;
}

/**
 * Fired when a new post is created in the family message board
 */
export interface PostCreatedEvent extends PusherEvent {
  type: 'post-created';
  post: Post & {
    media?: PostMedia[];
    author?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

/**
 * Fired when a reply is added to a thread
 */
export interface ReplyCreatedEvent extends PusherEvent {
  type: 'reply-created';
  reply: Post & {
    media?: PostMedia[];
    author?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  parentPostId: string;
}

/**
 * Fired when a post is deleted
 */
export interface PostDeletedEvent extends PusherEvent {
  type: 'post-deleted';
  postId: string;
}

/**
 * Fired when media is added to a post
 */
export interface MediaAddedEvent extends PusherEvent {
  type: 'media-added';
  postId: string;
  media: PostMedia;
}

/**
 * Union type of all possible Pusher events
 */
export type PusherEventData =
  | PostCreatedEvent
  | ReplyCreatedEvent
  | PostDeletedEvent
  | MediaAddedEvent;

/**
 * Handler type for Pusher event callbacks
 */
export type PusherEventHandler = (eventName: string, data: PusherEventData) => void;
