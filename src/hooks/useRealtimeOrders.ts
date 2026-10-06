import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types/database.types';

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial Fetch
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

    // 2. Realtime Subscription for Live Billing & Kitchen Display
    const channel = supabase
      .channel('realtime_orders_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((ord) => (ord.id === payload.new.id ? { ...ord, ...payload.new } : ord))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((ord) => ord.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, loading, error, setOrders };
}
