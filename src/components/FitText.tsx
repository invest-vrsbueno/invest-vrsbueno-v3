'use client';
import React from 'react';

// Encolhe o font-size (a partir do tamanho computado via CSS/clamp) até o texto caber
// na largura do container, em vez de cortar com "...". Reage a mudanças de texto e de
// largura do container (ex.: resize da janela, mudança de breakpoint).
export function FitText({
  text,
  className,
  style,
  minFontSize = 11,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  minFontSize?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = React.useState<number | undefined>(undefined);

  const customFontSize = style?.fontSize;

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const recompute = () => {
      // Parte do fontSize customizado (ex.: um clamp() menor que o da classe) quando
      // informado — sem isso, limpar o inline style faz a medição cair de volta no
      // tamanho da classe CSS, ignorando o override.
      el.style.fontSize = customFontSize !== undefined ? String(customFontSize) : '';
      const base = parseFloat(window.getComputedStyle(el).fontSize);
      let size = base;
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > el.clientWidth && size > minFontSize) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, minFontSize, customFontSize]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, fontSize, whiteSpace: 'nowrap', overflow: 'hidden' }}
      title={text}
    >
      {text}
    </div>
  );
}
