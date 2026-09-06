'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { fetchColumnOrder, saveColumnOrder, type CardKey } from '../utils/columnPrefs';

export function useColumnOrder(cardKey: CardKey, defaultOrder: string[]) {
  const [order, setOrderState] = useState<string[]>(defaultOrder);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let active = true;
    fetchColumnOrder(supabaseRef.current, cardKey).then((saved) => {
      if (!active || !saved) return;
      // Mantém só chaves ainda válidas e acrescenta no fim as que não existiam quando foi salvo.
      const known = saved.filter((k) => defaultOrder.includes(k));
      const missing = defaultOrder.filter((k) => !known.includes(k));
      setOrderState([...known, ...missing]);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey]);

  function reorder(newOrder: string[]) {
    setOrderState(newOrder);
    saveColumnOrder(supabaseRef.current, cardKey, newOrder);
  }

  return { order, reorder };
}
