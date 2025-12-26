import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  connections: number[];
  opacity: number;
  pulse: number;
}

export function BlockDAGBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const nodeCount = Math.floor((window.innerWidth * window.innerHeight) / 25000);
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 3 + 2,
        connections: [],
        opacity: Math.random() * 0.5 + 0.3,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < nodes.length; i++) {
      const connectionCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < connectionCount; j++) {
        const targetIndex = Math.floor(Math.random() * nodes.length);
        if (targetIndex !== i && !nodes[i].connections.includes(targetIndex)) {
          nodes[i].connections.push(targetIndex);
        }
      }
    }

    nodesRef.current = nodes;

    const kaspaColors = {
      primary: { r: 16, g: 185, b: 129 },
      accent: { r: 5, g: 150, b: 105 },
      glow: { r: 52, g: 211, b: 153 },
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3,
        canvas.height * 0.3,
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      );
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.03)");
      gradient.addColorStop(0.5, "rgba(5, 150, 105, 0.01)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() * 0.001;

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));

        node.connections.forEach((targetIndex) => {
          const target = nodes[targetIndex];
          const dx = target.x - node.x;
          const dy = target.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 300) {
            const lineOpacity = (1 - distance / 300) * 0.15;
            const pulseOpacity = Math.sin(time * 2 + node.pulse) * 0.05 + 0.1;

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = `rgba(${kaspaColors.primary.r}, ${kaspaColors.primary.g}, ${kaspaColors.primary.b}, ${lineOpacity + pulseOpacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      nodes.forEach((node, i) => {
        const pulseSize = Math.sin(time * 3 + node.pulse) * 0.5 + 1;
        const currentSize = node.size * pulseSize;

        ctx.beginPath();
        ctx.arc(node.x, node.y, currentSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${kaspaColors.glow.r}, ${kaspaColors.glow.g}, ${kaspaColors.glow.b}, 0.05)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${kaspaColors.primary.r}, ${kaspaColors.primary.g}, ${kaspaColors.primary.b}, ${node.opacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, currentSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${node.opacity * 0.5})`;
        ctx.fill();
      });

      if (Math.random() < 0.02) {
        const sourceIndex = Math.floor(Math.random() * nodes.length);
        const source = nodes[sourceIndex];
        if (source.connections.length > 0) {
          const targetIndex = source.connections[Math.floor(Math.random() * source.connections.length)];
          const target = nodes[targetIndex];

          ctx.beginPath();
          ctx.arc(source.x, source.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${kaspaColors.glow.r}, ${kaspaColors.glow.g}, ${kaspaColors.glow.b}, 0.4)`;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = `rgba(${kaspaColors.glow.r}, ${kaspaColors.glow.g}, ${kaspaColors.glow.b}, 0.5)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
