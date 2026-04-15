import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SatsFlowGraphProps {
  communityId: string;
}

interface FlowNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  satsVolume: number;
  txCount: number;
  isExternal?: boolean;
}

interface FlowLink extends d3.SimulationLinkDatum<FlowNode> {
  sats: number;
  txCount: number;
}

const SatsFlowGraph = ({ communityId }: SatsFlowGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const { data: blinkTx } = useQuery({
    queryKey: ['blink-tx-flow', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blink_transactions')
        .select('wallet_id, counterparty_wallet_id, settlement_amount, direction, is_internal')
        .eq('community_id', communityId);
      if (error) throw error;
      return data;
    },
  });

  const { data: wallets } = useQuery({
    queryKey: ['wallets-flow', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, blink_wallet_id, balance_sats')
        .eq('community_id', communityId);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !blinkTx || !wallets) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    // Build nodes and links from transactions
    const nodeMap = new Map<string, FlowNode>();
    const linkMap = new Map<string, FlowLink>();

    // Add wallet nodes
    wallets.forEach(w => {
      nodeMap.set(w.id, {
        id: w.id,
        label: w.blink_wallet_id.slice(0, 6),
        satsVolume: w.balance_sats,
        txCount: 0,
      });
    });

    // Add external node for non-internal flows
    const externalId = '__external__';
    nodeMap.set(externalId, {
      id: externalId,
      label: 'External',
      satsVolume: 0,
      txCount: 0,
      isExternal: true,
    });

    // Build links
    blinkTx.forEach(tx => {
      const sourceNode = nodeMap.get(tx.wallet_id);
      if (sourceNode) sourceNode.txCount++;

      if (tx.is_internal && tx.counterparty_wallet_id) {
        const source = tx.direction === 'SEND' ? tx.wallet_id : tx.counterparty_wallet_id;
        const target = tx.direction === 'SEND' ? tx.counterparty_wallet_id : tx.wallet_id;
        const key = `${source}->${target}`;
        const existing = linkMap.get(key);
        if (existing) {
          existing.sats += Number(tx.settlement_amount);
          existing.txCount++;
        } else {
          linkMap.set(key, { source, target, sats: Number(tx.settlement_amount), txCount: 1 });
        }
      } else {
        // External flow
        const source = tx.direction === 'RECEIVE' ? externalId : tx.wallet_id;
        const target = tx.direction === 'RECEIVE' ? tx.wallet_id : externalId;
        const key = `${source}->${target}`;
        const existing = linkMap.get(key);
        if (existing) {
          existing.sats += Number(tx.settlement_amount);
          existing.txCount++;
        } else {
          linkMap.set(key, { source, target, sats: Number(tx.settlement_amount), txCount: 1 });
        }
        const extNode = nodeMap.get(externalId)!;
        extNode.satsVolume += Number(tx.settlement_amount);
        extNode.txCount++;
      }
    });

    const nodes = Array.from(nodeMap.values());

    // Remove external node if no external flows
    if (nodeMap.get(externalId)!.txCount === 0) {
      const idx = nodes.findIndex(n => n.id === externalId);
      if (idx >= 0) nodes.splice(idx, 1);
    }

    const validNodeIds = new Set(nodes.map(n => n.id));

    // Filter links to only those where both source and target exist in nodes
    const links = Array.from(linkMap.values()).filter(l => {
      const srcId = typeof l.source === 'string' ? l.source : (l.source as FlowNode).id;
      const tgtId = typeof l.target === 'string' ? l.target : (l.target as FlowNode).id;
      return validNodeIds.has(srcId) && validNodeIds.has(tgtId);
    });

    // Remove orphan nodes (no transactions)
    const activeNodeIds = new Set<string>();
    links.forEach(l => {
      activeNodeIds.add(typeof l.source === 'string' ? l.source : (l.source as FlowNode).id);
      activeNodeIds.add(typeof l.target === 'string' ? l.target : (l.target as FlowNode).id);
    });
    const activeNodes = nodes.filter(n => activeNodeIds.has(n.id));

    if (activeNodes.length === 0 || links.length === 0) return;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Add glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'hsl(43, 96%, 56%)');

    const maxSats = Math.max(...links.map(l => l.sats), 1);
    const linkWidthScale = d3.scaleLinear().domain([0, maxSats]).range([1, 6]);
    const nodeRadiusScale = d3.scaleSqrt()
      .domain([0, Math.max(...activeNodes.map(n => n.txCount), 1)])
      .range([8, 24]);

    const simulation = d3.forceSimulation(activeNodes)
      .force('link', d3.forceLink<FlowNode, FlowLink>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<FlowNode>().radius(d => nodeRadiusScale(d.txCount) + 10));

    const g = svg.append('g');

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(43, 96%, 56%)')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', d => linkWidthScale(d.sats))
      .attr('marker-end', 'url(#arrowhead)');

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(activeNodes)
      .join('g')
      .call(d3.drag<SVGGElement, FlowNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    node.append('circle')
      .attr('r', d => nodeRadiusScale(d.txCount))
      .attr('fill', d => d.isExternal ? 'hsl(0, 0%, 30%)' : 'hsl(222, 41%, 16%)')
      .attr('stroke', d => d.isExternal ? 'hsl(0, 0%, 50%)' : 'hsl(43, 96%, 56%)')
      .attr('stroke-width', 2)
      .style('filter', 'url(#glow)')
      .style('cursor', 'pointer');

    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'hsl(210, 40%, 96%)')
      .attr('font-size', '10px')
      .attr('font-family', 'DM Mono, monospace')
      .style('pointer-events', 'none');

    // Tooltip on hover
    node.on('mouseenter', (event, d) => {
      const rect = containerRef.current!.getBoundingClientRect();
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top - 10,
        content: `${d.isExternal ? 'External' : d.label}\n${d.txCount} txns • ${d.satsVolume.toLocaleString()} sats`,
      });
    }).on('mouseleave', () => setTooltip(null));

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as FlowNode).x!)
        .attr('y1', d => (d.source as FlowNode).y!)
        .attr('x2', d => (d.target as FlowNode).x!)
        .attr('y2', d => (d.target as FlowNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    return () => { simulation.stop(); };
  }, [blinkTx, wallets]);

  const hasTx = blinkTx && blinkTx.length > 0;

  return (
    <div ref={containerRef} className="relative rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Sats Flow Network</span>
        {hasTx && (
          <span className="text-xs text-muted-foreground">
            {blinkTx.filter(t => t.is_internal).length} internal flows
          </span>
        )}
      </div>
      {hasTx ? (
        <>
          <svg ref={svgRef} className="w-full" style={{ minHeight: 400 }} />
          {tooltip && (
            <div
              className="absolute pointer-events-none bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground shadow-lg whitespace-pre-line z-10"
              style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
            >
              {tooltip.content}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground text-sm">
          <p>No transaction data yet.</p>
          <p className="text-xs mt-1">Connect wallets and sync to see the flow network.</p>
        </div>
      )}
    </div>
  );
};

export default SatsFlowGraph;