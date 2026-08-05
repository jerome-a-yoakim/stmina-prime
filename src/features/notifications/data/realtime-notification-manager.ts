import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";

type NotificationChangeCallback = () => void;

class NotificationRealtimeManager {
  private static instance: NotificationRealtimeManager | null = null;

  private activeUserId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private channelTopic: string | null = null;
  private listeners: Set<NotificationChangeCallback> = new Set();
  private isInitializing = false;
  private cleanupTimeout: NodeJS.Timeout | null = null;

  public static getInstance(): NotificationRealtimeManager {
    if (!NotificationRealtimeManager.instance) {
      NotificationRealtimeManager.instance = new NotificationRealtimeManager();
    }
    return NotificationRealtimeManager.instance;
  }

  /**
   * Subscribe a callback to realtime notification updates for a specific user.
   * Ensures exactly ONE Supabase Realtime channel is created and subscribed per logical topic.
   */
  public subscribe(userId: string, callback: NotificationChangeCallback): () => void {
    if (!userId) return () => {};

    // Cancel any scheduled teardown from a recent unmount (e.g., React StrictMode)
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    this.listeners.add(callback);

    // If user context changed, tear down old channel and spin up new topic
    if (this.activeUserId && this.activeUserId !== userId) {
      this.teardownChannelSync();
      this.activeUserId = userId;
      this.setupChannel(userId);
    } else if (!this.channel && !this.isInitializing) {
      this.activeUserId = userId;
      this.setupChannel(userId);
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        // Debounce channel teardown to handle React StrictMode double-unmount gracefully
        this.cleanupTimeout = setTimeout(() => {
          if (this.listeners.size === 0) {
            void this.teardownChannel();
          }
        }, 3000);
      }
    };
  }

  private setupChannel(userId: string) {
    if (typeof window === "undefined") return;

    this.isInitializing = true;
    const supabase = createBrowserSupabaseClient();
    const topic = `notifications:${userId}`;
    this.channelTopic = topic;

    // Check if channel already exists on the browser client
    const existingChannels = supabase.getChannels();
    const existing = existingChannels.find(
      (c) => c.topic === `realtime:${topic}` || c.topic === topic
    );

    if (existing) {
      // If a channel instance already exists, remove it asynchronously before building a clean instance.
      // NEVER attempt to attach .on() handlers to an existing channel after subscribe() was called.
      void supabase.removeChannel(existing).finally(() => {
        this.createAndSubscribeChannel(supabase, topic, userId);
      });
    } else {
      this.createAndSubscribeChannel(supabase, topic, userId);
    }
  }

  private createAndSubscribeChannel(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any, "public", any>,
    topic: string,
    userId: string
  ) {
    try {
      // 1. Instantiate new channel
      const channel = supabase.channel(topic);

      // 2. Register ALL .on() handlers BEFORE subscribe()
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          // Dispatch update to all registered listeners
          this.listeners.forEach((listener) => {
            try {
              listener();
            } catch (err) {
              console.error("[NotificationRealtimeManager] Error in listener callback:", err);
            }
          });
        }
      );

      // 3. Call subscribe() EXACTLY ONCE
      channel.subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[Supabase Realtime] Channel ${topic} status: ${status}`, err);
        }
      });

      this.channel = channel;
    } catch (err) {
      console.error("[NotificationRealtimeManager] Error creating realtime channel:", err);
    } finally {
      this.isInitializing = false;
    }
  }

  private async teardownChannel() {
    if (this.channel) {
      const channelToClean = this.channel;
      this.channel = null;
      this.activeUserId = null;
      this.channelTopic = null;
      try {
        const supabase = createBrowserSupabaseClient();
        await supabase.removeChannel(channelToClean);
      } catch (err) {
        console.warn("[NotificationRealtimeManager] Error removing channel:", err);
      }
    }
  }

  private teardownChannelSync() {
    if (this.channel) {
      const channelToClean = this.channel;
      this.channel = null;
      this.activeUserId = null;
      this.channelTopic = null;
      try {
        const supabase = createBrowserSupabaseClient();
        void supabase.removeChannel(channelToClean);
      } catch (err) {
        console.warn("[NotificationRealtimeManager] Error removing channel:", err);
      }
    }
  }
}

export const realtimeNotificationManager = NotificationRealtimeManager.getInstance();
