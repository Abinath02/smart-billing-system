import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types/database.types';

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to hydrate a full order with items and waiter
  const fetchSingleOrder = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          waiter:waiters (*)
        `)
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === orderId);
          if (exists) {
            return prev.map((o) => (o.id === orderId ? (data as Order) : o));
          }
          return [data as Order, ...prev];
        });
      }
    } catch (err) {
      console.warn('Error fetching single order update:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Initial Fetch of all orders with items & waiter relations
    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          waiter:waiters (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setOrders(data as Order[]);
      }
      setLoading(false);
    };

    fetchOrders();

    // 2. Realtime Subscriptions for orders and order_items
    const channel = supabase
      .channel('realtime_orders_hydrated_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const orderId = (payload.new as any)?.id;
            if (orderId) {
              fetchSingleOrder(orderId);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any)?.id;
            setOrders((prev) => prev.filter((ord) => ord.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        (payload) => {
          // When items are added (e.g. Round 2), updated, or deleted, re-fetch that order
          const orderId =
            (payload.new as any)?.order_id || (payload.old as any)?.order_id;
          if (orderId) {
            fetchSingleOrder(orderId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSingleOrder]);

  return { orders, loading, error, setOrders, refreshOrders: fetchSingleOrder };
}
